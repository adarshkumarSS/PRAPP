from sqlalchemy import Column, String, Boolean, ForeignKey, PrimaryKeyConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class Eligibility(Base):
    __tablename__ = "eligibility"

    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    student_reg_no = Column(String(100), ForeignKey("students.reg_no", ondelete="CASCADE"), nullable=False, primary_key=True)
    eligible = Column(Boolean, nullable=False, default=True) # Denominator for every clear % metric

    # Relationships
    company = relationship("Company", back_populates="eligibilities")
    student = relationship("Student", back_populates="eligibilities")

    __table_args__ = (
        PrimaryKeyConstraint("company_id", "student_reg_no"),
    )
