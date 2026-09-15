from app.database import engine, SessionLocal
from sqlalchemy import text
from app.models.student import Student
from app.models.alias import StudentRegAlias, AliasFormatType
from app.models.pr import PR

# 1. Update Database Schema
with engine.connect() as conn:
    conn.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS email VARCHAR(255);"))
    conn.commit()
    try:
        conn.execute(text("ALTER TYPE alias_format_type_enum ADD VALUE IF NOT EXISTS 'EMAIL';"))
        conn.commit()
        print("Added EMAIL to alias_format_type_enum")
    except Exception as e:
        print("Enum alter notice:", e)

# 2. Populate emails for all existing students & create aliases
db = SessionLocal()
students = db.query(Student).all()
prs = {p.id: p for p in db.query(PR).all()}

for s in students:
    if not s.email:
        # If student corresponds to a PR
        if s.added_by_pr_id and s.added_by_pr_id in prs and prs[s.added_by_pr_id].name.lower() in s.name.lower():
            s.email = prs[s.added_by_pr_id].email
        else:
            s.email = f"{s.reg_no.lower()}@tce.edu"
    
    # Check if EMAIL alias already exists
    existing_alias = db.query(StudentRegAlias).filter(
        StudentRegAlias.student_reg_no == s.reg_no,
        StudentRegAlias.format_type == AliasFormatType.EMAIL
    ).first()
    
    if not existing_alias and s.email:
        db.add(StudentRegAlias(
            student_reg_no=s.reg_no,
            alias_value=s.email.lower(),
            format_type=AliasFormatType.EMAIL
        ))

db.commit()
print("Populated student emails and EMAIL aliases successfully.")
db.close()
