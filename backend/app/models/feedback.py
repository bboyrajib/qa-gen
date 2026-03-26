from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from app.core.db import Base
from datetime import datetime
import uuid


class QgFeedback(Base):
    __tablename__ = "qg_feedback"

    id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    job_id = Column(UNIQUEIDENTIFIER, nullable=False)
    project_id = Column(UNIQUEIDENTIFIER, nullable=True)
    user_id = Column(UNIQUEIDENTIFIER, nullable=True)
    module_type = Column(String(50), nullable=False)
    rating = Column(Integer, default=0)
    thumbs = Column(String(10), nullable=True)
    correction = Column(String(2000), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
