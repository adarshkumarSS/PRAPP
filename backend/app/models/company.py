import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, index=True)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("batches.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by_pr_id = Column(UUID(as_uuid=True), ForeignKey("prs.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    batch = relationship("Batch", back_populates="companies")
    created_by_pr = relationship("PR", back_populates="companies_created")
    rounds = relationship("Round", back_populates="company", cascade="all, delete-orphan", order_by="Round.sequence")
    eligibilities = relationship("Eligibility", back_populates="company", cascade="all, delete-orphan")
    offers = relationship("Offer", back_populates="company", cascade="all, delete-orphan")
