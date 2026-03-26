import asyncio
import json
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from app.core.auth import get_current_user, check_project_access, check_module_access
from app.core.config import settings
from app.core.db import get_db
from app.models.job import QgJob
from app.models.project import QgProject
from app.models.user import QgUser
from app.schemas.jobs import JobOut, ToscaConvertInput, TestGenInput, RCAInput, ImpactInput, RegressionOptInput
from app.services.job_runner import run_job_stream

router = APIRouter()


def _job_to_out(job: QgJob) -> dict:
    return {
        "id": str(job.id),
        "type": job.type,
        "status": job.status,
        "submitted": job.created_at.isoformat() + "Z" if job.created_at else None,
        "user": job.user_display_name or "",
        "project_id": str(job.project_id),
    }


@router.get("/", response_model=List[JobOut])
async def list_jobs(
    project_id: Optional[str] = Query(None),
    limit: int = Query(10, le=100),
    user: QgUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(QgJob)
    if project_id:
        check_project_access(user, project_id)
        q = q.filter(QgJob.project_id == project_id)
    elif user.role != "super_admin" and user.project_access is not None:
        q = q.filter(QgJob.project_id.in_(user.project_access))
    jobs = q.order_by(QgJob.created_at.desc()).limit(limit).all()
    return [_job_to_out(j) for j in jobs]


@router.get("/{job_id}/result")
async def get_job_result(job_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    job = db.query(QgJob).filter(QgJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    check_project_access(user, str(job.project_id))
    return {"job_id": job_id, "status": job.status, "result": job.result_payload}


@router.get("/{job_id}/stream")
async def stream_job(job_id: str, token: str = Query(...)):
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_email = payload.get("sub")
        if not user_email:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    async def event_generator():
        async for event in run_job_stream(job_id, user_email):
            yield f"data: {json.dumps(event)}\n\n"
            await asyncio.sleep(0)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def _create_job(db: Session, user: QgUser, job_type: str, project_id: str) -> QgJob:
    job = QgJob(
        id=uuid.uuid4(),
        type=job_type,
        status="QUEUED",
        project_id=project_id,
        user_id=user.id,
        user_display_name=user.display_name,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.post("/tosca-convert")
async def submit_tosca(payload: ToscaConvertInput, user=Depends(get_current_user), db: Session = Depends(get_db)):
    check_project_access(user, payload.project_id)
    project = db.query(QgProject).filter(QgProject.id == payload.project_id).first()
    check_module_access(project, "tosca_convert")
    job = _create_job(db, user, "tosca-convert", payload.project_id)
    from app.agents.tosca_convert.agent import ToscaConvertAgent
    agent = ToscaConvertAgent(str(job.id))
    asyncio.create_task(agent.run(payload.dict()))
    return {"job_id": str(job.id)}


@router.post("/test-generation")
async def submit_test_gen(payload: TestGenInput, user=Depends(get_current_user), db: Session = Depends(get_db)):
    check_project_access(user, payload.project_id)
    project = db.query(QgProject).filter(QgProject.id == payload.project_id).first()
    check_module_access(project, "test_generation")
    job = _create_job(db, user, "test-gen", payload.project_id)
    from app.agents.test_generation.agent import TestGenerationAgent
    agent = TestGenerationAgent(str(job.id))
    asyncio.create_task(agent.run(payload.dict()))
    return {"job_id": str(job.id)}


@router.post("/failure-rca")
async def submit_rca(payload: RCAInput, user=Depends(get_current_user), db: Session = Depends(get_db)):
    check_project_access(user, payload.project_id)
    project = db.query(QgProject).filter(QgProject.id == payload.project_id).first()
    check_module_access(project, "failure_rca")
    job = _create_job(db, user, "rca", payload.project_id)
    from app.agents.failure_rca.agent import FailureRCAAgent
    agent = FailureRCAAgent(str(job.id))
    asyncio.create_task(agent.run(payload.dict()))
    return {"job_id": str(job.id)}


@router.post("/impact-analysis")
async def submit_impact(payload: ImpactInput, user=Depends(get_current_user), db: Session = Depends(get_db)):
    check_project_access(user, payload.project_id)
    project = db.query(QgProject).filter(QgProject.id == payload.project_id).first()
    check_module_access(project, "impact_analysis")
    job = _create_job(db, user, "impact", payload.project_id)
    from app.agents.impact_analysis.agent import TestImpactAgent
    agent = TestImpactAgent(str(job.id))
    asyncio.create_task(agent.run(payload.dict()))
    return {"job_id": str(job.id)}


@router.post("/regression-optimize")
async def submit_regression(payload: RegressionOptInput, user=Depends(get_current_user), db: Session = Depends(get_db)):
    check_project_access(user, payload.project_id)
    project = db.query(QgProject).filter(QgProject.id == payload.project_id).first()
    check_module_access(project, "regression_opt")
    job = _create_job(db, user, "regression", payload.project_id)
    from app.agents.regression_opt.agent import RegressionOptimizationAgent
    agent = RegressionOptimizationAgent(str(job.id))
    asyncio.create_task(agent.run(payload.dict()))
    return {"job_id": str(job.id)}
