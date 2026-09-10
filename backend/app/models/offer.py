import uuid
import enum
from datetime import datetime, date
from sqlalchemy import Column, String, DateTime, Date, Numeric, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class OfferStatus(str, enum.Enum):
    OFFERED = "OFFERED"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"

class Offer(Base):
    __tablename__ = "offers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_reg_no = Column(String(100), ForeignKey("students.reg_no", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    
    package_value = Column(Numeric(10, 2), nullable=True) # CTC in LPA, e.g. 8.50
    offer_date = Column(Date, default=date.today, nullable=False)
    is_final = Column(Boolean, default=False, nullable=False) # exactly one true per student counts as "the" placement
    
    status = Column(
        SQLEnum(OfferStatus, name="offer_status_enum", create_type=False),
        nullable=False,
        default=OfferStatus.OFFERED
    )
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("Student", back_populates="offers")
    company = relationship("Company", back_populates="offers")
