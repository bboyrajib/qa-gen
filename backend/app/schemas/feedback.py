from pydantic import BaseModel
from typing import Optional


class FeedbackCreate(BaseModel):
    job_id: str
    module_type: str
    rating: int = 0
    thumbs: Optional[str] = None
    correction: Optional[str] = None
