from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.auth import verify_password, create_access_token, get_current_user, hash_password
from app.core.db import get_db
from app.models.user import QgUser
from app.schemas.auth import TokenResponse, UserOut, ChangePasswordRequest

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(QgUser).filter(QgUser.email == form.username, QgUser.is_active == True).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user.last_login = datetime.utcnow()
    db.commit()
    token = create_access_token({"sub": user.email, "role": user.role, "is_admin": user.is_admin})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.display_name,
            "role": user.role,
            "is_admin": user.is_admin,
            "project_access": user.project_access,
            "must_change_password": user.must_change_password,
        },
    }


@router.get("/me", response_model=UserOut)
async def me(current_user: QgUser = Depends(get_current_user)):
    return current_user


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: QgUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Skip current-password verification for first-login password setup
    if not current_user.must_change_password:
        if not payload.current_password:
            raise HTTPException(status_code=400, detail="Current password is required")
        if not verify_password(payload.current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=422, detail="New password must be at least 8 characters")
    current_user.hashed_password = hash_password(payload.new_password)
    current_user.must_change_password = False
    db.commit()
    return {"message": "Password changed successfully"}


@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}
