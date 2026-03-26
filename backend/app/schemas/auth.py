from pydantic import BaseModel, EmailStr
from typing import Optional, List


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_admin: bool
    project_access: Optional[List[str]]

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class UserCreate(BaseModel):
    email: EmailStr
    display_name: str
    password: str
    role: str = "user"
    is_admin: bool = False
    project_access: Optional[List[str]] = []


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None
    project_access: Optional[List[str]] = None


class UserOut(BaseModel):
    id: str
    email: str
    display_name: str
    role: str
    is_admin: bool
    is_active: bool
    project_access: Optional[List[str]]
    last_login: Optional[str] = None
    created_by: Optional[str] = None

    class Config:
        from_attributes = True
