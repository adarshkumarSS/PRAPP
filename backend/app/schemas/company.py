from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class RoundCreate(BaseModel):
    name: str # "Online Assessment", "Technical Interview 1", "HR"
    sequence: int

class RoundResponse(BaseModel):
    id: UUID
    company_id: UUID
    name: str
    sequence: int
    cleared_count: Optional[int] = 0
    not_cleared_count: Optional[int] = 0
    absent_count: Optional[int] = 0

    class Config:
        from_attributes = True

class CompanyCreate(BaseModel):
    name: str
    batch_id: Optional[UUID] = None
    rounds: Optional[List[RoundCreate]] = []

class CompanyUpdate(BaseModel):
    name: Optional[str] = None

class EligibilityBulkRequest(BaseModel):
    student_reg_nos: List[str] # can be raw tokens or canonical reg nos
    eligible: bool = True

class EligibilityStudentItem(BaseModel):
    student_reg_no: str
    student_name: Optional[str] = None
    batch_year: Optional[str] = None
    eligible: bool

class CompanyResponse(BaseModel):
    id: UUID
    name: str
    batch_id: UUID
    batch_year: Optional[str] = None
    created_by_pr_id: Optional[UUID] = None
    created_by_pr_name: Optional[str] = None
    created_at: datetime
    rounds: List[RoundResponse] = []
    eligible_count: Optional[int] = 0
    offers_count: Optional[int] = 0
    r1_clear_pct: Optional[float] = 0.0

    class Config:
        from_attributes = True
