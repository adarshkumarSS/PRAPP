import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class UnrecognizedToken(Base):
    __tablename__ = "unrecognized_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token_value = Column(String(255), nullable=False, index=True)
    source_context = Column(String(255), nullable=True) # e.g. "Company: TCS - Round: Tech Interview"
    batch_id = Column(UUID(as_uuid=True), ForeignKey("batches.id", ondelete="SET NULL"), nullable=True)
    pr_id = Column(UUID(as_uuid=True), ForeignKey("prs.id", ondelete="SET NULL"), nullable=True)
    resolved = Column(Boolean, default=False, nullable=False)
    resolved_student_reg_no = Column(String(100), ForeignKey("students.reg_no", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
