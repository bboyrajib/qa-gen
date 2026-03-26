from sqlalchemy import Column, String, Integer, DateTime, JSON
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from app.core.db import Base
from datetime import datetime
import uuid


class QgRcaFingerprint(Base):
    __tablename__ = "qg_rca_fingerprints"

    id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    fingerprint_hash = Column(String(64), unique=True, nullable=False, index=True)
    exception_class = Column(String(255), nullable=True)
    service_tag = Column(String(255), nullable=True)
    classification = Column(String(100), nullable=True)
    confidence = Column(Integer, default=0)
    occurrence_count = Column(Integer, default=1)
    last_seen = Column(DateTime, default=datetime.utcnow)
    jira_ticket_key = Column(String(50), nullable=True)
    project_id = Column(UNIQUEIDENTIFIER, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
