from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.database import get_db
from app.models.student import Student, PlacementStatus
from app.models.alias import StudentRegAlias, AliasFormatType
from app.models.batch import Batch
from app.models.pr import PR
from app.models.offer import Offer
from app.schemas.student import (
    StudentCreate, BulkStudentUploadRequest, BulkUploadResult, StudentResponse,
    AliasResponse, StudentOfferItem
)
from app.services.auth_service import require_assigned_pr, get_current_user
from app.services.alias_resolver import normalize_token

router = APIRouter(prefix="/api/students", tags=["Students"])

def map_student_response(s: Student) -> StudentResponse:
    aliases_res = [
        AliasResponse(id=a.id, alias_value=a.alias_value, format_type=a.format_type)
        for a in s.aliases
    ]
    offers_res = [
        StudentOfferItem(
            id=o.id,
            company_name=o.company.name if o.company else "Unknown",
            package_value=float(o.package_value) if o.package_value is not None else None,
            is_final=o.is_final,
            status=o.status.value if hasattr(o.status, 'value') else str(o.status)
        )
        for o in s.offers
    ]
    final_offer = next((o for o in s.offers if o.is_final), None)

    return StudentResponse(
        reg_no=s.reg_no,
        name=s.name,
        batch_id=s.batch_id,
        batch_year=s.batch.year_label if s.batch else None,
        added_by_pr_id=s.added_by_pr_id,
        added_by_pr_name=s.added_by_pr.name if s.added_by_pr else None,
        placement_status=s.placement_status,
        created_at=s.created_at,
        aliases=aliases_res,
        offers=offers_res,
        total_offers_count=len(offers_res),
        final_company_name=final_offer.company.name if final_offer and final_offer.company else None,
        final_package=float(final_offer.package_value) if final_offer and final_offer.package_value else None
    )

@router.get("", response_model=List[StudentResponse])
def get_students(
    batch_id: Optional[UUID] = None,
    pr_id: Optional[UUID] = None,
    placement_status: Optional[PlacementStatus] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Student)

    # Scoping: PR only sees their own assigned students
    if current_user["role"] == "PR":
        query = query.filter(Student.added_by_pr_id == current_user["id"])
    elif current_user["role"] == "ADMIN":
        # Admin can view all or filter by batch_id / pr_id
        if batch_id:
            query = query.filter(Student.batch_id == batch_id)
        if pr_id:
            query = query.filter(Student.added_by_pr_id == pr_id)

    if placement_status:
        query = query.filter(Student.placement_status == placement_status)

    if search:
        search_norm = normalize_token(search)
        # Search by name, reg_no, or alias
        query = query.join(Student.aliases, isouter=True).filter(
            Student.reg_no.ilike(f"%{search.strip()}%") |
            Student.name.ilike(f"%{search.strip()}%") |
            StudentRegAlias.alias_value.ilike(f"%{search_norm}%")
        ).distinct()

    students = query.order_by(Student.reg_no.asc()).all()
    return [map_student_response(s) for s in students]

@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    req: StudentCreate,
    current_user: dict = Depends(require_assigned_pr),
    db: Session = Depends(get_db)
):
    canonical = req.reg_no.strip().upper() if req.reg_no else None
    if not canonical:
        raise HTTPException(status_code=400, detail="Canonical Registration Number is required")

    # Determine batch_id & pr_id
    if current_user["role"] == "PR":
        target_batch_id = current_user["batch_id"]
        pr_id = current_user["id"]
    elif current_user["role"] == "ADMIN":
        if not req.batch_id:
            raise HTTPException(status_code=400, detail="batch_id is required when Admin creates a student")
        target_batch_id = req.batch_id
        pr_id = None

    batch = db.query(Batch).filter(Batch.id == target_batch_id).first()
    if not batch:
        raise HTTPException(status_code=400, detail="Target batch does not exist")

    existing = db.query(Student).filter(Student.reg_no == canonical).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Student with registration number '{canonical}' already exists")

    student = Student(
        reg_no=canonical,
        name=req.name.strip() if req.name else None,
        batch_id=target_batch_id,
        added_by_pr_id=pr_id,
        placement_status=PlacementStatus.UNPLACED
    )
    db.add(student)
    db.flush()

    # Process Aliases
    aliases_to_insert = []
    if req.college_regno:
        aliases_to_insert.append((req.college_regno, AliasFormatType.COLLEGE_REGNO))
    if req.long_numeric:
        aliases_to_insert.append((req.long_numeric, AliasFormatType.LONG_NUMERIC))
    if req.serial:
        aliases_to_insert.append((req.serial, AliasFormatType.SERIAL))

    for raw_alias, f_type in aliases_to_insert:
        norm_alias = normalize_token(raw_alias)
        if norm_alias and norm_alias != canonical:
            existing_alias = db.query(StudentRegAlias).filter(
                StudentRegAlias.alias_value == norm_alias
            ).first()
            if not existing_alias:
                alias_entry = StudentRegAlias(
                    student_reg_no=canonical,
                    alias_value=norm_alias,
                    format_type=f_type
                )
                db.add(alias_entry)
            elif existing_alias.student_reg_no != canonical:
                raise HTTPException(
                    status_code=400,
                    detail=f"Alias '{raw_alias}' is already linked to another student ({existing_alias.student_reg_no})"
                )

    db.commit()
    db.refresh(student)
    return map_student_response(student)

