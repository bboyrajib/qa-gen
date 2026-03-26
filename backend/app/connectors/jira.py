import base64
import re
import httpx
from typing import List, Optional
from app.core.config import settings


def _auth_header() -> str:
    raw = f"{settings.jira_email}:{settings.jira_api_token}"
    return "Basic " + base64.b64encode(raw.encode()).decode()


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url=settings.jira_base_url,
        headers={"Authorization": _auth_header(), "Content-Type": "application/json"},
        timeout=30,
    )


async def _request_with_retry(method: str, url: str, **kwargs):
    import asyncio
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


class JiraConnector:
    async def get_story(self, issue_key: str) -> dict:
        return await _request_with_retry("get", f"/rest/api/3/issue/{issue_key}")

    async def get_story_simplified(self, issue_key: str) -> dict:
        raw = await self.get_story(issue_key)
        fields = raw.get("fields", {})
        summary = fields.get("summary", "")
        description = fields.get("description", {})
        ac_lines = _parse_acceptance_criteria(description)
        return {
            "id": raw.get("key", issue_key),
            "title": summary,
            "acceptance_criteria": ac_lines,
        }

    async def create_subtask(self, parent_key: str, summary: str, description: str) -> dict:
        parent_raw = await self.get_story(parent_key)
        project_key = parent_raw["fields"]["project"]["key"]
        payload = {
            "fields": {
                "project": {"key": project_key},
                "parent": {"key": parent_key},
                "summary": summary,
                "description": {"type": "doc", "version": 1, "content": [{"type": "paragraph", "content": [{"type": "text", "text": description}]}]},
                "issuetype": {"name": "Subtask"},
            }
        }
        return await _request_with_retry("post", "/rest/api/3/issue", json=payload)

    async def create_defect(self, project_key: str, summary: str, description: str) -> dict:
        payload = {
            "fields": {
                "project": {"key": project_key},
                "summary": summary,
                "description": {"type": "doc", "version": 1, "content": [{"type": "paragraph", "content": [{"type": "text", "text": description}]}]},
                "issuetype": {"name": "Bug"},
            }
        }
        return await _request_with_retry("post", "/rest/api/3/issue", json=payload)

    async def search_issues(self, jql: str) -> dict:
        return await _request_with_retry("get", "/rest/api/3/search", params={"jql": jql, "maxResults": 50})


def _parse_acceptance_criteria(description) -> List[str]:
    if not description:
        return []
    # Jira Atlassian Document Format
    if isinstance(description, dict):
        text = _extract_adf_text(description)
    else:
        text = str(description)

    lines = text.splitlines()
    ac_lines = []
    capturing = False
    for line in lines:
        stripped = line.strip()
        if re.match(r"acceptance criteria[:\s]?", stripped, re.IGNORECASE):
            capturing = True
            continue
        if capturing:
            if stripped == "" or re.match(r"^(description|summary|notes|steps)[:\s]", stripped, re.IGNORECASE):
                break
            if stripped:
                ac_lines.append(stripped)
        elif re.match(r"^AC\d*[:\.]", stripped, re.IGNORECASE):
            ac_lines.append(stripped)

    if not ac_lines:
        for line in lines:
            stripped = line.strip()
            if re.match(r"^AC\d*[:\.]", stripped, re.IGNORECASE):
                ac_lines.append(stripped)
    return ac_lines


def _extract_adf_text(node: dict) -> str:
    if not isinstance(node, dict):
        return ""
    if node.get("type") == "text":
        return node.get("text", "")
    parts = []
    for child in node.get("content", []):
        parts.append(_extract_adf_text(child))
    sep = "\n" if node.get("type") in ("paragraph", "heading", "listItem", "bulletList", "orderedList") else ""
    return sep.join(parts)
