from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.database import get_db
from app.models.student import Student
from app.models.alias import StudentRegAlias, AliasFormatType
from app.models.unrecognized_token import UnrecognizedToken
from app.schemas.alias import (
    TokenResolveRequest, TokenResolveResponse, UnrecognizedTokenItem, ResolveTokenManualRequest
)
from app.services.auth_service import get_current_user, require_assigned_pr
from app.services.alias_resolver import AliasResolverService, extract_tokens_from_text, normalize_token

router = APIRouter(prefix="/api/aliases", tags=["Alias Resolution Engine"])

@router.post("/resolve", response_model=TokenResolveResponse)
def resolve_tokens(
    req: TokenResolveRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tokens_to_resolve = []
    if req.tokens:
        tokens_to_resolve.extend(req.tokens)
    if req.raw_text:
        extracted = extract_tokens_from_text(req.raw_text)
        tokens_to_resolve.extend(extracted)

    # Scoping
    target_batch_id = req.batch_id
    if current_user["role"] == "PR" and current_user.get("batch_id"):
        target_batch_id = current_user["batch_id"]

    pr_id = current_user["id"] if current_user["role"] == "PR" else None

    result = AliasResolverService.resolve_tokens(
        db=db,
        raw_tokens=tokens_to_resolve,
        batch_id=target_batch_id,
        source_context=req.source_context,
        pr_id=pr_id,
        record_unrecognized=True
    )
    return result

@router.get("/unrecognized", response_model=List[UnrecognizedTokenItem])
def get_unrecognized_tokens(
    batch_id: Optional[UUID] = None,
    resolved: bool = False,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(UnrecognizedToken).filter(UnrecognizedToken.resolved == resolved)

    if current_user["role"] == "PR":
        query = query.filter(UnrecognizedToken.pr_id == current_user["id"])
    elif batch_id:
        query = query.filter(UnrecognizedToken.batch_id == batch_id)

    records = query.order_by(UnrecognizedToken.created_at.desc()).limit(100).all()
    results = []
    for r in records:
        results.append(UnrecognizedTokenItem(
            id=r.id,
            token_value=r.token_value,
            source_context=r.source_context,
            batch_id=r.batch_id,
            batch_year=r.batch.year_label if hasattr(r, 'batch') and r.batch else None,
            pr_id=r.pr_id,
            pr_name=r.pr.name if hasattr(r, 'pr') and r.pr else None,
            resolved=r.resolved,
            resolved_student_reg_no=r.resolved_student_reg_no,
            created_at=r.created_at
        ))
    return results

@router.post("/unrecognized/{token_id}/resolve")
def resolve_unrecognized_token(
    token_id: UUID,
    req: ResolveTokenManualRequest,
    current_user: dict = Depends(require_assigned_pr),
    db: Session = Depends(get_db)
):
    unrec = db.query(UnrecognizedToken).filter(UnrecognizedToken.id == token_id).first()
    if not unrec:
        raise HTTPException(status_code=404, detail="Unrecognized token record not found")

    if current_user["role"] == "PR" and unrec.pr_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Cannot resolve tokens belonging to another PR queue")

    canonical = req.canonical_reg_no.strip().upper()
    student = db.query(Student).filter(Student.reg_no == canonical).first()
    if not student:
        raise HTTPException(status_code=404, detail=f"Student with canonical reg no '{canonical}' not found")

    if current_user["role"] == "PR" and student.added_by_pr_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Cannot map token to a student managed by another PR")

    norm_token = normalize_token(unrec.token_value)
    # Check if alias already exists
    existing = db.query(StudentRegAlias).filter(StudentRegAlias.alias_value == norm_token).first()
    if not existing:
        new_alias = StudentRegAlias(
            student_reg_no=canonical,
            alias_value=norm_token,
            format_type=req.format_type or AliasFormatType.COLLEGE_REGNO
        )
        db.add(new_alias)

    unrec.resolved = True
    unrec.resolved_student_reg_no = canonical
    db.commit()

    return {"message": f"Token '{unrec.token_value}' successfully resolved and mapped to student '{canonical}'"}
