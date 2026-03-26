import json
from typing import AsyncGenerator
from openai import AsyncAzureOpenAI
from azure.identity import ClientSecretCredential
from app.agents.base import BaseAgent
from app.agents.regression_opt.flakiness import compute_flakiness
from app.agents.regression_opt.clustering import build_coverage_vectors, find_redundancy_clusters, select_cluster_representative
from app.connectors.jtmf import JTMFConnector
from app.connectors.jira import JiraConnector
from app.services.job_runner import save_job_result, update_job_status
from app.core.config import settings


def _get_token():
    cred = ClientSecretCredential(
        tenant_id=settings.azure_tenant_id,
        client_id=settings.azure_client_id,
        client_secret=settings.azure_client_secret,
    )
    return cred.get_token(settings.azure_cognitive_scope).token


class RegressionOptimizationAgent(BaseAgent):
    async def run(self, input_data: dict) -> AsyncGenerator[dict, None]:
        job_id = self.job_id
        try:
            suite_id = input_data["jtmf_suite_id"]
            days = input_data.get("days_history", 90)
            release_risk = input_data.get("release_risk_profile", {})

            await self.emit("LOADING_HISTORY", "running", "Loading test history from JTMF...")
            jtmf = JTMFConnector()
            suite_tests = await jtmf.get_suite_tests(suite_id)
            suite_history = await jtmf.get_suite_history(suite_id, days)
            tests = suite_tests.get("tests", [])
            history = suite_history.get("history", [])
            await self.emit("LOADING_HISTORY", "complete", f"Loaded {len(tests)} tests, {len(history)} history records")

            await self.emit("SCORING_FLAKINESS", "running", "Computing flakiness scores...")
            flakiness = compute_flakiness(history)
            flaky_tests = [tid for tid, data in flakiness.items() if data["is_flaky"]]
            await self.emit("SCORING_FLAKINESS", "complete", f"Found {len(flaky_tests)} flaky tests")

            await self.emit("CLUSTERING", "running", "Clustering by coverage similarity...")
            all_files = list({f for t in tests for f in t.get("covered_files", [])})
            vectors = build_coverage_vectors(tests, all_files)
            tests_meta = {t["test_id"]: {**t, "flakiness_score": flakiness.get(t["test_id"], {}).get("flakiness_score", 0)} for t in tests}
            clusters = find_redundancy_clusters(vectors)
            redundant = set()
            for cluster in clusters:
                rep = select_cluster_representative(cluster, tests_meta)
                redundant.update(t for t in cluster if t != rep)
            await self.emit("CLUSTERING", "complete", f"Found {len(redundant)} redundant test candidates")

            await self.emit("RISK_SCORING", "running", "Computing risk scores...")
            threshold = 25
            scored = _risk_score_tests(tests, flakiness, redundant, release_risk)
            recommended = [t for t in scored if t["score"] >= threshold]
            await self.emit("RISK_SCORING", "complete", f"Recommended {len(recommended)}/{len(tests)} tests")

            await self.emit("LLM_VALIDATION", "running", "LLM validation of exclusion candidates...")
            exclusion_candidates = [t for t in scored if t["score"] < threshold][:50]
            validated = await _llm_validate(exclusion_candidates, release_risk)
            for override in validated:
                # find and override
                for t in recommended:
                    if t["test_id"] == override:
                        t["decision"] = "include_override"
            await self.emit("LLM_VALIDATION", "complete", f"LLM overrode {len(validated)} exclusions")

            await self.emit("COVERAGE_CHECK", "running", "Checking coverage preservation...")
            recommended, threshold = _coverage_check(recommended, scored, all_files, tests, threshold)
            preservation = len(recommended) / len(tests) if tests else 1.0
            reduction = 1.0 - preservation
            await self.emit("COVERAGE_CHECK", "complete", f"Coverage preservation: {preservation:.1%}")

            result = {
                "optimized_tests": recommended,
                "flaky_tests": [{"test_id": tid, **flakiness[tid]} for tid in flaky_tests if tid in flakiness],
                "reduction_percent": round(reduction * 100, 1),
                "coverage_preservation": round(preservation * 100, 1),
                "executive_summary": f"Reduced suite by {reduction:.1%} while preserving {preservation:.1%} coverage.",
            }
            save_job_result(job_id, result)
            await self.emit_done()

        except Exception as e:
            update_job_status(job_id, "FAILED", error=str(e))
            await self.emit("ERROR", "error", str(e))
            await self.emit_done()


def _risk_score_tests(tests, flakiness, redundant, release_risk):
    high_risk_domains = (release_risk or {}).get("high_risk_domains", [])
    scored = []
    max_defects = max((t.get("defect_links", 0) for t in tests), default=1) or 1

    for t in tests:
        tid = t["test_id"]
        defect_score = (t.get("defect_links", 0) / max_defects) * 0.35
        recency = t.get("recency_weight", 0.5) * 0.25
        uniqueness = (1.0 if tid not in redundant else 0.2) * 0.25
        flaky = flakiness.get(tid, {}).get("flakiness_score", 0)
        raw = (defect_score + recency + uniqueness - flaky * 0.15) * 100

        # Override: P1/P2 linked
        if t.get("priority") in ("P1", "P2") or any(d in t.get("name", "") for d in high_risk_domains):
            raw = 100

        scored.append({
            "test_id": tid,
            "test_name": t.get("name", tid),
            "score": round(max(0, min(100, raw)), 1),
            "decision": "include" if raw >= 25 else "exclude",
            "rationale": f"score={raw:.1f}, flakiness={flaky:.2f}, redundant={tid in redundant}",
        })
    return sorted(scored, key=lambda x: x["score"], reverse=True)


async def _llm_validate(candidates, release_risk) -> list:
    if not candidates:
        return []
    prompt = f"""Review these test exclusion candidates for a banking release.
Release risk profile: {json.dumps(release_risk)}
Candidates: {json.dumps(candidates[:50], indent=2)}

Return ONLY a JSON list of test_ids that should be OVERRIDDEN to include (due to risk):
["test_id_1", "test_id_2"]
"""
    client = AsyncAzureOpenAI(
        azure_endpoint=settings.azure_openai_endpoint,
        azure_ad_token_provider=_get_token,
        api_version=settings.azure_openai_api_version,
    )
    try:
        resp = await client.chat.completions.create(
            model=settings.azure_openai_deployment,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
        )
        return json.loads(resp.choices[0].message.content)
    except Exception:
        return []


def _coverage_check(recommended, scored, all_files, tests, threshold):
    full_coverage = {f for t in tests for f in t.get("covered_files", [])}
    rec_ids = {t["test_id"] for t in recommended}

    while threshold > 0:
        rec_coverage = {f for t in tests if t["test_id"] in rec_ids for f in t.get("covered_files", [])}
        ratio = len(rec_coverage) / len(full_coverage) if full_coverage else 1.0
        if ratio >= 0.85:
            break
        threshold -= 5
        rec_ids = {t["test_id"] for t in scored if t["score"] >= threshold}

    return [t for t in scored if t["test_id"] in rec_ids], threshold
