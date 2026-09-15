from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.database import get_db
from app.models.company import Company
from app.models.round import Round
from app.models.round_result import RoundResult, ResultStatus
from app.models.eligibility import Eligibility
from app.models.student import Student
from app.models.batch import Batch
from app.models.offer import Offer
from app.schemas.company import (
    CompanyCreate, CompanyUpdate, CompanyResponse, RoundCreate, RoundResponse,
    EligibilityBulkRequest, EligibilityStudentItem
)
from app.services.auth_service import require_assigned_pr, get_current_user
from app.services.alias_resolver import AliasResolverService, extract_tokens_from_text

router = APIRouter(prefix="/api/companies", tags=["Companies & Drives"])

def map_company_response(c: Company, db: Session, pr_id: Optional[UUID] = None) -> CompanyResponse:
    rounds_res = []
    for r in c.rounds:
        cleared_q = db.query(RoundResult).filter(RoundResult.round_id == r.id, RoundResult.status == ResultStatus.CLEARED)
        not_cleared_q = db.query(RoundResult).filter(RoundResult.round_id == r.id, RoundResult.status == ResultStatus.NOT_CLEARED)
        absent_q = db.query(RoundResult).filter(RoundResult.round_id == r.id, RoundResult.status == ResultStatus.ABSENT)

        if pr_id:
            cleared_q = cleared_q.join(Student, Student.reg_no == RoundResult.student_reg_no).filter(Student.added_by_pr_id == pr_id)
            not_cleared_q = not_cleared_q.join(Student, Student.reg_no == RoundResult.student_reg_no).filter(Student.added_by_pr_id == pr_id)
            absent_q = absent_q.join(Student, Student.reg_no == RoundResult.student_reg_no).filter(Student.added_by_pr_id == pr_id)

        rounds_res.append(RoundResponse(
            id=r.id,
            company_id=r.company_id,
            name=r.name,
            sequence=r.sequence,
            cleared_count=cleared_q.count(),
            not_cleared_count=not_cleared_q.count(),
            absent_count=absent_q.count()
        ))

    elig_q = db.query(Eligibility).filter(Eligibility.company_id == c.id, Eligibility.eligible == True)
    off_q = db.query(Offer).filter(Offer.company_id == c.id)

    if pr_id:
        elig_q = elig_q.join(Student, Student.reg_no == Eligibility.student_reg_no).filter(Student.added_by_pr_id == pr_id)
        off_q = off_q.join(Student, Student.reg_no == Offer.student_reg_no).filter(Student.added_by_pr_id == pr_id)

    eligible_count = elig_q.count()
    offers_count = off_q.count()
    
    # R1 Clear %
    r1 = next((r for r in c.rounds if r.sequence == 1), None)
    r1_pct = 0.0
    if r1 and eligible_count > 0:
        r1_cleared_q = db.query(RoundResult).filter(RoundResult.round_id == r1.id, RoundResult.status == ResultStatus.CLEARED)
        if pr_id:
            r1_cleared_q = r1_cleared_q.join(Student, Student.reg_no == RoundResult.student_reg_no).filter(Student.added_by_pr_id == pr_id)
        r1_pct = round((r1_cleared_q.count() / eligible_count * 100.0), 1)

    return CompanyResponse(
        id=c.id,
        name=c.name,
        batch_id=c.batch_id,
        batch_year=c.batch.year_label if c.batch else None,
        created_by_pr_id=c.created_by_pr_id,
        created_by_pr_name=c.created_by_pr.name if c.created_by_pr else None,
        created_at=c.created_at,
        rounds=rounds_res,
        eligible_count=eligible_count,
        offers_count=offers_count,
        r1_clear_pct=r1_pct
    )

@router.get("", response_model=List[CompanyResponse])
def get_companies(
    batch_id: Optional[UUID] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Company)
    pr_id = None
    if current_user["role"] == "PR":
        pr_id = current_user["id"]
        if current_user.get("batch_id"):
            query = query.filter(Company.batch_id == current_user["batch_id"])
        else:
            return []
    elif batch_id:
        query = query.filter(Company.batch_id == batch_id)

    companies = query.order_by(Company.created_at.desc()).all()
    return [map_company_response(c, db, pr_id=pr_id) for c in companies]

