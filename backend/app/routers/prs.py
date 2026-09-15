import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app.models.pr import PR
from app.models.batch import Batch
from app.models.admin import Admin
from app.models.student import Student, PlacementStatus
from app.models.company import Company
from app.models.audit_log import AuditLog
from app.schemas.pr import PRCreate, PRAssignBatch, PRResponse
from app.services.auth_service import require_admin, get_password_hash, get_current_user

router = APIRouter(prefix="/api/prs", tags=["PR Management"])

@router.get("", response_model=List[PRResponse])
def get_prs(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    prs = db.query(PR).all()
    results = []
    for p in prs:
        student_count = db.query(Student).filter(Student.added_by_pr_id == p.id).count()
        placed_count = db.query(Student).filter(
            Student.added_by_pr_id == p.id,
            Student.placement_status == PlacementStatus.PLACED
        ).count()
        pct = round((placed_count / student_count * 100.0), 1) if student_count > 0 else 0.0

        results.append(PRResponse(
            id=p.id,
            name=p.name,
            email=p.email,
            batch_id=p.batch_id,
            batch_year=p.batch.year_label if p.batch else None,
            assigned_by=p.assigned_by,
            assigned_by_name=p.assigner.name if p.assigner else None,
            assigned_at=p.assigned_at,
            created_at=p.created_at,
            students_count=student_count,
            placed_count=placed_count,
            placement_pct=pct
        ))
    return results

@router.post("", response_model=PRResponse, status_code=status.HTTP_201_CREATED)
def create_pr(
    req: PRCreate,
    admin_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    clean_email = req.email.lower().strip()
    if not clean_email.endswith("@tce.edu"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PR registration is restricted to official @tce.edu email addresses only."
        )
    existing = db.query(PR).filter(PR.email == clean_email).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"PR with email '{clean_email}' already exists")

    assigned_batch = None
    if req.batch_id:
        assigned_batch = db.query(Batch).filter(Batch.id == req.batch_id).first()
        if not assigned_batch:
            raise HTTPException(status_code=400, detail="Specified batch does not exist")

    new_pr = PR(
        name=req.name.strip(),
        email=clean_email,
        password_hash=get_password_hash(req.password),
        batch_id=req.batch_id,
        assigned_by=admin_user["id"] if req.batch_id else None,
        assigned_at=datetime.datetime.utcnow() if req.batch_id else None
    )
    db.add(new_pr)
    db.flush()

    # Log audit
    audit = AuditLog(
        actor_id=admin_user["id"],
        actor_name=admin_user["name"],
        actor_role="ADMIN",
        action="CREATE_PR",
        target_type="PR",
        target_id=str(new_pr.id),
        details=f"Created PR account '{new_pr.name}' ({new_pr.email}) assigned to Batch {assigned_batch.year_label if assigned_batch else 'None'}"
    )
    db.add(audit)
    db.commit()
    db.refresh(new_pr)

    return PRResponse(
        id=new_pr.id,
        name=new_pr.name,
        email=new_pr.email,
        batch_id=new_pr.batch_id,
        batch_year=new_pr.batch.year_label if new_pr.batch else None,
        assigned_by=new_pr.assigned_by,
        assigned_by_name=admin_user["name"] if new_pr.assigned_by else None,
        assigned_at=new_pr.assigned_at,
        created_at=new_pr.created_at,
        students_count=0,
        placed_count=0,
        placement_pct=0.0
    )

@router.put("/{pr_id}/assign-batch", response_model=PRResponse)
def assign_batch_to_pr(
    pr_id: UUID,
    req: PRAssignBatch,
    admin_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    pr = db.query(PR).filter(PR.id == pr_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="PR account not found")

    prev_batch_year = pr.batch.year_label if pr.batch else "None"

    if req.batch_id:
        batch = db.query(Batch).filter(Batch.id == req.batch_id).first()
        if not batch:
            raise HTTPException(status_code=400, detail="Target batch not found")
        pr.batch_id = batch.id
        pr.assigned_by = admin_user["id"]
        pr.assigned_at = datetime.datetime.utcnow()
        new_batch_year = batch.year_label
    else:
        pr.batch_id = None
        pr.assigned_by = admin_user["id"]
        pr.assigned_at = datetime.datetime.utcnow()
        new_batch_year = "Unassigned"

    # Audit log entry for PR batch assignment
    audit = AuditLog(
        actor_id=admin_user["id"],
        actor_name=admin_user["name"],
        actor_role="ADMIN",
        action="ASSIGN_BATCH",
        target_type="PR",
        target_id=str(pr.id),
        details=f"Admin reassigned PR '{pr.name}' from Batch '{prev_batch_year}' to Batch '{new_batch_year}'"
    )
    db.add(audit)
    db.commit()
    db.refresh(pr)

    student_count = db.query(Student).filter(Student.added_by_pr_id == pr.id).count()
    placed_count = db.query(Student).filter(
        Student.added_by_pr_id == pr.id,
        Student.placement_status == PlacementStatus.PLACED
    ).count()

    return PRResponse(
        id=pr.id,
        name=pr.name,
        email=pr.email,
        batch_id=pr.batch_id,
        batch_year=pr.batch.year_label if pr.batch else None,
        assigned_by=pr.assigned_by,
        assigned_by_name=admin_user["name"],
        assigned_at=pr.assigned_at,
        created_at=pr.created_at,
        students_count=student_count,
        placed_count=placed_count,
        placement_pct=round((placed_count / student_count * 100.0), 1) if student_count > 0 else 0.0
    )

@router.delete("/{pr_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pr(
    pr_id: UUID,
    admin_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    pr = db.query(PR).filter(PR.id == pr_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="PR account not found")

    pr_name = pr.name
    pr_email = pr.email

    # Detach students and companies added by this PR
    db.query(Student).filter(Student.added_by_pr_id == pr_id).update({Student.added_by_pr_id: None})
    db.query(Company).filter(Company.created_by_pr_id == pr_id).update({Company.created_by_pr_id: None})

    # Log audit entry
    audit = AuditLog(
        actor_id=admin_user["id"],
        actor_name=admin_user["name"],
        actor_role="ADMIN",
        action="DELETE_PR",
        target_type="PR",
        target_id=str(pr.id),
        details=f"Admin deleted PR coordinator account '{pr_name}' ({pr_email})"
    )
    db.add(audit)

    db.delete(pr)
    db.commit()
    return None
