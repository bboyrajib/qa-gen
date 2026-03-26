import asyncio
import json
from typing import AsyncGenerator
from sqlalchemy.orm import Session
from app.core.db import SessionLocal
from app.models.job import QgJob
import redis.asyncio as aioredis
from app.core.config import settings

# Redis channel prefix for SSE pub/sub
_CHANNEL_PREFIX = "job_stream:"


def _redis_client():
    return aioredis.from_url(
        f"rediss://{settings.redis_endpoint}",
        ssl_cert_reqs=None,
        decode_responses=True,
    )


async def publish_event(job_id: str, event: dict):
    try:
        r = _redis_client()
        await r.publish(f"{_CHANNEL_PREFIX}{job_id}", json.dumps(event))
        await r.aclose()
    except Exception:
        pass


async def run_job_stream(job_id: str, user_email: str) -> AsyncGenerator[dict, None]:
    """Subscribe to Redis pubsub for job events, yield until done."""
    r = _redis_client()
    pubsub = r.pubsub()
    await pubsub.subscribe(f"{_CHANNEL_PREFIX}{job_id}")

    # Check if job is already complete
    db: Session = SessionLocal()
    try:
        job = db.query(QgJob).filter(QgJob.id == job_id).first()
        if job and job.status in ("COMPLETE", "FAILED"):
            result = job.result_payload or {}
            yield {"event": "done", "job_id": job_id, "result_url": f"/api/v1/jobs/{job_id}/result"}
            return
    finally:
        db.close()

    timeout = 300  # 5 minutes max
    elapsed = 0
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                yield data
                if data.get("event") == "done":
                    break
            await asyncio.sleep(0.1)
            elapsed += 0.1
            if elapsed >= timeout:
                yield {"event": "error", "message": "Job timed out"}
                break
    finally:
        await pubsub.unsubscribe()
        await r.aclose()


def update_job_status(job_id: str, status: str, step: str = None, error: str = None):
    db: Session = SessionLocal()
    try:
        job = db.query(QgJob).filter(QgJob.id == job_id).first()
        if job:
            job.status = status
            if step:
                job.step_current = step
            if error:
                job.error_message = error
            db.commit()
    finally:
        db.close()


def save_job_result(job_id: str, result: dict):
    db: Session = SessionLocal()
    try:
        job = db.query(QgJob).filter(QgJob.id == job_id).first()
        if job:
            job.status = "COMPLETE"
            job.result_payload = result
            db.commit()
    finally:
        db.close()
