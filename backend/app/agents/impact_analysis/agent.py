import json
from typing import AsyncGenerator
from openai import AsyncAzureOpenAI
from azure.identity import ClientSecretCredential
from app.agents.base import BaseAgent
from app.agents.impact_analysis.scorer import score_tests
from app.connectors.jtmf import JTMFConnector
from app.services.job_runner import save_job_result, update_job_status
from app.core.config import settings


def _get_token():
    cred = ClientSecretCredential(
        tenant_id=settings.azure_tenant_id,
        client_id=settings.azure_client_id,
        client_secret=settings.azure_client_secret,
    )
    return cred.get_token(settings.azure_cognitive_scope).token


class TestImpactAgent(BaseAgent):
    async def run(self, input_data: dict) -> AsyncGenerator[dict, None]:
        job_id = self.job_id
        try:
            changed_files = input_data.get("changed_file_paths", [])
            commit_sha = input_data.get("commit_sha", "")
            repository = input_data.get("repository", "")

            await self.emit("FETCHING_DIFF", "running", "Fetching coverage map from JTMF...")
            jtmf = JTMFConnector()
            coverage_data = await jtmf.get_coverage_map(changed_files)
            coverage_map = coverage_data.get("coverage_map", {})
            await self.emit("FETCHING_DIFF", "complete", f"Coverage map for {len(coverage_map)} files")

            await self.emit("AST_ANALYSIS", "running", "Extracting changed functions via AST...")
            changed_functions = []
            for fp in changed_files:
                changed_functions.append(fp.split("/")[-1])
            await self.emit("AST_ANALYSIS", "complete", f"Identified {len(changed_functions)} changed functions")

            await self.emit("SCORING", "running", "Scoring tests by coverage...")
            scored = score_tests(coverage_map, changed_files)
            full_suite_count = sum(len(v) for v in coverage_map.values())
            await self.emit("SCORING", "complete", f"Recommended {len(scored)} tests from {full_suite_count} total")

            await self.emit("RISK_ASSESSMENT", "running", "Assessing risk with GPT-4o...")
            risk = await _assess_risk(changed_functions, scored, commit_sha)
            await self.emit("RISK_ASSESSMENT", "complete", f"Risk level: {risk.get('risk_level')}")

            result = {
                "recommended_tests": scored[:100],
                "risk_level": risk.get("risk_level", "Medium"),
                "coverage_gaps": risk.get("coverage_gap_files", []),
                "narrative": risk.get("narrative", ""),
                "total_recommended": len(scored),
                "total_full_suite": full_suite_count,
            }
            save_job_result(job_id, result)
            await self.emit_done()

        except Exception as e:
            update_job_status(job_id, "FAILED", error=str(e))
            await self.emit("ERROR", "error", str(e))
            await self.emit_done()


async def _assess_risk(changed_functions: list, scored_tests: list, commit_sha: str) -> dict:
    prompt = f"""Assess the risk of this code change for a banking application.

Changed functions/files: {json.dumps(changed_functions)}
Direct test coverage count: {sum(1 for t in scored_tests if t['reason'] == 'direct')}
Commit: {commit_sha}

Return ONLY valid JSON:
{{
  "risk_level": "High",
  "narrative": "...",
  "coverage_gap_files": []
}}
"""
    client = AsyncAzureOpenAI(
        azure_endpoint=settings.azure_openai_endpoint,
        azure_ad_token_provider=_get_token,
        api_version=settings.azure_openai_api_version,
    )
    resp = await client.chat.completions.create(
        model=settings.azure_openai_deployment,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        response_format={"type": "json_object"},
    )
    return json.loads(resp.choices[0].message.content)
