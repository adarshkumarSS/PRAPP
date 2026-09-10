from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app.models.batch import Batch
from app.models.pr import PR
from app.models.student import Student, PlacementStatus
from app.schemas.batch import BatchCreate, BatchResponse
from app.services.auth_service import require_admin, get_current_user

router = APIRouter(prefix="/api/batches", tags=["Batches"])

@router.get("", response_model=List[BatchResponse])
def get_batches(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    batches = db.query(Batch).order_by(Batch.year_label.desc()).all()
    results = []
    for b in batches:
        pr_count = db.query(PR).filter(PR.batch_id == b.id).count()
        student_count = db.query(Student).filter(Student.batch_id == b.id).count()
        placed_count = db.query(Student).filter(
            Student.batch_id == b.id,
            Student.placement_status == PlacementStatus.PLACED
        ).count()
        pct = round((placed_count / student_count * 100.0), 1) if student_count > 0 else 0.0

        results.append(BatchResponse(
            id=b.id,
            year_label=b.year_label,
            created_by=b.created_by,
            created_at=b.created_at,
            pr_count=pr_count,
            student_count=student_count,
            placed_student_count=placed_count,
            placement_pct=pct
        ))
    return results

@router.post("", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
def create_batch(
    req: BatchCreate,
    admin_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    clean_label = req.year_label.strip()
    existing = db.query(Batch).filter(Batch.year_label == clean_label).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Batch '{clean_label}' already exists")

    new_batch = Batch(
        year_label=clean_label,
        created_by=admin_user["id"]
    )
    db.add(new_batch)
    db.commit()
    db.refresh(new_batch)

    return BatchResponse(
        id=new_batch.id,
        year_label=new_batch.year_label,
        created_by=new_batch.created_by,
        created_at=new_batch.created_at,
        pr_count=0,
        student_count=0,
        placed_student_count=0,
        placement_pct=0.0
    )

@router.delete("/{batch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_batch(
    batch_id: UUID,
    admin_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    db.delete(batch)
    db.commit()
    return None
