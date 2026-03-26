from sqlalchemy import Column, String, DateTime, JSON, Text
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from app.core.db import Base
from datetime import datetime
import uuid


class QgJob(Base):
    __tablename__ = "qg_jobs"

    id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    type = Column(String(50), nullable=False)  # tosca-convert | test-gen | rca | impact | regression
    status = Column(String(20), nullable=False, default="QUEUED")  # QUEUED | RUNNING | COMPLETE | FAILED
    project_id = Column(UNIQUEIDENTIFIER, nullable=False)
    user_id = Column(UNIQUEIDENTIFIER, nullable=True)
    user_display_name = Column(String(255), nullable=True)
    step_current = Column(String(100), nullable=True)
    result_payload = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
