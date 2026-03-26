import httpx
import asyncio
from typing import List
from app.core.config import settings


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url=settings.jtmf_base_url,
        headers={"Authorization": f"Bearer {settings.jtmf_api_token}", "Content-Type": "application/json"},
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


class JTMFConnector:
    async def get_suite_tests(self, suite_id: str) -> dict:
        return await _request_with_retry("get", f"/suites/{suite_id}/tests")

    async def get_suite_history(self, suite_id: str, days: int = 90) -> dict:
        return await _request_with_retry("get", f"/suites/{suite_id}/history", params={"days": days})

    async def get_coverage_map(self, file_paths: List[str]) -> dict:
        return await _request_with_retry("post", "/coverage/map", json={"file_paths": file_paths})

    async def get_test_run_results(self, run_id: str) -> dict:
        return await _request_with_retry("get", f"/test-runs/{run_id}/results")
