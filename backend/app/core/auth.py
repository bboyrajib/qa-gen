from datetime import datetime, timedelta
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.db import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    from app.models.user import QgUser
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(QgUser).filter(QgUser.email == email, QgUser.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


async def require_admin(current_user=Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


async def require_super_admin(current_user=Depends(get_current_user)):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    return current_user


def check_project_access(user, project_id: str):
    if user.role == "super_admin":
        return
    if user.project_access is None or project_id not in user.project_access:
        raise HTTPException(status_code=403, detail="You do not have access to this project")


def check_project_admin_access(user, project_id: str, db):
    """Allow super_admin always; allow project members whose role is 'admin'."""
    if user.role == "super_admin":
        return
    from app.models.project import QgProjectMember
    member = db.query(QgProjectMember).filter(
        QgProjectMember.project_id == project_id,
        QgProjectMember.user_email == user.email,
        QgProjectMember.role == "admin",
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Project admin access required")


def check_module_access(project, module: str, db: Session):
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check global disable first
    from app.models.system_config import QgSystemConfig
    global_row = db.query(QgSystemConfig).filter(QgSystemConfig.key == "global_modules").first()
    if global_row and isinstance(global_row.value, dict) and global_row.value.get(module) is False:
        raise HTTPException(
            status_code=403,
            detail=f"Module '{module}' has been globally disabled by an administrator."
        )

    # Check per-project disable
    if project.enabled_modules is None:
        return
    if module not in project.enabled_modules:
        raise HTTPException(
            status_code=403,
            detail=f"Module '{module}' is not enabled for project '{project.name}'. Contact your admin to enable it."
        )
