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


async def analyse_failure(log_events: list, anomaly_summary: str, jtmf_record: dict,
                           rag_context: str, prior_fingerprints: list) -> dict:
    prompt = f"""You are a senior SRE analysing a test pipeline failure.

Top 20 log events:
{json.dumps(log_events[:20], indent=2)}

Datadog anomaly summary:
{anomaly_summary}

JTMF failure record:
{json.dumps(jtmf_record, indent=2)}

Relevant runbooks from knowledge base:
{rag_context}

Prior classification history:
{json.dumps(prior_fingerprints, indent=2)}

Classify the root cause into one of:
code_defect | infra_failure | data_issue | env_misconfiguration | flaky_test

Return ONLY valid JSON:
{{
  "classification": "code_defect",
  "confidence": 85,
  "narrative": "...",
  "fix_actions": ["action1", "action2", "action3"],
  "jira_description": "..."
}}
"""
    client = _client()
    resp = await client.chat.completions.create(
        model=settings.azure_openai_deployment,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        response_format={"type": "json_object"},
    )
    return json.loads(resp.choices[0].message.content)
