from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.auth import require_admin, hash_password
from app.core.db import get_db
from app.models.user import QgUser
from app.schemas.auth import UserCreate, UserUpdate, UserOut

router = APIRouter()

ALL_MODULES = ["tosca_convert", "test_generation", "failure_rca", "impact_analysis", "regression_opt"]


@router.get("/users", response_model=list[UserOut])
async def list_users(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return db.query(QgUser).order_by(QgUser.created_at.desc()).all()


@router.post("/users", response_model=UserOut, status_code=201)
async def create_user(payload: UserCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    if db.query(QgUser).filter(QgUser.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    is_admin = payload.role in ("super_admin", "admin")
    import uuid
    user = QgUser(
        id=uuid.uuid4(),
        email=payload.email,
        display_name=payload.display_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        is_admin=is_admin,
        project_access=payload.project_access or [],
        created_by=admin.email,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserOut)
async def update_user(user_id: str, payload: UserUpdate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    user = db.query(QgUser).filter(QgUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.display_name is not None:
        user.display_name = payload.display_name
    if payload.password is not None:
        user.hashed_password = hash_password(payload.password)
    if payload.role is not None:
        user.role = payload.role
        user.is_admin = payload.role in ("super_admin", "admin")
    if payload.is_admin is not None:
        user.is_admin = payload.is_admin
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.project_access is not None:
        user.project_access = payload.project_access
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
async def deactivate_user(user_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    user = db.query(QgUser).filter(QgUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()


@router.post("/users/{user_id}/projects/{project_id}")
async def grant_project_access(user_id: str, project_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    user = db.query(QgUser).filter(QgUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    access = list(user.project_access or [])
    if project_id not in access:
        access.append(project_id)
        user.project_access = access
        db.commit()
    return {"message": f"Access granted to project {project_id}"}


@router.delete("/users/{user_id}/projects/{project_id}")
async def revoke_project_access(user_id: str, project_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    user = db.query(QgUser).filter(QgUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.project_access = [p for p in (user.project_access or []) if p != project_id]
    db.commit()
    return {"message": f"Access revoked for project {project_id}"}


@router.get("/projects/{project_id}/modules")
async def get_project_modules(project_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    from app.models.project import QgProject
    project = db.query(QgProject).filter(QgProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    enabled = project.enabled_modules if project.enabled_modules is not None else ALL_MODULES
    return {
        "project_id": project_id,
        "project_name": project.name,
        "modules": [{"key": m, "enabled": m in enabled} for m in ALL_MODULES],
    }


@router.patch("/projects/{project_id}/modules")
async def set_project_modules(project_id: str, payload: dict, db: Session = Depends(get_db), admin=Depends(require_admin)):
    from app.models.project import QgProject
    project = db.query(QgProject).filter(QgProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    modules = payload.get("enabled_modules")
    if modules is not None:
        invalid = [m for m in modules if m not in ALL_MODULES]
        if invalid:
            raise HTTPException(status_code=422, detail=f"Invalid module keys: {invalid}. Valid: {ALL_MODULES}")
    project.enabled_modules = modules
    db.commit()
    return {"message": "Module access updated", "enabled_modules": project.enabled_modules}
