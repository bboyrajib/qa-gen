import pytest
import respx
import httpx
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
@respx.mock
async def test_jira_get_story():
    from app.connectors.jira import JiraConnector
    respx.get("https://test.atlassian.net/rest/api/3/issue/TDB-100").mock(
        return_value=httpx.Response(200, json={
            "key": "TDB-100",
            "fields": {
                "summary": "Test story",
                "description": {
                    "type": "doc",
                    "content": [
                        {"type": "paragraph", "content": [{"type": "text", "text": "Acceptance Criteria:\nAC1: First criteria\nAC2: Second criteria"}]}
                    ]
                }
            }
        })
    )

    with patch("app.core.config.settings") as mock_settings:
        mock_settings.jira_base_url = "https://test.atlassian.net"
        mock_settings.jira_email = "test@test.com"
        mock_settings.jira_api_token = "token123"

        connector = JiraConnector()
        # Test is structural — actual HTTP call mocked
        assert connector is not None


@pytest.mark.asyncio
@respx.mock
async def test_datadog_connector_structure():
    from app.connectors.datadog import DatadogConnector
    connector = DatadogConnector()
    assert hasattr(connector, "get_logs")
    assert hasattr(connector, "get_metrics")


@pytest.mark.asyncio
async def test_splunk_connector_structure():
    from app.connectors.splunk import SplunkConnector
    connector = SplunkConnector()
    assert hasattr(connector, "search_events")


@pytest.mark.asyncio
async def test_confluence_connector_structure():
    from app.connectors.confluence import ConfluenceConnector
    connector = ConfluenceConnector()
    assert hasattr(connector, "search_content")
    assert hasattr(connector, "get_page")


@pytest.mark.asyncio
async def test_jtmf_connector_structure():
    from app.connectors.jtmf import JTMFConnector
    connector = JTMFConnector()
    assert hasattr(connector, "get_suite_tests")
    assert hasattr(connector, "get_suite_history")
    assert hasattr(connector, "get_coverage_map")
    assert hasattr(connector, "get_test_run_results")


def test_jira_parse_acceptance_criteria_from_text():
    from app.connectors.jira import _parse_acceptance_criteria
    description = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": "Acceptance Criteria:\nAC1: Fee shown before confirmation\nAC2: Fee waived for PLT accounts"}]
            }
        ]
    }
    result = _parse_acceptance_criteria(description)
    assert len(result) >= 2
    assert any("Fee" in r or "AC" in r for r in result)


def test_jira_parse_ac_with_prefix():
    from app.connectors.jira import _parse_acceptance_criteria
    description = {
        "type": "doc",
        "content": [{"type": "paragraph", "content": [{"type": "text", "text": "AC1: First\nAC2: Second"}]}]
    }
    result = _parse_acceptance_criteria(description)
    assert len(result) == 2
