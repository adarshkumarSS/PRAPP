from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from uuid import UUID
from datetime import datetime

class PRCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    batch_id: Optional[UUID] = None

    @field_validator("email")
    @classmethod
    def validate_email_domain(cls, v: str) -> str:
        cleaned = str(v).lower().strip()
        if not cleaned.endswith("@tce.edu"):
            raise ValueError("Access restricted: Only official @tce.edu email addresses are permitted.")
        return cleaned

class PRAssignBatch(BaseModel):
    batch_id: Optional[UUID] = None # null to unassign

class PRResponse(BaseModel):
    id: UUID
    name: str
    email: str
    batch_id: Optional[UUID] = None
    batch_year: Optional[str] = None
    assigned_by: Optional[UUID] = None
    assigned_by_name: Optional[str] = None
    assigned_at: Optional[datetime] = None
    created_at: datetime
    students_count: Optional[int] = 0
    placed_count: Optional[int] = 0
    placement_pct: Optional[float] = 0.0

    class Config:
        from_attributes = True
