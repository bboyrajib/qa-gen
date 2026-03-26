import asyncio
import json
import uuid
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from app.core.auth import get_current_user
from app.core.config import settings
from app.core.db import get_db
from app.models.chat import QgChatSession, QgChatMessage
from app.schemas.chat import ChatRequest, ChatSessionResponse
from app.chatbot.context import load_history, save_message
from app.chatbot.service import stream_chat

router = APIRouter()


@router.post("/", response_model=ChatSessionResponse)
async def start_chat(payload: ChatRequest, user=Depends(get_current_user), db: Session = Depends(get_db)):
    # Get or create session
    session = (
        db.query(QgChatSession)
        .filter(QgChatSession.user_id == user.id)
        .order_by(QgChatSession.updated_at.desc())
        .first()
    )
    if not session:
        session = QgChatSession(id=uuid.uuid4(), user_id=user.id, project_id=payload.project_id)
        db.add(session)

    session.pending_message = payload.message
    db.commit()
    save_message(db, str(session.id), "user", payload.message)

    return {"session_id": str(session.id)}


@router.get("/stream/{session_id}")
async def stream_chat_response(session_id: str, token: str = Query(...), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_email = payload.get("sub")
        if not user_email:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    session = db.query(QgChatSession).filter(QgChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_message = session.pending_message or ""
    history = load_history(db, session_id)

    async def event_generator():
        full_response = ""
        citations = []
        async for event in stream_chat(user_message, history):
            if event.get("type") == "done":
                citations = event.get("citations", [])
            else:
                full_response += event.get("token", "")
            yield f"data: {json.dumps(event)}\n\n"
            await asyncio.sleep(0)
        # Save assistant response
        save_message(db, session_id, "assistant", full_response, citations)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
