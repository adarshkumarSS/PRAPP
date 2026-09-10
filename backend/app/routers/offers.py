import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.database import get_db
from app.models.offer import Offer, OfferStatus
from app.models.student import Student, PlacementStatus
from app.models.company import Company
from app.schemas.offer import OfferCreate, OfferUpdate, OfferResponse
from app.services.auth_service import require_assigned_pr, get_current_user
from app.services.alias_resolver import AliasResolverService, normalize_token

router = APIRouter(prefix="/api/offers", tags=["Offers & Placements"])

def map_offer_response(o: Offer) -> OfferResponse:
    return OfferResponse(
        id=o.id,
        student_reg_no=o.student_reg_no,
        student_name=o.student.name if o.student else None,
        company_id=o.company_id,
        company_name=o.company.name if o.company else "Unknown",
        batch_id=o.student.batch_id if o.student else o.company.batch_id,
        batch_year=o.student.batch.year_label if o.student and o.student.batch else None,
        package_value=float(o.package_value) if o.package_value is not None else None,
        offer_date=o.offer_date,
        is_final=o.is_final,
        status=o.status,
        created_at=o.created_at
    )

@router.get("", response_model=List[OfferResponse])
def get_offers(
    batch_id: Optional[UUID] = None,
    company_id: Optional[UUID] = None,
    student_reg_no: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Offer).join(Student, Student.reg_no == Offer.student_reg_no)

    if current_user["role"] == "PR":
        if current_user.get("batch_id"):
            query = query.filter(Student.batch_id == current_user["batch_id"])
        else:
            return []
    elif batch_id:
        query = query.filter(Student.batch_id == batch_id)

    if company_id:
        query = query.filter(Offer.company_id == company_id)

    if student_reg_no:
        query = query.filter(Offer.student_reg_no == student_reg_no.strip().upper())

    offers = query.order_by(Offer.created_at.desc()).all()
    return [map_offer_response(o) for o in offers]

@router.post("", response_model=OfferResponse, status_code=status.HTTP_201_CREATED)
def create_offer(
    req: OfferCreate,
    current_user: dict = Depends(require_assigned_pr),
    db: Session = Depends(get_db)
):
    # Resolve student token (in case an alias was entered)
    raw_input = req.student_reg_no.strip()
    norm_token = normalize_token(raw_input)
    
    # Try alias or canonical lookup
    res = AliasResolverService.resolve_tokens(
        db=db,
        raw_tokens=[raw_input],
        batch_id=current_user.get("batch_id") if current_user["role"] == "PR" else None,
        record_unrecognized=False
    )

    if not res["matched"]:
        raise HTTPException(status_code=404, detail=f"Student '{raw_input}' could not be resolved.")

    canonical_reg = res["matched"][0]["canonical_reg_no"]
    student = db.query(Student).filter(Student.reg_no == canonical_reg).first()
    if not student:
        raise HTTPException(status_code=404, detail=f"Student '{canonical_reg}' not found.")

    company = db.query(Company).filter(Company.id == req.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")

    # Check if this student already has an offer from this company
    existing_offer = db.query(Offer).filter(
        Offer.student_reg_no == canonical_reg,
        Offer.company_id == req.company_id
    ).first()
    if existing_offer:
        raise HTTPException(status_code=400, detail=f"Student already has an offer recorded for {company.name}.")

    # If is_final is True, uncheck is_final on all other offers for this student
    if req.is_final:
        db.query(Offer).filter(Offer.student_reg_no == canonical_reg).update({"is_final": False})

    # If this is the student's first offer, auto-make is_final True if not specified
    existing_offers_count = db.query(Offer).filter(Offer.student_reg_no == canonical_reg).count()
    is_final_val = req.is_final
    if existing_offers_count == 0 and not req.is_final:
        is_final_val = True

    new_offer = Offer(
        student_reg_no=canonical_reg,
        company_id=req.company_id,
        package_value=req.package_value,
        offer_date=req.offer_date or datetime.date.today(),
        is_final=is_final_val,
        status=req.status
    )
    db.add(new_offer)

    # Automatically set student placement status to PLACED
    student.placement_status = PlacementStatus.PLACED

    db.commit()
    db.refresh(new_offer)
    return map_offer_response(new_offer)

@router.put("/{offer_id}", response_model=OfferResponse)
def update_offer(
    offer_id: UUID,
    req: OfferUpdate,
    current_user: dict = Depends(require_assigned_pr),
    db: Session = Depends(get_db)
):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    if req.package_value is not None:
        offer.package_value = req.package_value
    if req.offer_date is not None:
        offer.offer_date = req.offer_date
    if req.status is not None:
        offer.status = req.status
    if req.is_final is not None:
        if req.is_final:
            # Clear final flag on other offers for this student
            db.query(Offer).filter(
                Offer.student_reg_no == offer.student_reg_no,
                Offer.id != offer.id
            ).update({"is_final": False})
        offer.is_final = req.is_final

    db.commit()
    db.refresh(offer)
    return map_offer_response(offer)

@router.delete("/{offer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_offer(
    offer_id: UUID,
    current_user: dict = Depends(require_assigned_pr),
    db: Session = Depends(get_db)
):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    student_reg = offer.student_reg_no
    db.delete(offer)
    db.flush()

    # Check remaining offers for this student
    remaining_offers = db.query(Offer).filter(Offer.student_reg_no == student_reg).all()
    student = db.query(Student).filter(Student.reg_no == student_reg).first()
    if student:
        if len(remaining_offers) == 0:
            student.placement_status = PlacementStatus.UNPLACED
        else:
            # If deleted offer was final, make the latest one final
            has_final = any(o.is_final for o in remaining_offers)
            if not has_final and len(remaining_offers) > 0:
                remaining_offers[0].is_final = True

    db.commit()
    return None
