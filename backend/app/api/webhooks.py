import asyncio
import hashlib
import hmac
import uuid
from fastapi import APIRouter, Request, HTTPException, Header
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.db import SessionLocal
from app.models.job import QgJob

router = APIRouter()


def _verify_hmac(body: bytes, signature: str) -> bool:
    if not settings.webhook_secret:
        return True  # Skip if not configured
    expected = hmac.new(settings.webhook_secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)


@router.post("/cicd-failure")
async def cicd_failure_webhook(
    request: Request,
    x_webhook_signature: str = Header(None),
):
    body = await request.body()
    if x_webhook_signature and not _verify_hmac(body, x_webhook_signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    data = await request.json()
    project_id = data.get("project_id")
    if not project_id:
        raise HTTPException(status_code=400, detail="project_id required")

    db: Session = SessionLocal()
    try:
        job = QgJob(
            id=uuid.uuid4(),
            type="rca",
            status="QUEUED",
            project_id=project_id,
            user_display_name="webhook",
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        job_id = str(job.id)
    finally:
        db.close()

    from app.agents.failure_rca.agent import FailureRCAAgent
    agent = FailureRCAAgent(job_id)
    asyncio.create_task(agent.run(data))
    return {"job_id": job_id, "message": "RCA job queued"}


@router.post("/pr-commit")
async def pr_commit_webhook(
    request: Request,
    x_webhook_signature: str = Header(None),
):
    body = await request.body()
    if x_webhook_signature and not _verify_hmac(body, x_webhook_signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    data = await request.json()
    project_id = data.get("project_id")
    if not project_id:
        raise HTTPException(status_code=400, detail="project_id required")

    db: Session = SessionLocal()
    try:
        job = QgJob(
            id=uuid.uuid4(),
            type="impact",
            status="QUEUED",
            project_id=project_id,
            user_display_name="webhook",
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        job_id = str(job.id)
    finally:
        db.close()

    from app.agents.impact_analysis.agent import TestImpactAgent
    agent = TestImpactAgent(job_id)
    asyncio.create_task(agent.run(data))
    return {"job_id": job_id, "message": "Impact analysis job queued"}
