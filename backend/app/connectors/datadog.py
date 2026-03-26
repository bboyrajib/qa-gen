import httpx
import asyncio
from app.core.config import settings

DD_BASE = "https://api.datadoghq.com"


def _headers() -> dict:
    return {
        "DD-API-KEY": settings.datadog_api_key,
        "DD-APPLICATION-KEY": settings.datadog_app_key,
        "Content-Type": "application/json",
    }


async def _request_with_retry(method: str, url: str, **kwargs):
    last_exc = None
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(base_url=DD_BASE, headers=_headers(), timeout=30) as c:
                resp = await getattr(c, method)(url, **kwargs)
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            last_exc = e
            if attempt < 2:
                await asyncio.sleep(2 ** attempt)
    raise last_exc


class DatadogConnector:
    async def get_logs(self, service_tag: str, start_ts: str, end_ts: str) -> dict:
        payload = {
            "filter": {
                "query": f"service:{service_tag}",
                "from": start_ts,
                "to": end_ts,
            },
            "page": {"limit": 500},
        }
        return await _request_with_retry("post", "/api/v2/logs/events/search", json=payload)

    async def get_metrics(self, metric_name: str, service_tag: str, start_ts: str, end_ts: str) -> dict:
        import time
        params = {
            "query": f"{metric_name}{{service:{service_tag}}}",
            "from": start_ts,
            "to": end_ts,
        }
        return await _request_with_retry("get", "/api/v1/query", params=params)