@router.post("/bulk", response_model=BulkUploadResult)
def bulk_add_students(
    req: BulkStudentUploadRequest,
    current_user: dict = Depends(require_assigned_pr),
    db: Session = Depends(get_db)
):
    # Determine batch_id
    target_batch_id = None
    pr_id = None

    if current_user["role"] == "PR":
        target_batch_id = current_user["batch_id"]
        pr_id = current_user["id"]
    elif current_user["role"] == "ADMIN":
        if not req.batch_id:
            raise HTTPException(status_code=400, detail="batch_id is required when Admin uploads students")
        target_batch_id = req.batch_id
        pr_id = None

    batch = db.query(Batch).filter(Batch.id == target_batch_id).first()
    if not batch:
        raise HTTPException(status_code=400, detail="Target batch does not exist")

    added_count = 0
    skipped_count = 0
    aliases_count = 0
    errors: List[str] = []

    for item in req.students:
        canonical = item.reg_no.strip().upper() if item.reg_no else None
        if not canonical:
            skipped_count += 1
            continue

        # Check if student exists
        student = db.query(Student).filter(Student.reg_no == canonical).first()
        if not student:
            student = Student(
                reg_no=canonical,
                name=item.name.strip() if item.name else None,
                batch_id=target_batch_id,
                added_by_pr_id=pr_id,
                placement_status=PlacementStatus.UNPLACED
            )
            db.add(student)
            db.flush()
            added_count += 1
        else:
            # Update name if provided
            if item.name:
                student.name = item.name.strip()
            skipped_count += 1

        # Process Aliases
        aliases_to_insert = []
        if item.college_regno:
            aliases_to_insert.append((item.college_regno, AliasFormatType.COLLEGE_REGNO))
        if item.long_numeric:
            aliases_to_insert.append((item.long_numeric, AliasFormatType.LONG_NUMERIC))
        if item.serial:
            aliases_to_insert.append((item.serial, AliasFormatType.SERIAL))

        for raw_alias, f_type in aliases_to_insert:
            norm_alias = normalize_token(raw_alias)
            if norm_alias and norm_alias != canonical:
                existing_alias = db.query(StudentRegAlias).filter(
                    StudentRegAlias.alias_value == norm_alias
                ).first()
                if not existing_alias:
                    alias_entry = StudentRegAlias(
                        student_reg_no=canonical,
                        alias_value=norm_alias,
                        format_type=f_type
                    )
                    db.add(alias_entry)
                    aliases_count += 1
                elif existing_alias.student_reg_no != canonical:
                    errors.append(f"Alias '{raw_alias}' is already linked to student '{existing_alias.student_reg_no}'")

    db.commit()

    return BulkUploadResult(
        added_count=added_count,
        skipped_count=skipped_count,
        aliases_created_count=aliases_count,
        errors=errors
    )

@router.get("/{reg_no}", response_model=StudentResponse)
def get_student_by_reg_no(
    reg_no: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.reg_no == reg_no.strip().upper()).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if current_user["role"] == "PR" and student.added_by_pr_id != current_user["id"]:
        raise HTTPException(status_code=404, detail="Student not found in your assigned candidates")
    return map_student_response(student)

@router.delete("/{reg_no}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    reg_no: str,
    current_user: dict = Depends(require_assigned_pr),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.reg_no == reg_no.strip().upper()).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # If PR, verify ownership
    if current_user["role"] == "PR" and student.added_by_pr_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Cannot delete candidate managed by another PR")

    db.delete(student)
    db.commit()
    return None
