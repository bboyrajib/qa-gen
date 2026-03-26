import httpx
import asyncio
from app.core.config import settings


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url=settings.splunk_base_url,
        headers={"Authorization": f"Bearer {settings.splunk_token}"},
        timeout=60,
        verify=False,
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


class SplunkConnector:
    async def search_events(self, service_tag: str, start_ts: str, end_ts: str) -> dict:
        search_query = f"search index=* {service_tag} error OR exception earliest={start_ts} latest={end_ts}"
        return await _request_with_retry(
            "post",
            "/services/search/jobs/oneshot",
            data={"search": search_query, "output_mode": "json"},
        )
