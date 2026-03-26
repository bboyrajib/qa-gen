from typing import List
from sqlalchemy.orm import Session
from app.models.chat import QgChatMessage


def load_history(db: Session, session_id: str, limit: int = 20) -> List[dict]:
    messages = (
        db.query(QgChatMessage)
        .filter(QgChatMessage.session_id == session_id)
        .order_by(QgChatMessage.created_at.asc())
        .limit(limit)
        .all()
    )
    return [{"role": m.role, "content": m.content} for m in messages]


def save_message(db: Session, session_id: str, role: str, content: str, citations: list = None):
    msg = QgChatMessage(
        session_id=session_id,
        role=role,
        content=content,
        citations=citations or [],
    )
    db.add(msg)
    db.commit()
