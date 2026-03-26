from pydantic import BaseModel
from typing import Optional, List


class JobOut(BaseModel):
    id: str
    type: str
    status: str
    submitted: str
    user: str
    project_id: str

    class Config:
        from_attributes = True


class ToscaConvertInput(BaseModel):
    file_content: str
    file_name: str
    framework: str = "typescript"
    browser: str = "chromium"
    base_url: str
    jira_story_id: Optional[str] = None
    project_id: str


class TestGenInput(BaseModel):
    jira_story_id: str
    domain_tag: str
    jtmf_suite_id: Optional[str] = None
    constraints_yaml: Optional[str] = None
    project_id: str


class RCAInput(BaseModel):
    pipeline_run_id: str
    failed_test_ids: List[str]
    service_tag: str
    failure_timestamp: str
    project_id: str


class ImpactInput(BaseModel):
    commit_sha: str
    repository: str
    changed_file_paths: List[str]
    pr_id: Optional[str] = None
    jira_story_id: Optional[str] = None
    project_id: str


class RegressionOptInput(BaseModel):
    jtmf_suite_id: str
    days_history: int = 90
    release_risk_profile: Optional[dict] = None
    project_id: str
