from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.models.alias import AliasFormatType

class TokenResolveRequest(BaseModel):
    raw_text: Optional[str] = None
    tokens: Optional[List[str]] = None
    batch_id: Optional[UUID] = None
    source_context: Optional[str] = None

class MatchedTokenItem(BaseModel):
    raw_token: str
    normalized_token: str
    canonical_reg_no: str
    student_name: Optional[str] = None
    format_type: Optional[str] = None # "CANONICAL", "COLLEGE_REGNO", "LONG_NUMERIC", "SERIAL"
    batch_id: UUID
    batch_year: Optional[str] = None

class TokenResolveResponse(BaseModel):
    total_tokens_found: int
    unique_tokens_count: int
    matched_count: int
    unrecognized_count: int
    matched: List[MatchedTokenItem]
    unrecognized: List[str]

class UnrecognizedTokenItem(BaseModel):
    id: UUID
    token_value: str
    source_context: Optional[str] = None
    batch_id: Optional[UUID] = None
    batch_year: Optional[str] = None
    pr_id: Optional[UUID] = None
    pr_name: Optional[str] = None
    resolved: bool
    resolved_student_reg_no: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ResolveTokenManualRequest(BaseModel):
    canonical_reg_no: str
    format_type: Optional[AliasFormatType] = AliasFormatType.COLLEGE_REGNO
