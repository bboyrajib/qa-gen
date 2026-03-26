import re
import json
from typing import AsyncGenerator
from app.agents.base import BaseAgent
from app.agents.test_generation.llm import generate_scenarios
from app.agents.test_generation.constraint_engine import DataConstraintEngine
from app.connectors.jira import JiraConnector
from app.connectors.jtmf import JTMFConnector
from app.rag.pipeline import search
from app.services.blob_storage import upload_text
from app.services.job_runner import save_job_result, update_job_status


class TestGenerationAgent(BaseAgent):
    async def run(self, input_data: dict) -> AsyncGenerator[dict, None]:
        job_id = self.job_id
        try:
            jira_story_id = input_data["jira_story_id"]
            domain_tag = input_data.get("domain_tag", "other")
            jtmf_suite_id = input_data.get("jtmf_suite_id")
            project_id = input_data.get("project_id")

            await self.emit("FETCHING_STORY", "running", f"Fetching Jira story {jira_story_id}...")
            jira = JiraConnector()
            story = await jira.get_story_simplified(jira_story_id)
            ac_lines = story.get("acceptance_criteria", [])
            await self.emit("FETCHING_STORY", "complete", f"Found {len(ac_lines)} acceptance criteria")

            dedup_context = ""
            if jtmf_suite_id:
                await self.emit("CHECKING_COVERAGE", "running", "Checking existing test coverage...")
                try:
                    jtmf = JTMFConnector()
                    suite_tests = await jtmf.get_suite_tests(jtmf_suite_id)
                    existing = [t.get("name", "") for t in suite_tests.get("tests", [])]
                    dedup_context = "\n".join(existing[:50])
                except Exception:
                    dedup_context = ""
                await self.emit("CHECKING_COVERAGE", "complete", "Coverage check complete")

            await self.emit("RAG_ENRICHMENT", "running", "Querying domain knowledge base...")
            rag_query = f"{domain_tag} domain constraints field validation " + " ".join(ac_lines[:3])
            rag_chunks = await search(rag_query, top=5)
            rag_context = "\n\n".join(c["content"] for c in rag_chunks)
            await self.emit("RAG_ENRICHMENT", "complete", f"Retrieved {len(rag_chunks)} domain rule chunks")

            await self.emit("GENERATING_SCENARIOS", "running", "Generating BDD Gherkin scenarios with GPT-4o...")
            result = await generate_scenarios(ac_lines, dedup_context, rag_context, domain_tag)
            scenarios = result.get("scenarios", [])

            # Re-prompt if fewer than 3 scenarios
            if len(scenarios) < 3:
                result = await generate_scenarios(ac_lines, dedup_context, rag_context, domain_tag)
                scenarios = result.get("scenarios", [])

            await self.emit("GENERATING_SCENARIOS", "complete", f"Generated {len(scenarios)} scenarios")

            await self.emit("SYNTHESIZING_DATA", "running", "Synthesizing test data with constraint engine...")
            engine = DataConstraintEngine()
            for scenario in scenarios:
                if scenario.get("examples_table"):
                    enriched_rows = []
                    for row in scenario["examples_table"]:
                        for col, val in row.items():
                            generated = engine.synthesize_column(col)
                            # replace with generated values as additional rows
                            enriched_rows.extend([{col: v} for v in generated[:3]])
                    scenario["synthesized_data"] = enriched_rows
            await self.emit("SYNTHESIZING_DATA", "complete", "Data synthesis complete")

            await self.emit("VALIDATING", "running", "Validating Gherkin structure...")
            valid_scenarios = [s for s in scenarios if _validate_gherkin(s.get("gherkin", ""))]
            coverage_gaps = [ac for ac in ac_lines if not _ac_covered(ac, valid_scenarios)]
            await self.emit("VALIDATING", "complete", f"{len(valid_scenarios)} valid scenarios, {len(coverage_gaps)} coverage gaps")

            await self.emit("OUTPUT", "running", "Writing output files to Azure Blob...")
            feature_content = _build_feature_file(jira_story_id, valid_scenarios)
            feature_blob = f"test-gen/{job_id}/{jira_story_id}.feature"
            data_blob = f"test-gen/{job_id}/{jira_story_id}_data.json"
            await upload_text(feature_blob, feature_content, "text/plain")
            await upload_text(data_blob, json.dumps({"scenarios": valid_scenarios}, indent=2), "application/json")

            output = {
                "feature_file_path": feature_blob,
                "data_file_path": data_blob,
                "scenario_count": len(valid_scenarios),
                "coverage_gap_lines": coverage_gaps,
            }
            save_job_result(job_id, output)
            await self.emit("OUTPUT", "complete", "Files uploaded")
            await self.emit_done()

        except Exception as e:
            update_job_status(job_id, "FAILED", error=str(e))
            await self.emit("ERROR", "error", str(e))
            await self.emit_done()


def _validate_gherkin(text: str) -> bool:
    return bool(re.search(r"\bGiven\b", text) and re.search(r"\bWhen\b", text) and re.search(r"\bThen\b", text))


def _ac_covered(ac: str, scenarios: list) -> bool:
    keywords = [w.lower() for w in ac.split() if len(w) > 4]
    for s in scenarios:
        gherkin = s.get("gherkin", "").lower()
        if any(kw in gherkin for kw in keywords):
            return True
    return False


def _build_feature_file(story_id: str, scenarios: list) -> str:
    lines = [f"Feature: Tests generated from {story_id}", ""]
    for s in scenarios:
        lines.append(s.get("gherkin", ""))
        lines.append("")
    return "\n".join(lines)
