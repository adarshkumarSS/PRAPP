import datetime
from sqlalchemy.orm import Session
from app.config import settings
from app.services.auth_service import get_password_hash
from app.models.admin import Admin
from app.models.batch import Batch
from app.models.pr import PR
from app.models.student import Student, PlacementStatus
from app.models.alias import StudentRegAlias, AliasFormatType
from app.models.company import Company
from app.models.round import Round
from app.models.eligibility import Eligibility
from app.models.round_result import RoundResult, ResultStatus
from app.models.offer import Offer, OfferStatus
from app.services.alias_resolver import normalize_token

def init_admin_user(db: Session):
    """Seed initial default admin if no admin exists in the database."""
    admin = db.query(Admin).first()
    if not admin:
        default_admin = Admin(
            name=settings.INITIAL_ADMIN_NAME,
            email=settings.INITIAL_ADMIN_EMAIL,
            password_hash=get_password_hash(settings.INITIAL_ADMIN_PASSWORD)
        )
        db.add(default_admin)
        db.commit()
        db.refresh(default_admin)
        print(f"Created default admin account: {default_admin.email}")
        return default_admin
    return admin

def seed_demo_data(db: Session) -> dict:
    """Populates full demo dataset with Batch 2027 & 2028, PRs, students, aliases, drives, rounds, results, and multi-offers."""
    admin = db.query(Admin).first()
    if not admin:
        admin = init_admin_user(db)

    # 1. Batches
    b2027 = db.query(Batch).filter(Batch.year_label == "2027").first()
    if not b2027:
        b2027 = Batch(year_label="2027", created_by=admin.id)
        db.add(b2027)

    b2028 = db.query(Batch).filter(Batch.year_label == "2028").first()
    if not b2028:
        b2028 = Batch(year_label="2028", created_by=admin.id)
        db.add(b2028)
    
    db.commit()
    db.refresh(b2027)
    db.refresh(b2028)

    # 2. PR Accounts
    pr1 = db.query(PR).filter(PR.email == "pr.arun@placement.edu").first()
    if not pr1:
        pr1 = PR(
            name="Arun Kumar (PR Lead)",
            email="pr.arun@placement.edu",
            password_hash=get_password_hash("PR@2027"),
            batch_id=b2027.id,
            assigned_by=admin.id,
            assigned_at=datetime.datetime.utcnow()
        )
        db.add(pr1)

    pr2 = db.query(PR).filter(PR.email == "pr.priya@placement.edu").first()
    if not pr2:
        pr2 = PR(
            name="Priya Sharma (PR 2027)",
            email="pr.priya@placement.edu",
            password_hash=get_password_hash("PR@2027"),
            batch_id=b2027.id,
            assigned_by=admin.id,
            assigned_at=datetime.datetime.utcnow()
        )
        db.add(pr2)

    pr_unassigned = db.query(PR).filter(PR.email == "pr.new@placement.edu").first()
    if not pr_unassigned:
        pr_unassigned = PR(
            name="Vikram Singh (Unassigned)",
            email="pr.new@placement.edu",
            password_hash=get_password_hash("PR@2027"),
            batch_id=None,
            assigned_by=None
        )
        db.add(pr_unassigned)

    db.commit()
    db.refresh(pr1)
    db.refresh(pr2)

    # 3. Sample Students for Batch 2027 with Multi-Format Aliases
    # Formats: Canonical Reg No, College Reg No (H2442**), Long Numeric (91772442****), Serial (1, 2, 3...)
    sample_students_data = [
        ("23CS001", "Aakash V", "H244201", "917724420001", "1", pr1.id),
        ("23CS002", "Bhavna R", "H244202", "917724420002", "2", pr1.id),
        ("23CS003", "Chirag M", "H244203", "917724420003", "3", pr1.id),
        ("23CS004", "Divya K", "H244204", "917724420004", "4", pr1.id),
        ("23CS005", "Elango S", "H244205", "917724420005", "5", pr1.id),
        ("23CS006", "Farheen A", "H244206", "917724420006", "6", pr2.id),
        ("23CS007", "Gokul N", "H244207", "917724420007", "7", pr2.id),
        ("23CS008", "Harini P", "H244208", "917724420008", "8", pr2.id),
        ("23CS009", "Ishaan G", "H244209", "917724420009", "9", pr2.id),
        ("23CS010", "Janani T", "H244210", "917724420010", "10", pr2.id),
        ("23CS011", "Karthik B", "H244211", "917724420011", "11", pr1.id),
        ("23CS012", "Lavanya S", "H244212", "917724420012", "12", pr1.id),
    ]

    for reg, name, col_reg, long_num, serial_no, pr_id in sample_students_data:
        student = db.query(Student).filter(Student.reg_no == reg).first()
        if not student:
            student = Student(
                reg_no=reg,
                name=name,
                batch_id=b2027.id,
                added_by_pr_id=pr_id,
                placement_status=PlacementStatus.UNPLACED
            )
            db.add(student)
            db.flush()

            # Add aliases
            aliases_to_add = [
                (col_reg, AliasFormatType.COLLEGE_REGNO),
                (long_num, AliasFormatType.LONG_NUMERIC),
                (serial_no, AliasFormatType.SERIAL),
            ]
            for alias_val, f_type in aliases_to_add:
                norm_val = normalize_token(alias_val)
                existing_alias = db.query(StudentRegAlias).filter(StudentRegAlias.alias_value == norm_val).first()
                if not existing_alias:
                    alias_row = StudentRegAlias(
                        student_reg_no=reg,
                        alias_value=norm_val,
                        format_type=f_type
                    )
                    db.add(alias_row)

    db.commit()

    # 4. Companies & Dynamic Rounds
    zoho = db.query(Company).filter(Company.name == "Zoho Corporation", Company.batch_id == b2027.id).first()
    if not zoho:
        zoho = Company(
            name="Zoho Corporation",
            batch_id=b2027.id,
            created_by_pr_id=pr1.id
        )
        db.add(zoho)
        db.flush()

        r1 = Round(company_id=zoho.id, name="Round 1: Online Assessment", sequence=1)
        r2 = Round(company_id=zoho.id, name="Round 2: Basic Programming", sequence=2)
        r3 = Round(company_id=zoho.id, name="Round 3: Advanced Coding & Design", sequence=3)
        r4 = Round(company_id=zoho.id, name="Round 4: HR & Fitment", sequence=4)
        db.add_all([r1, r2, r3, r4])
        db.flush()

    tcs = db.query(Company).filter(Company.name == "TCS Digital / Prime", Company.batch_id == b2027.id).first()
    if not tcs:
        tcs = Company(
            name="TCS Digital / Prime",
            batch_id=b2027.id,
            created_by_pr_id=pr2.id
        )
        db.add(tcs)
        db.flush()

        tr1 = Round(company_id=tcs.id, name="Round 1: National Qualifier Test (NQT)", sequence=1)
        tr2 = Round(company_id=tcs.id, name="Round 2: Technical & Managerial Interview", sequence=2)
        tr3 = Round(company_id=tcs.id, name="Round 3: HR Interview", sequence=3)
        db.add_all([tr1, tr2, tr3])
        db.flush()

    db.commit()

    # 5. Eligibility (all 12 students eligible for Zoho & TCS)
    all_b2027_students = db.query(Student).filter(Student.batch_id == b2027.id).all()
    for s in all_b2027_students:
        for comp in [zoho, tcs]:
            elig = db.query(Eligibility).filter(
                Eligibility.company_id == comp.id,
                Eligibility.student_reg_no == s.reg_no
            ).first()
            if not elig:
                db.add(Eligibility(company_id=comp.id, student_reg_no=s.reg_no, eligible=True))

    db.commit()

    # 6. Round Results for Zoho (R1 Cleared by 8 students, R2 by 5, R3 by 3, R4 by 3)
    zoho_r1 = db.query(Round).filter(Round.company_id == zoho.id, Round.sequence == 1).first()
    zoho_r2 = db.query(Round).filter(Round.company_id == zoho.id, Round.sequence == 2).first()
    zoho_r3 = db.query(Round).filter(Round.company_id == zoho.id, Round.sequence == 3).first()
    zoho_r4 = db.query(Round).filter(Round.company_id == zoho.id, Round.sequence == 4).first()

    zoho_r1_cleared = ["23CS001", "23CS002", "23CS003", "23CS004", "23CS006", "23CS007", "23CS008", "23CS011"]
    for reg in zoho_r1_cleared:
        rr = db.query(RoundResult).filter(RoundResult.round_id == zoho_r1.id, RoundResult.student_reg_no == reg).first()
        if not rr:
            db.add(RoundResult(round_id=zoho_r1.id, student_reg_no=reg, status=ResultStatus.CLEARED))

    zoho_r2_cleared = ["23CS001", "23CS002", "23CS003", "23CS006", "23CS007"]
    for reg in zoho_r2_cleared:
        rr = db.query(RoundResult).filter(RoundResult.round_id == zoho_r2.id, RoundResult.student_reg_no == reg).first()
        if not rr:
            db.add(RoundResult(round_id=zoho_r2.id, student_reg_no=reg, status=ResultStatus.CLEARED))

    zoho_r4_cleared = ["23CS001", "23CS002", "23CS006"]
    for reg in zoho_r4_cleared:
        rr = db.query(RoundResult).filter(RoundResult.round_id == zoho_r4.id, RoundResult.student_reg_no == reg).first()
        if not rr:
            db.add(RoundResult(round_id=zoho_r4.id, student_reg_no=reg, status=ResultStatus.CLEARED))

    # 7. Offers (Zoho + TCS with Dual Offer Demonstration)
    # 23CS001 gets Offer from Zoho (8.4 LPA, is_final=True) and TCS Digital (7.5 LPA, is_final=False) -> Dual Offer!
    # 23CS002 gets Offer from Zoho (8.4 LPA, is_final=True)
    # 23CS006 gets Offer from Zoho (8.4 LPA, is_final=True)
    # 23CS007 gets Offer from TCS Digital (7.5 LPA, is_final=True)
    offers_data = [
        ("23CS001", zoho.id, 8.40, True, OfferStatus.ACCEPTED),
        ("23CS001", tcs.id, 7.50, False, OfferStatus.OFFERED), # Dual offer!
        ("23CS002", zoho.id, 8.40, True, OfferStatus.ACCEPTED),
        ("23CS006", zoho.id, 8.40, True, OfferStatus.ACCEPTED),
        ("23CS007", tcs.id, 7.50, True, OfferStatus.ACCEPTED),
    ]

    for reg, comp_id, pkg, is_fin, off_stat in offers_data:
        off = db.query(Offer).filter(Offer.student_reg_no == reg, Offer.company_id == comp_id).first()
        if not off:
            db.add(Offer(
                student_reg_no=reg,
                company_id=comp_id,
                package_value=pkg,
                offer_date=datetime.date.today(),
                is_final=is_fin,
                status=off_stat
            ))
            # Set student placed
            st = db.query(Student).filter(Student.reg_no == reg).first()
            if st:
                st.placement_status = PlacementStatus.PLACED

    db.commit()
    return {"message": "Demo data populated successfully with 2 Batches, 3 PRs, 12 Students, Aliases, 2 Drives, and Dual Offers."}
