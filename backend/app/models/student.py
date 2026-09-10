import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class PlacementStatus(str, enum.Enum):
    UNPLACED = "UNPLACED"
    PLACED = "PLACED"

class Student(Base):
    __tablename__ = "students"

    # Canonical normalized Reg No as PK (e.g. "21CS001" or "H2442AB")
    reg_no = Column(String(100), primary_key=True, index=True)
    name = Column(String(255), nullable=True)
    
    batch_id = Column(UUID(as_uuid=True), ForeignKey("batches.id", ondelete="CASCADE"), nullable=False, index=True)
    added_by_pr_id = Column(UUID(as_uuid=True), ForeignKey("prs.id", ondelete="SET NULL"), nullable=True, index=True)
    
    placement_status = Column(
        SQLEnum(PlacementStatus, name="placement_status_enum", create_type=False),
        default=PlacementStatus.UNPLACED,
        nullable=False,
        index=True
    )
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    batch = relationship("Batch", back_populates="students")
    added_by_pr = relationship("PR", back_populates="students_added")
    aliases = relationship("StudentRegAlias", back_populates="student", cascade="all, delete-orphan")
    eligibilities = relationship("Eligibility", back_populates="student", cascade="all, delete-orphan")
    round_results = relationship("RoundResult", back_populates="student", cascade="all, delete-orphan")
    offers = relationship("Offer", back_populates="student", cascade="all, delete-orphan")
