import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class AliasFormatType(str, enum.Enum):
    COLLEGE_REGNO = "COLLEGE_REGNO"  # e.g. H2442**
    LONG_NUMERIC = "LONG_NUMERIC"    # e.g. 91772442****
    SERIAL = "SERIAL"                # e.g. 1, 2, 3...

class StudentRegAlias(Base):
    __tablename__ = "student_reg_aliases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_reg_no = Column(String(100), ForeignKey("students.reg_no", ondelete="CASCADE"), nullable=False, index=True)
    
    # Normalized alias string (stripped of hyphens, spaces, uppercase)
    alias_value = Column(String(150), unique=True, nullable=False, index=True)
    
    format_type = Column(
        SQLEnum(AliasFormatType, name="alias_format_type_enum", create_type=False),
        nullable=False,
        default=AliasFormatType.COLLEGE_REGNO
    )
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("Student", back_populates="aliases")

    __table_args__ = (
        Index("idx_alias_value_normalized", "alias_value"),
    )
