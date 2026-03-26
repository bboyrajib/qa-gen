import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.auth import get_current_user
from app.core.db import get_db
from app.models.project import QgProject, QgProjectMember
from app.schemas.projects import ProjectCreate, ProjectOut
from typing import List

router = APIRouter()


def _project_to_out(project: QgProject, db: Session) -> dict:
    member_count = db.query(QgProjectMember).filter(QgProjectMember.project_id == project.id).count()
    return {
        "id": str(project.id),
        "name": project.name,
        "domain_tag": project.domain_tag,
        "jira_project_key": project.jira_project_key,
        "member_count": member_count,
        "created_at": project.created_at.isoformat() + "Z" if project.created_at else None,
        "created_by": str(project.created_by) if project.created_by else None,
        "enabled_modules": project.enabled_modules,
    }


@router.get("/", response_model=List[ProjectOut])
async def list_projects(user=Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(QgProject).filter(QgProject.is_active == True)
    if user.role != "super_admin" and user.project_access is not None:
        q = q.filter(QgProject.id.in_(user.project_access))
    projects = q.all()
    return [_project_to_out(p, db) for p in projects]


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(project_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(QgProject).filter(QgProject.id == project_id, QgProject.is_active == True).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return _project_to_out(project, db)


@router.post("/", response_model=ProjectOut, status_code=201)
async def create_project(payload: ProjectCreate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    project = QgProject(
        id=uuid.uuid4(),
        name=payload.name,
        jira_project_key=payload.jira_project_key,
        domain_tag=payload.domain_tag,
        created_by=user.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return _project_to_out(project, db)
