from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.models.student import PlacementStatus
from app.models.alias import AliasFormatType

class AliasCreateItem(BaseModel):
    alias_value: str
    format_type: AliasFormatType

class StudentCreate(BaseModel):
    reg_no: str
    name: Optional[str] = None
    college_regno: Optional[str] = None  # e.g. "H2442AB"
    long_numeric: Optional[str] = None   # e.g. "917724421301"
    serial: Optional[str] = None         # e.g. "1" or "01"
    batch_id: Optional[UUID] = None

class BulkStudentItem(BaseModel):
    reg_no: str
    name: Optional[str] = None
    college_regno: Optional[str] = None
    long_numeric: Optional[str] = None
    serial: Optional[str] = None

class BulkStudentUploadRequest(BaseModel):
    students: List[BulkStudentItem]
    batch_id: Optional[UUID] = None

class AliasResponse(BaseModel):
    id: UUID
    alias_value: str
    format_type: AliasFormatType

    class Config:
        from_attributes = True

class StudentOfferItem(BaseModel):
    id: UUID
    company_name: str
    package_value: Optional[float] = None
    is_final: bool
    status: str

class StudentResponse(BaseModel):
    reg_no: str
    name: Optional[str] = None
    batch_id: UUID
    batch_year: Optional[str] = None
    added_by_pr_id: Optional[UUID] = None
    added_by_pr_name: Optional[str] = None
    placement_status: PlacementStatus
    created_at: datetime
    aliases: List[AliasResponse] = []
    offers: List[StudentOfferItem] = []
    total_offers_count: int = 0
    final_company_name: Optional[str] = None
    final_package: Optional[float] = None

    class Config:
        from_attributes = True

class BulkUploadResult(BaseModel):
    added_count: int
    skipped_count: int
    aliases_created_count: int
    errors: List[str] = []
