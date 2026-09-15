from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.models.round import Round
from app.models.round_result import RoundResult, ResultStatus
from app.models.eligibility import Eligibility
from app.models.student import Student
from app.schemas.round_result import (
    RoundResultCommitRequest, RoundResultDiffResponse, RoundResultDiffItem, RoundResultResponse
)
from app.schemas.alias import TokenResolveRequest
from app.services.auth_service import require_assigned_pr, get_current_user
from app.services.alias_resolver import AliasResolverService, extract_tokens_from_text

router = APIRouter(prefix="/api/rounds", tags=["Round Results & Paste Box"])

@router.get("/{round_id}/results", response_model=List[RoundResultResponse])
def get_round_results(
    round_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    round_obj = db.query(Round).filter(Round.id == round_id).first()
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")

    query = db.query(RoundResult).filter(RoundResult.round_id == round_id)
    if current_user["role"] == "PR":
        query = query.join(Student, Student.reg_no == RoundResult.student_reg_no).filter(Student.added_by_pr_id == current_user["id"])

    results = query.all()
    return [
        RoundResultResponse(
            id=r.id,
            round_id=r.round_id,
            student_reg_no=r.student_reg_no,
            student_name=r.student.name if r.student else None,
            status=r.status,
            updated_at=r.updated_at
        )
        for r in results
    ]

@router.post("/{round_id}/diff", response_model=RoundResultDiffResponse)
def preview_round_results_diff(
    round_id: UUID,
    req: TokenResolveRequest,
    current_user: dict = Depends(require_assigned_pr),
    db: Session = Depends(get_db)
):
    round_obj = db.query(Round).filter(Round.id == round_id).first()
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")

    company = round_obj.company
    tokens_to_resolve = []
    if req.tokens:
        tokens_to_resolve.extend(req.tokens)
    if req.raw_text:
        extracted = extract_tokens_from_text(req.raw_text)
        tokens_to_resolve.extend(extracted)

    pr_id = current_user["id"] if current_user["role"] == "PR" else None

    # Resolve tokens using AliasResolverService (scoped to PR if PR role)
    resolved = AliasResolverService.resolve_tokens(
        db=db,
        raw_tokens=tokens_to_resolve,
        batch_id=company.batch_id,
        source_context=f"Paste Box: {company.name} -> {round_obj.name}",
        pr_id=pr_id
    )

    # Existing results for this round (scoped if PR)
    ex_query = db.query(RoundResult).filter(RoundResult.round_id == round_id)
    if pr_id:
        ex_query = ex_query.join(Student, Student.reg_no == RoundResult.student_reg_no).filter(Student.added_by_pr_id == pr_id)
    existing_results = {r.student_reg_no: r.status for r in ex_query.all()}

    # Eligibility map (scoped if PR)
    el_query = db.query(Eligibility).filter(Eligibility.company_id == company.id)
    if pr_id:
        el_query = el_query.join(Student, Student.reg_no == Eligibility.student_reg_no).filter(Student.added_by_pr_id == pr_id)
    eligibility_map = {e.student_reg_no: e.eligible for e in el_query.all()}

    diff_items: List[RoundResultDiffItem] = []
    newly_cleared_count = 0
    already_cleared_count = 0
    not_cleared_count = 0
    absent_count = 0

    seen_reg_nos = set()

    for item in resolved["matched"]:
        reg_no = item["canonical_reg_no"]
        if reg_no in seen_reg_nos:
            continue
        seen_reg_nos.add(reg_no)

        prev_stat = existing_results.get(reg_no)
        is_change = prev_stat != ResultStatus.CLEARED
        is_elig = eligibility_map.get(reg_no, True)

        if prev_stat == ResultStatus.CLEARED:
            already_cleared_count += 1
        else:
            newly_cleared_count += 1

        diff_items.append(RoundResultDiffItem(
            student_reg_no=reg_no,
            student_name=item["student_name"],
            input_token=item["raw_token"],
            format_type=item["format_type"],
            previous_status=prev_stat,
            new_status=ResultStatus.CLEARED,
            is_change=is_change,
            is_eligible=is_elig
        ))

    return RoundResultDiffResponse(
        round_id=round_obj.id,
        round_name=round_obj.name,
        company_name=company.name,
        total_input_tokens=len(tokens_to_resolve),
        matched_count=len(diff_items),
        unrecognized_count=len(resolved["unrecognized"]),
        unrecognized_tokens=resolved["unrecognized"],
        diff_items=diff_items,
        newly_cleared_count=newly_cleared_count,
        already_cleared_count=already_cleared_count,
        not_cleared_count=not_cleared_count,
        absent_count=absent_count
    )

@router.post("/{round_id}/commit")
def commit_round_results(
    round_id: UUID,
    req: RoundResultCommitRequest,
    current_user: dict = Depends(require_assigned_pr),
    db: Session = Depends(get_db)
):
    round_obj = db.query(Round).filter(Round.id == round_id).first()
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")

    committed_count = 0
    for item in req.results:
        canonical_reg = item.student_reg_no.strip().upper()
        # Verify student exists and belongs to this PR if PR role
        student = db.query(Student).filter(Student.reg_no == canonical_reg).first()
        if not student:
            continue

        if current_user["role"] == "PR" and student.added_by_pr_id != current_user["id"]:
            continue # Cannot modify results of another PR's candidate

        result_row = db.query(RoundResult).filter(
            RoundResult.round_id == round_id,
            RoundResult.student_reg_no == canonical_reg
        ).first()

        if not result_row:
            result_row = RoundResult(
                round_id=round_id,
                student_reg_no=canonical_reg,
                status=item.status,
                updated_at=datetime.utcnow()
            )
            db.add(result_row)
        else:
            result_row.status = item.status
            result_row.updated_at = datetime.utcnow()

        committed_count += 1

    db.commit()

    return {
        "message": f"Successfully recorded {committed_count} student results for {round_obj.name}.",
        "committed_count": committed_count
    }
