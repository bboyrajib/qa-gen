import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from app.core.auth import get_current_user, check_project_access, check_project_admin_access, hash_password
from app.core.db import get_db
from app.models.project import QgProject, QgProjectMember
from app.models.user import QgUser
from app.schemas.projects import ProjectCreate, ProjectOut

router = APIRouter()

VALID_MODULE_KEYS = ["tosca", "test-gen", "rca", "impact", "regression"]


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


# ── Project Member Management ─────────────────────────────────────────────────

class MemberAddPayload(BaseModel):
    user_email: str
    role: str = "member"  # "admin" | "member"


class MemberUpdatePayload(BaseModel):
    role: str


def _member_to_out(member: QgProjectMember) -> dict:
    return {
        "user_email": member.user_email,
        "user_display_name": member.user_display_name,
        "role": member.role,
        "added_at": member.added_at.isoformat() + "Z" if member.added_at else None,
    }


@router.get("/{project_id}/members")
async def list_members(project_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    check_project_access(user, project_id)
    members = db.query(QgProjectMember).filter(QgProjectMember.project_id == project_id).all()
    return [_member_to_out(m) for m in members]


@router.post("/{project_id}/members", status_code=201)
async def add_member(project_id: str, payload: MemberAddPayload, user=Depends(get_current_user), db: Session = Depends(get_db)):
    check_project_admin_access(user, project_id, db)
    project = db.query(QgProject).filter(QgProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    target = db.query(QgUser).filter(QgUser.email == payload.user_email).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    existing = db.query(QgProjectMember).filter(
        QgProjectMember.project_id == project_id,
        QgProjectMember.user_email == payload.user_email,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="User is already a member of this project")
    if payload.role not in ("admin", "member"):
        raise HTTPException(status_code=422, detail="Role must be 'admin' or 'member'")
    member = QgProjectMember(
        id=uuid.uuid4(),
        project_id=project_id,
        user_email=payload.user_email,
        user_display_name=target.display_name,
        role=payload.role,
    )
    db.add(member)
    # Grant project access on user record if not already present
    access = list(target.project_access or [])
    if project_id not in access:
        access.append(project_id)
        target.project_access = access
    db.commit()
    return _member_to_out(member)


@router.patch("/{project_id}/members/{user_email}")
async def update_member_role(project_id: str, user_email: str, payload: MemberUpdatePayload, user=Depends(get_current_user), db: Session = Depends(get_db)):
    check_project_admin_access(user, project_id, db)
    if payload.role not in ("admin", "member"):
        raise HTTPException(status_code=422, detail="Role must be 'admin' or 'member'")
    member = db.query(QgProjectMember).filter(
        QgProjectMember.project_id == project_id,
        QgProjectMember.user_email == user_email,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    member.role = payload.role
    db.commit()
    return _member_to_out(member)


@router.delete("/{project_id}/members/{user_email}", status_code=204)
async def remove_member(project_id: str, user_email: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    check_project_admin_access(user, project_id, db)
    member = db.query(QgProjectMember).filter(
        QgProjectMember.project_id == project_id,
        QgProjectMember.user_email == user_email,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    # Revoke project access from user record
    target = db.query(QgUser).filter(QgUser.email == user_email).first()
    if target and target.project_access:
        target.project_access = [p for p in target.project_access if p != project_id]
    db.commit()


# ── Project-Admin User Creation ───────────────────────────────────────────────

class ProjectUserCreate(BaseModel):
    email: EmailStr
    display_name: str
    password: str
    project_role: str = "member"  # "admin" | "member"


@router.post("/{project_id}/users", status_code=201)
async def create_project_user(
    project_id: str,
    payload: ProjectUserCreate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Project admins can create a new user account and immediately add them to the project.
    The new account is created with must_change_password=True so the user is prompted to
    set their own password on first login."""
    check_project_admin_access(user, project_id, db)
    project = db.query(QgProject).filter(QgProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if db.query(QgUser).filter(QgUser.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    if payload.project_role not in ("admin", "member"):
        raise HTTPException(status_code=422, detail="project_role must be 'admin' or 'member'")

    new_user = QgUser(
        id=uuid.uuid4(),
        email=payload.email,
        display_name=payload.display_name,
        hashed_password=hash_password(payload.password),
        role="user",
        is_admin=False,
        project_access=[project_id],
        must_change_password=True,
        created_by=user.email,
    )
    db.add(new_user)

    member = QgProjectMember(
        id=uuid.uuid4(),
        project_id=project_id,
        user_email=payload.email,
        user_display_name=payload.display_name,
        role=payload.project_role,
    )
    db.add(member)
    db.commit()
    db.refresh(new_user)
    return _member_to_out(member)


# ── Per-Project Module Settings ───────────────────────────────────────────────

@router.get("/{project_id}/modules")
async def get_project_modules(project_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    check_project_access(user, project_id)
    project = db.query(QgProject).filter(QgProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    enabled = project.enabled_modules if project.enabled_modules is not None else VALID_MODULE_KEYS
    return {"enabled_modules": enabled}


@router.patch("/{project_id}/modules")
async def set_project_modules(
    project_id: str,
    payload: dict,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_project_admin_access(user, project_id, db)
    project = db.query(QgProject).filter(QgProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    enabled = payload.get("enabled_modules")
    if not isinstance(enabled, list):
        raise HTTPException(status_code=422, detail="'enabled_modules' must be a list")
    invalid = [m for m in enabled if m not in VALID_MODULE_KEYS]
    if invalid:
        raise HTTPException(status_code=422, detail=f"Invalid module keys: {invalid}. Valid: {VALID_MODULE_KEYS}")
    project.enabled_modules = enabled
    db.commit()
    return {"enabled_modules": project.enabled_modules}
