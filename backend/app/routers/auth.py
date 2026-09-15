from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.admin import Admin
from app.models.pr import PR
from app.schemas.auth import LoginRequest, TokenResponse, AdminCreate, UserProfile
from app.services.auth_service import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    email_clean = req.email.lower().strip()
    
    if not email_clean.endswith("@tce.edu"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Access restricted: Only official @tce.edu email addresses are permitted."
        )
    
    # 1. Try Admin first if role_hint is ADMIN or not specified
    if req.role_hint in [None, "ADMIN"]:
        admin = db.query(Admin).filter(Admin.email.ilike(email_clean)).first()
        if admin and verify_password(req.password, admin.password_hash):
            token = create_access_token({"sub": str(admin.id), "role": "ADMIN", "email": admin.email})
            return TokenResponse(
                access_token=token,
                role="ADMIN",
                user_id=str(admin.id),
                name=admin.name,
                email=admin.email,
                batch_id=None,
                batch_year=None
            )

    # 2. Try PR
    if req.role_hint in [None, "PR"]:
        pr = db.query(PR).filter(PR.email.ilike(email_clean)).first()
        if pr and verify_password(req.password, pr.password_hash):
            token = create_access_token({"sub": str(pr.id), "role": "PR", "email": pr.email})
            return TokenResponse(
                access_token=token,
                role="PR",
                user_id=str(pr.id),
                name=pr.name,
                email=pr.email,
                batch_id=str(pr.batch_id) if pr.batch_id else None,
                batch_year=pr.batch.year_label if pr.batch else None
            )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password"
    )

@router.post("/register-admin", response_model=TokenResponse)
def register_admin(req: AdminCreate, db: Session = Depends(get_db)):
    clean_email = req.email.lower().strip()
    if not clean_email.endswith("@tce.edu"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration is restricted to official @tce.edu email addresses only."
        )
    existing = db.query(Admin).filter(Admin.email.ilike(clean_email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Admin with this email already exists")

    new_admin = Admin(
        name=req.name,
        email=clean_email,
        password_hash=get_password_hash(req.password)
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    token = create_access_token({"sub": str(new_admin.id), "role": "ADMIN", "email": new_admin.email})
    return TokenResponse(
        access_token=token,
        role="ADMIN",
        user_id=str(new_admin.id),
        name=new_admin.name,
        email=new_admin.email
    )

@router.get("/me", response_model=UserProfile)
def get_me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user["role"] == "ADMIN":
        admin = db.query(Admin).filter(Admin.id == current_user["id"]).first()
        return UserProfile(
            id=admin.id,
            name=admin.name,
            email=admin.email,
            role="ADMIN",
            created_at=admin.created_at
        )
    else:
        pr = db.query(PR).filter(PR.id == current_user["id"]).first()
        return UserProfile(
            id=pr.id,
            name=pr.name,
            email=pr.email,
            role="PR",
            batch_id=pr.batch_id,
            batch_year=pr.batch.year_label if pr.batch else None,
            created_at=pr.created_at
        )
