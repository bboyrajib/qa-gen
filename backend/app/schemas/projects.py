from pydantic import BaseModel
from typing import Optional, List


class ProjectCreate(BaseModel):
    name: str
    jira_project_key: Optional[str] = None
    domain_tag: Optional[str] = "Payments"


class ProjectOut(BaseModel):
    id: str
    name: str
    domain_tag: Optional[str] = None
    jira_project_key: Optional[str] = None
    member_count: int = 0
    created_at: str
    created_by: Optional[str] = None
    enabled_modules: Optional[List[str]] = None

    class Config:
        from_attributes = True
