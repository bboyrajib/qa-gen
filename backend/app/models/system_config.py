from sqlalchemy import Column, String, JSON, DateTime
from app.core.db import Base
from datetime import datetime


class QgSystemConfig(Base):
    __tablename__ = "qg_system_config"

    key = Column(String(100), primary_key=True)
    value = Column(JSON, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
