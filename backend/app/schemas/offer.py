from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from app.models.offer import OfferStatus

class OfferCreate(BaseModel):
    student_reg_no: str # can be canonical or any alias
    company_id: UUID
    package_value: Optional[float] = None # LPA
    offer_date: Optional[date] = None
    is_final: bool = False
    status: OfferStatus = OfferStatus.OFFERED

class OfferUpdate(BaseModel):
    package_value: Optional[float] = None
    offer_date: Optional[date] = None
    is_final: Optional[bool] = None
    status: Optional[OfferStatus] = None

class OfferResponse(BaseModel):
    id: UUID
    student_reg_no: str
    student_name: Optional[str] = None
    company_id: UUID
    company_name: str
    batch_id: UUID
    batch_year: Optional[str] = None
    package_value: Optional[float] = None
    offer_date: date
    is_final: bool
    status: OfferStatus
    created_at: datetime

    class Config:
        from_attributes = True
