from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from app.core.db import Base
from datetime import datetime
import uuid


class QgDomainConfig(Base):
    __tablename__ = "qg_domain_configs"

    id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    project_id = Column(UNIQUEIDENTIFIER, nullable=False)
    domain_tag = Column(String(100), nullable=False)
    constraints = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
