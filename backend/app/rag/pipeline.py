from typing import List, Optional
from azure.identity import ClientSecretCredential
from azure.search.documents.aio import SearchClient
from azure.search.documents.models import VectorizedQuery
from openai import AsyncAzureOpenAI
from app.core.config import settings


def _credential() -> ClientSecretCredential:
    return ClientSecretCredential(
        tenant_id=settings.azure_tenant_id,
        client_id=settings.azure_client_id,
        client_secret=settings.azure_client_secret,
    )


def _openai_client() -> AsyncAzureOpenAI:
    return AsyncAzureOpenAI(
        azure_endpoint=settings.azure_openai_endpoint,
        azure_ad_token_provider=lambda: _get_token(),
        api_version=settings.azure_openai_api_version,
    )


def _get_token() -> str:
    cred = _credential()
    token = cred.get_token(settings.azure_cognitive_scope)
    return token.token


async def search(query: str, top: int = 3, index_name: Optional[str] = None) -> List[dict]:
    idx = index_name or settings.azure_search_index_name
    cred = _credential()
    async with SearchClient(
        endpoint=settings.azure_search_endpoint,
        index_name=idx,
        credential=cred,
    ) as client:
        results = await client.search(search_text=query, top=top)
        chunks = []
        async for r in results:
            chunks.append({
                "title": r.get("title", ""),
                "content": r.get("content", r.get("chunk", "")),
                "url": r.get("url", "#"),
                "score": r.get("@search.score", 0),
            })
        return chunks


async def embed_and_search(query: str, top: int = 3) -> List[dict]:
    """Use vector search via embeddings when available, fall back to keyword search."""
    try:
        oai = _openai_client()
        embedding_resp = await oai.embeddings.create(
            model="text-embedding-ada-002",
            input=query,
        )
        vector = embedding_resp.data[0].embedding
        cred = _credential()
        async with SearchClient(
            endpoint=settings.azure_search_endpoint,
            index_name=settings.azure_search_index_name,
            credential=cred,
        ) as client:
            vector_query = VectorizedQuery(vector=vector, k_nearest_neighbors=top, fields="content_vector")
            results = await client.search(search_text=query, vector_queries=[vector_query], top=top)
            chunks = []
            async for r in results:
                chunks.append({
                    "title": r.get("title", ""),
                    "content": r.get("content", r.get("chunk", "")),
                    "url": r.get("url", "#"),
                    "score": r.get("@search.score", 0),
                })
            return chunks
    except Exception:
        return await search(query, top=top)
