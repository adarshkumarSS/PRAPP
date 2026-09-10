from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.models.round_result import ResultStatus

class RoundResultCommitItem(BaseModel):
    student_reg_no: str
    status: ResultStatus = ResultStatus.CLEARED

class RoundResultCommitRequest(BaseModel):
    round_id: UUID
    results: List[RoundResultCommitItem]
    mark_unspecified_as: Optional[ResultStatus] = None # e.g. NOT_CLEARED or ABSENT

class RoundResultDiffItem(BaseModel):
    student_reg_no: str
    student_name: Optional[str] = None
    input_token: str
    format_type: Optional[str] = None
    previous_status: Optional[ResultStatus] = None
    new_status: ResultStatus
    is_change: bool
    is_eligible: bool = True

class RoundResultDiffResponse(BaseModel):
    round_id: UUID
    round_name: str
    company_name: str
    total_input_tokens: int
    matched_count: int
    unrecognized_count: int
    unrecognized_tokens: List[str]
    diff_items: List[RoundResultDiffItem]
    newly_cleared_count: int
    already_cleared_count: int
    not_cleared_count: int
    absent_count: int

class RoundResultResponse(BaseModel):
    id: UUID
    round_id: UUID
    student_reg_no: str
    student_name: Optional[str] = None
    status: ResultStatus
    updated_at: datetime

    class Config:
        from_attributes = True
