import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class ResultStatus(str, enum.Enum):
    CLEARED = "CLEARED"
    NOT_CLEARED = "NOT_CLEARED"
    ABSENT = "ABSENT"

class RoundResult(Base):
    __tablename__ = "round_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    round_id = Column(UUID(as_uuid=True), ForeignKey("rounds.id", ondelete="CASCADE"), nullable=False, index=True)
    student_reg_no = Column(String(100), ForeignKey("students.reg_no", ondelete="CASCADE"), nullable=False, index=True)
    
    status = Column(
        SQLEnum(ResultStatus, name="result_status_enum", create_type=False),
        nullable=False,
        default=ResultStatus.CLEARED
    )
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    round = relationship("Round", back_populates="results")
    student = relationship("Student", back_populates="round_results")

    __table_args__ = (
        UniqueConstraint("round_id", "student_reg_no", name="uq_round_student_result"),
    )
