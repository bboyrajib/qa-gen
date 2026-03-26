from sqlalchemy import Column, String, Boolean, DateTime, JSON
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from app.core.db import Base
from datetime import datetime
import uuid


class QgProject(Base):
    __tablename__ = "qg_projects"

    id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    jira_project_key = Column(String(50), nullable=True)
    jtmf_suite_group = Column(String(255), nullable=True)
    confluence_space = Column(String(100), nullable=True)
    domain_tag = Column(String(100), nullable=True)
    search_index_prefix = Column(String(100), nullable=True)
    enabled_modules = Column(JSON, nullable=True, default=None)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(UNIQUEIDENTIFIER, nullable=True)
    is_active = Column(Boolean, default=True)


class QgProjectMember(Base):
    __tablename__ = "qg_project_members"

    id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    project_id = Column(UNIQUEIDENTIFIER, nullable=False)
    user_email = Column(String(255), nullable=False)
    user_display_name = Column(String(255), nullable=True)
    role = Column(String(50), default="member")
    added_at = Column(DateTime, default=datetime.utcnow)
