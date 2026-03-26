import json
from openai import AsyncAzureOpenAI
from azure.identity import ClientSecretCredential
from app.core.config import settings


def _get_token() -> str:
    cred = ClientSecretCredential(
        tenant_id=settings.azure_tenant_id,
        client_id=settings.azure_client_id,
        client_secret=settings.azure_client_secret,
    )
    return cred.get_token(settings.azure_cognitive_scope).token


def _client():
    return AsyncAzureOpenAI(
        azure_endpoint=settings.azure_openai_endpoint,
        azure_ad_token_provider=_get_token,
        api_version=settings.azure_openai_api_version,
    )


async def generate_scenarios(ac_lines: list, dedup_context: str, rag_context: str, domain_tag: str) -> dict:
    prompt = f"""You are a QA expert generating BDD Gherkin test scenarios for a {domain_tag} banking feature.

Acceptance Criteria:
{chr(10).join(f'- {line}' for line in ac_lines)}

Existing tests to avoid duplicating:
{dedup_context or 'None'}

Domain rules from knowledge base:
{rag_context or 'None'}

Generate 5-10 BDD Gherkin scenarios with these requirements:
- Minimum 2 negative scenarios (invalid input, business rule violation)
- Minimum 2 boundary scenarios (at-limit, one-beyond-limit)
- Use Scenario Outline + Examples for data-driven cases
- Avoid duplicating existing tests

Return ONLY valid JSON:
{{
  "scenarios": [
    {{
      "name": "scenario name",
      "gherkin": "Feature: ...\\n\\nScenario: ...\\n  Given ...\\n  When ...\\n  Then ...",
      "examples_table": [{{"column1": "value1", "column2": "value2"}}]
    }}
  ]
}}
"""
    client = _client()
    resp = await client.chat.completions.create(
        model=settings.azure_openai_deployment,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        response_format={"type": "json_object"},
    )
    return json.loads(resp.choices[0].message.content)
