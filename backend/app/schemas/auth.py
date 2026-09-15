from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from uuid import UUID
from datetime import datetime

def validate_tce_email(v: str) -> str:
    cleaned = str(v).lower().strip()
    if not cleaned.endswith("@tce.edu"):
        raise ValueError("Access restricted: Only official @tce.edu email addresses are permitted.")
    return cleaned

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role_hint: Optional[str] = None # "ADMIN" or "PR" (optional)

    @field_validator("email")
    @classmethod
    def validate_email_domain(cls, v: str) -> str:
        return validate_tce_email(v)

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

    @field_validator("email")
    @classmethod
    def validate_email_domain(cls, v: str) -> str:
        return validate_tce_email(v)

class UserProfile(BaseModel):
    id: UUID
    name: str
    email: str
    role: str
    batch_id: Optional[UUID] = None
    batch_year: Optional[str] = None
    created_at: datetime
