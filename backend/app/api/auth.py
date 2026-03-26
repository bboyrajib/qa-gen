from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.auth import verify_password, create_access_token, get_current_user, hash_password
from app.core.db import get_db
from app.models.user import QgUser
from app.schemas.auth import TokenResponse, UserOut

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
        },
    }


@router.get("/me", response_model=UserOut)
async def me(current_user: QgUser = Depends(get_current_user)):
    return current_user


@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}
