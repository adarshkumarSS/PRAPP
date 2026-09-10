import uuid
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class Round(Base):
    __tablename__ = "rounds"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False) # e.g. "Online Assessment", "Technical Interview", "HR"
    sequence = Column(Integer, nullable=False, default=1) # 1, 2, 3... drives funnel order

    # Relationships
    company = relationship("Company", back_populates="rounds")
    results = relationship("RoundResult", back_populates="round", cascade="all, delete-orphan")
