from sqlalchemy import Column, String, DateTime, JSON, Text
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from app.core.db import Base
from datetime import datetime
import uuid


class QgChatSession(Base):
    __tablename__ = "qg_chat_sessions"

    id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    user_id = Column(UNIQUEIDENTIFIER, nullable=False)
    project_id = Column(UNIQUEIDENTIFIER, nullable=True)
    pending_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class QgChatMessage(Base):
    __tablename__ = "qg_chat_messages"

    id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    session_id = Column(UNIQUEIDENTIFIER, nullable=False)
    role = Column(String(20), nullable=False)  # user | assistant
    content = Column(Text, nullable=False)
    citations = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
