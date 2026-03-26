import json
from typing import AsyncGenerator
from openai import AsyncAzureOpenAI
from azure.identity import ClientSecretCredential
from app.core.config import settings
from app.rag.pipeline import search

SYSTEM_PROMPT = (
    "You are a QA domain expert assistant for TD Bank. You have access to the TD knowledge base "
    "including Confluence documentation, Jira issues, and test management data. "
    "Always cite your sources. Only answer questions about QA, testing, code, and related technical topics."
)


def _get_token():
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


async def stream_chat(user_message: str, history: list) -> AsyncGenerator[dict, None]:
    rag_chunks = await search(user_message, top=3)
    citations = [{"title": c["title"], "url": c["url"]} for c in rag_chunks]
    rag_text = "\n\n".join(f"[{c['title']}]: {c['content']}" for c in rag_chunks)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if rag_text:
        messages.append({"role": "system", "content": f"Relevant knowledge base excerpts:\n{rag_text}"})
    messages.extend(history[-18:])
    messages.append({"role": "user", "content": user_message})

    client = _client()
    full_response = ""
    async with await client.chat.completions.create(
        model=settings.azure_openai_deployment,
        messages=messages,
        stream=True,
        temperature=0.3,
    ) as stream:
        async for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                full_response += delta
                yield {"type": "token", "token": delta}

    yield {"type": "done", "citations": citations}
    return full_response, citations