@router.post("", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(
    req: CompanyCreate,
    current_user: dict = Depends(require_assigned_pr),
    db: Session = Depends(get_db)
):
    target_batch_id = current_user["batch_id"] if current_user["role"] == "PR" else req.batch_id
    if not target_batch_id:
        raise HTTPException(status_code=400, detail="Target batch is required")

    batch = db.query(Batch).filter(Batch.id == target_batch_id).first()
    if not batch:
        raise HTTPException(status_code=400, detail="Batch does not exist")

    new_comp = Company(
        name=req.name.strip(),
        batch_id=target_batch_id,
        created_by_pr_id=current_user["id"] if current_user["role"] == "PR" else None
    )
    db.add(new_comp)
    db.flush()

    # Add default rounds if none provided
    rounds_to_create = req.rounds or [
        RoundCreate(name="Round 1: Online Assessment", sequence=1),
        RoundCreate(name="Round 2: Technical Interview", sequence=2),
        RoundCreate(name="Round 3: HR Interview", sequence=3)
    ]

    for idx, r_item in enumerate(rounds_to_create, start=1):
        round_row = Round(
            company_id=new_comp.id,
            name=r_item.name.strip(),
            sequence=r_item.sequence or idx
        )
        db.add(round_row)

    # Auto-make all students in batch eligible by default
    all_batch_students = db.query(Student).filter(Student.batch_id == target_batch_id).all()
    for s in all_batch_students:
        db.add(Eligibility(company_id=new_comp.id, student_reg_no=s.reg_no, eligible=True))

    db.commit()
    db.refresh(new_comp)
    return map_company_response(new_comp, db)

@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(
    company_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company drive not found")
    pr_id = current_user["id"] if current_user["role"] == "PR" else None
    return map_company_response(company, db, pr_id=pr_id)

@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(
    company_id: UUID,
    current_user: dict = Depends(require_assigned_pr),
    db: Session = Depends(get_db)
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company drive not found")
    db.delete(company)
    db.commit()
    return None

@router.post("/{company_id}/rounds", response_model=RoundResponse)
def add_round_to_company(
    company_id: UUID,
    req: RoundCreate,
    current_user: dict = Depends(require_assigned_pr),
    db: Session = Depends(get_db)
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company drive not found")

    new_round = Round(
        company_id=company.id,
        name=req.name.strip(),
        sequence=req.sequence
    )
    db.add(new_round)
    db.commit()
    db.refresh(new_round)

    return RoundResponse(
        id=new_round.id,
        company_id=new_round.company_id,
        name=new_round.name,
        sequence=new_round.sequence,
        cleared_count=0,
        not_cleared_count=0,
        absent_count=0
    )

@router.get("/{company_id}/eligibility", response_model=List[EligibilityStudentItem])
def get_company_eligibility(
    company_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Scoping: If PR, only return their assigned students
    student_q = db.query(Student).filter(Student.batch_id == company.batch_id)
    if current_user["role"] == "PR":
        student_q = student_q.filter(Student.added_by_pr_id == current_user["id"])

    batch_students = student_q.order_by(Student.reg_no.asc()).all()
    results = []
    for s in batch_students:
        elig = db.query(Eligibility).filter(
            Eligibility.company_id == company_id,
            Eligibility.student_reg_no == s.reg_no
        ).first()
        is_elig = elig.eligible if elig else False
        results.append(EligibilityStudentItem(
            student_reg_no=s.reg_no,
            student_name=s.name,
            batch_year=s.batch.year_label if s.batch else None,
            eligible=is_elig
        ))
    return results

@router.post("/{company_id}/eligibility/bulk")
def update_company_eligibility_bulk(
    company_id: UUID,
    req: EligibilityBulkRequest,
    current_user: dict = Depends(require_assigned_pr),
    db: Session = Depends(get_db)
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Resolve tokens first
    resolved_info = AliasResolverService.resolve_tokens(
        db=db,
        raw_tokens=req.student_reg_nos,
        batch_id=company.batch_id,
        source_context=f"Company Eligibility: {company.name}",
        pr_id=current_user["id"] if current_user["role"] == "PR" else None
    )

    matched_canonical = {item["canonical_reg_no"] for item in resolved_info["matched"]}

    updated_count = 0
    for reg_no in matched_canonical:
        elig = db.query(Eligibility).filter(
            Eligibility.company_id == company_id,
            Eligibility.student_reg_no == reg_no
        ).first()
        if not elig:
            elig = Eligibility(company_id=company_id, student_reg_no=reg_no, eligible=req.eligible)
            db.add(elig)
        else:
            elig.eligible = req.eligible
        updated_count += 1

    db.commit()

    return {
        "message": f"Updated eligibility for {updated_count} students.",
        "matched_count": len(matched_canonical),
        "unrecognized_tokens": resolved_info["unrecognized"]
    }
