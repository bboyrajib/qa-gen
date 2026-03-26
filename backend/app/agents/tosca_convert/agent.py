import json
import uuid
from typing import AsyncGenerator
from app.agents.base import BaseAgent
from app.agents.tosca_convert.parser import parse_tosca_xml
from app.agents.tosca_convert.mapper import map_action
from app.agents.tosca_convert.llm import generate_playwright_code, fix_compilation_errors
from app.agents.tosca_convert.compiler import compile_typescript
from app.rag.pipeline import search
from app.services.blob_storage import upload_text
from app.services.job_runner import save_job_result, update_job_status


class ToscaConvertAgent(BaseAgent):
    async def run(self, input_data: dict) -> AsyncGenerator[dict, None]:
        job_id = self.job_id
        try:
            await self.emit("VALIDATING", "running", "Parsing and validating Tosca XML...")
            root_tag, ir_steps = parse_tosca_xml(input_data["file_content"])
            await self.emit("VALIDATING", "complete", f"Valid {root_tag} with {len(ir_steps)} steps")

            await self.emit("PARSING", "running", "Extracting test steps into IR...")
            await self.emit("PARSING", "complete", f"Extracted {len(ir_steps)} IR steps")

            await self.emit("MAPPING", "running", "Applying keyword lookup table...")
            mapped = []
            unmapped_actions = []
            for step in ir_steps:
                template = map_action(step["action_mode"])
                if template:
                    code = template.format(
                        locator=step["element_path"],
                        value=step["input_value"] or step["expected_value"],
                        step_id=step["step_id"],
                    )
                    mapped.append({**step, "mapped_code": code, "is_mapped": True})
                else:
                    mapped.append({**step, "mapped_code": None, "is_mapped": False})
                    if step["action_mode"] not in unmapped_actions:
                        unmapped_actions.append(step["action_mode"])
            await self.emit("MAPPING", "complete", f"Mapped {sum(1 for s in mapped if s['is_mapped'])}/{len(ir_steps)} steps. Unmapped: {unmapped_actions}")

            await self.emit("RAG_ENRICHMENT", "running", "Querying knowledge base for unmapped actions...")
            rag_chunks = []
            for action in unmapped_actions[:5]:
                chunks = await search(f"Playwright equivalent for Tosca action: {action}", top=3)
                rag_chunks.extend(chunks)
            rag_context = "\n\n".join(c["content"] for c in rag_chunks) if rag_chunks else "No additional context available."
            await self.emit("RAG_ENRICHMENT", "complete", f"Retrieved {len(rag_chunks)} knowledge base chunks")

            await self.emit("GENERATING", "running", "Generating Playwright code with GPT-4o...")
            framework = input_data.get("framework", "typescript")
            browser = input_data.get("browser", "chromium")
            base_url = input_data.get("base_url", "")
            llm_result = await generate_playwright_code(mapped, rag_context, framework, browser, base_url)
            steps_out = llm_result.get("steps", [])
            await self.emit("GENERATING", "complete", f"Generated code for {len(steps_out)} steps")

            await self.emit("COMPILING", "running", "Assembling and compiling spec file...")
            file_name = input_data.get("file_name", "test.spec.ts").replace(".xml", ".spec.ts")
            if not file_name.endswith(".spec.ts"):
                file_name += ".spec.ts"

            spec_content = _assemble_spec(steps_out, base_url, framework)
            success, error_output = await compile_typescript(spec_content, file_name)

            if not success and error_output and "not available" not in error_output:
                await self.emit("COMPILING", "running", "Fixing compilation errors...")
                spec_content = await fix_compilation_errors(spec_content, error_output)
                success, _ = await compile_typescript(spec_content, file_name)

            compilation_status = "success" if success else "warnings"
            await self.emit("COMPILING", "complete", f"Compilation: {compilation_status}")

            await self.emit("OUTPUT", "running", "Uploading output to Azure Blob...")
            blob_name = f"tosca-convert/{job_id}/{file_name}"
            await upload_text(blob_name, spec_content, "text/plain")

            low_confidence = [s for s in steps_out if s.get("confidence", 1.0) < 0.7]
            result = {
                "total_steps": len(ir_steps),
                "converted_steps": len(steps_out),
                "low_confidence_steps": len(low_confidence),
                "compilation_status": compilation_status,
                "output_blob_path": blob_name,
            }
            save_job_result(job_id, result)
            await self.emit("OUTPUT", "complete", "Output stored in Azure Blob")
            await self.emit_done()

        except Exception as e:
            update_job_status(job_id, "FAILED", error=str(e))
            await self.emit("ERROR", "error", str(e))
            await self.emit_done()


def _assemble_spec(steps: list, base_url: str, framework: str) -> str:
    lines = [
        "import { test, expect, Page } from '@playwright/test';",
        "",
        "test.describe('Converted from Tosca', () => {",
        f"  test.beforeEach(async ({{ page }}) => {{",
        f"    await page.goto('{base_url}');",
        "  });",
        "",
        "  test('generated test', async ({ page }) => {",
    ]
    for step in steps:
        code = step.get("playwright_code", "")
        for line in code.splitlines():
            lines.append(f"    {line}")
    lines += ["  });", "});", ""]
    return "\n".join(lines)
