import base64
import httpx
import asyncio
from app.core.config import settings


def _auth_header() -> str:
    raw = f"{settings.confluence_email}:{settings.confluence_api_token}"
    return "Basic " + base64.b64encode(raw.encode()).decode()


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url=settings.confluence_base_url,
        headers={"Authorization": _auth_header(), "Content-Type": "application/json"},
        timeout=30,
    )


async def _request_with_retry(method: str, url: str, **kwargs):
    last_exc = None
    for attempt in range(3):
        try:
            async with _client() as c:
                resp = await getattr(c, method)(url, **kwargs)
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            last_exc = e
            if attempt < 2:
                await asyncio.sleep(2 ** attempt)
    raise last_exc


class ConfluenceConnector:
    async def search_content(self, query: str) -> dict:
        return await _request_with_retry(
            "get", "/rest/api/content/search", params={"cql": f'text~"{query}"', "limit": 10}
        )

    async def get_page(self, page_id: str) -> dict:
        return await _request_with_retry(
            "get", f"/rest/api/content/{page_id}", params={"expand": "body.storage"}
        )
