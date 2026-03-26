from pydantic import BaseModel
from typing import Optional


class ChatRequest(BaseModel):
    message: str
    project_id: Optional[str] = None


class ChatSessionResponse(BaseModel):
    session_id: str
