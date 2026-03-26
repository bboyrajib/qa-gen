import json
from typing import List
from openai import AsyncAzureOpenAI
from azure.identity import ClientSecretCredential
from app.core.config import settings


def _get_token() -> str:
    cred = ClientSecretCredential(
        tenant_id=settings.azure_tenant_id,
        client_id=settings.azure_client_id,
        client_secret=settings.azure_client_secret,
    )
    token = cred.get_token(settings.azure_cognitive_scope)
    return token.token


def _client() -> AsyncAzureOpenAI:
    return AsyncAzureOpenAI(
        azure_endpoint=settings.azure_openai_endpoint,
        azure_ad_token_provider=_get_token,
        api_version=settings.azure_openai_api_version,
    )


async def generate_playwright_code(ir_steps: List[dict], rag_context: str, framework: str, browser: str, base_url: str) -> dict:
    prompt = f"""You are a Playwright {framework} expert. Convert the following Tosca IR steps to idiomatic Playwright code.

Framework: {framework}
Browser: {browser}
Base URL: {base_url}

RAG Context (use for unmapped actions):
{rag_context}

IR Steps (JSON):
{json.dumps(ir_steps, indent=2)}

Return ONLY valid JSON in this exact format:
{{
  "steps": [
    {{"step_id": "...", "playwright_code": "...", "confidence": 0.95}}
  ]
}}

Rules:
- Use async/await on all interactions
- Use expect() for assertions
- Add inline comments per step
- For unmapped actions, use best-guess Playwright equivalent and set confidence < 0.7
"""
    client = _client()
    response = await client.chat.completions.create(
        model=settings.azure_openai_deployment,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)


async def fix_compilation_errors(spec_content: str, error_text: str) -> str:
    prompt = f"""Fix the TypeScript compilation errors in this Playwright spec file.

ERRORS:
{error_text}

SPEC FILE:
{spec_content}

Return ONLY the corrected spec file content, no markdown fences.
"""
    client = _client()
    response = await client.chat.completions.create(
        model=settings.azure_openai_deployment,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
    )
    return response.choices[0].message.content
