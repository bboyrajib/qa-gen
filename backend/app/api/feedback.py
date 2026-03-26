import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.auth import get_current_user
from app.core.db import get_db
from app.models.feedback import QgFeedback
from app.schemas.feedback import FeedbackCreate

router = APIRouter()


@router.post("/")
async def submit_feedback(payload: FeedbackCreate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    fb = QgFeedback(
        id=uuid.uuid4(),
        job_id=payload.job_id,
        user_id=user.id,
        module_type=payload.module_type,
        rating=payload.rating,
        thumbs=payload.thumbs,
        correction=payload.correction,
    )
    db.add(fb)
    db.commit()
    return {"message": "Feedback recorded"}
