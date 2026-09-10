import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class Batch(Base):
    __tablename__ = "batches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    year_label = Column(String(50), unique=True, nullable=False, index=True) # e.g. "2027", "2028"
    created_by = Column(UUID(as_uuid=True), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    creator = relationship("Admin", back_populates="batches_created")
    prs = relationship("PR", back_populates="batch")
    students = relationship("Student", back_populates="batch", cascade="all, delete-orphan")
    companies = relationship("Company", back_populates="batch", cascade="all, delete-orphan")
