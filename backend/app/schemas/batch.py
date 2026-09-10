from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class BatchCreate(BaseModel):
    year_label: str # e.g. "2027"

class BatchResponse(BaseModel):
    id: UUID
    year_label: str
    created_by: Optional[UUID] = None
    created_at: datetime
    pr_count: Optional[int] = 0
    student_count: Optional[int] = 0
    placed_student_count: Optional[int] = 0
    placement_pct: Optional[float] = 0.0

    class Config:
        from_attributes = True
