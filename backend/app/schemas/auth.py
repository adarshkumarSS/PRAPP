from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role_hint: Optional[str] = None # "ADMIN" or "PR" (optional)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str # "ADMIN" or "PR"
    user_id: str
    name: str
    email: str
    batch_id: Optional[str] = None
    batch_year: Optional[str] = None

class AdminCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserProfile(BaseModel):
    id: UUID
    name: str
    email: str
    role: str
    batch_id: Optional[UUID] = None
    batch_year: Optional[str] = None
    created_at: datetime
