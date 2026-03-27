from sqlalchemy import Column, String, Boolean, DateTime, JSON
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from app.core.db import Base
from datetime import datetime
import uuid


class QgUser(Base):
    __tablename__ = "qg_users"

    id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    display_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="user")
    is_admin = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    project_access = Column(JSON, default=list)
    must_change_password = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    created_by = Column(String(255), nullable=True)
