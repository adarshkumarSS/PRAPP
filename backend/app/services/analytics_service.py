from typing import Dict, Any, Optional, List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, case, and_

from app.models.student import Student, PlacementStatus
from app.models.offer import Offer
from app.models.batch import Batch
from app.models.pr import PR
from app.models.company import Company
from app.models.round import Round
from app.models.round_result import RoundResult, ResultStatus
from app.models.eligibility import Eligibility

class AnalyticsService:
    @staticmethod
    def get_dashboard_summary(
        db: Session,
        batch_id: Optional[UUID] = None,
        pr_id: Optional[UUID] = None,
        scope: str = "GLOBAL"
    ) -> Dict[str, Any]:
        """
        Calculates dual-offer-aware placement dashboard metrics according to Architecture v2 specs.
        """
        # Base query for students
        students_query = db.query(Student)
        if batch_id:
            students_query = students_query.filter(Student.batch_id == batch_id)
        if pr_id:
            students_query = students_query.filter(Student.added_by_pr_id == pr_id)

        total_students = students_query.count()

        # Unique students placed (Headline metric)
        placed_students_query = students_query.filter(Student.placement_status == PlacementStatus.PLACED)
        unique_placed = placed_students_query.count()
        unplaced_students = max(0, total_students - unique_placed)

        # Placement %
        placement_pct = round((unique_placed / total_students * 100.0), 1) if total_students > 0 else 0.0

        # Offers query scoped
        offers_query = db.query(Offer).join(Student, Student.reg_no == Offer.student_reg_no)
        if batch_id:
            offers_query = offers_query.filter(Student.batch_id == batch_id)
        if pr_id:
            offers_query = offers_query.filter(Student.added_by_pr_id == pr_id)

        total_offers = offers_query.count()

        # Multi-offer students count (students holding > 1 offer)
        multi_offer_subquery = (
            offers_query.with_entities(Offer.student_reg_no, func.count(Offer.id).label("offer_count"))
            .group_by(Offer.student_reg_no)
            .having(func.count(Offer.id) > 1)
            .subquery()
        )
        multi_offer_students = db.query(func.count()).select_from(multi_offer_subquery).scalar() or 0

        # CTC Packages stats
        pkg_stats = (
            offers_query.filter(Offer.package_value.isnot(None))
            .with_entities(
                func.avg(Offer.package_value).label("avg_pkg"),
                func.max(Offer.package_value).label("max_pkg")
            )
            .first()
        )
        avg_package = round(float(pkg_stats.avg_pkg), 2) if pkg_stats and pkg_stats.avg_pkg else None
        highest_package = round(float(pkg_stats.max_pkg), 2) if pkg_stats and pkg_stats.max_pkg else None

        # Batches breakdown
        batches_summary: List[Dict[str, Any]] = []
        all_batches = db.query(Batch).order_by(Batch.year_label.desc()).all()
        for b in all_batches:
            b_total = db.query(Student).filter(Student.batch_id == b.id).count()
            b_placed = db.query(Student).filter(
                Student.batch_id == b.id,
                Student.placement_status == PlacementStatus.PLACED
            ).count()
            b_offers_query = db.query(Offer).join(Student, Student.reg_no == Offer.student_reg_no).filter(Student.batch_id == b.id)
            b_total_offers = b_offers_query.count()
            
            b_multi_sub = (
                b_offers_query.with_entities(Offer.student_reg_no)
                .group_by(Offer.student_reg_no)
                .having(func.count(Offer.id) > 1)
                .subquery()
            )
            b_multi_count = db.query(func.count()).select_from(b_multi_sub).scalar() or 0
            b_pct = round((b_placed / b_total * 100.0), 1) if b_total > 0 else 0.0

            b_pkg_stats = (
                b_offers_query.filter(Offer.package_value.isnot(None))
                .with_entities(func.avg(Offer.package_value), func.max(Offer.package_value))
                .first()
            )

            batches_summary.append({
                "batch_id": b.id,
                "year_label": b.year_label,
                "total_students": b_total,
                "unique_placed": b_placed,
                "total_offers": b_total_offers,
                "multi_offer_students": b_multi_count,
                "placement_pct": b_pct,
                "avg_package": round(float(b_pkg_stats[0]), 2) if b_pkg_stats and b_pkg_stats[0] else None,
                "max_package": round(float(b_pkg_stats[1]), 2) if b_pkg_stats and b_pkg_stats[1] else None,
            })

        # PR Leaderboard
        pr_leaderboard: List[Dict[str, Any]] = []
        all_prs = db.query(PR).all()
        for p in all_prs:
            p_total = db.query(Student).filter(Student.added_by_pr_id == p.id).count()
            p_placed = db.query(Student).filter(
                Student.added_by_pr_id == p.id,
                Student.placement_status == PlacementStatus.PLACED
            ).count()
            p_pct = round((p_placed / p_total * 100.0), 1) if p_total > 0 else 0.0
            pr_leaderboard.append({
                "pr_id": p.id,
                "pr_name": p.name,
                "pr_email": p.email,
                "batch_id": p.batch_id,
                "batch_year": p.batch.year_label if p.batch else None,
                "total_students_added": p_total,
                "unique_placed": p_placed,
                "placement_pct": p_pct
            })
        pr_leaderboard.sort(key=lambda x: (x["placement_pct"], x["unique_placed"]), reverse=True)

        # Company-wise clear rates & Funnels
        company_query = db.query(Company)
        if batch_id:
            company_query = company_query.filter(Company.batch_id == batch_id)
        
        companies = company_query.all()
        company_clear_rates: List[Dict[str, Any]] = []

        for comp in companies:
            elig_q = db.query(Eligibility).filter(
                Eligibility.company_id == comp.id,
                Eligibility.eligible == True
            )
            if pr_id:
                elig_q = elig_q.join(Student, Student.reg_no == Eligibility.student_reg_no).filter(Student.added_by_pr_id == pr_id)
            eligible_count = elig_q.count()

            # Sequence 1 Round (Round 1)
            r1 = db.query(Round).filter(Round.company_id == comp.id, Round.sequence == 1).first()
            r1_cleared = 0
            if r1:
                r1_q = db.query(RoundResult).filter(
                    RoundResult.round_id == r1.id,
                    RoundResult.status == ResultStatus.CLEARED
                )
                if pr_id:
                    r1_q = r1_q.join(Student, Student.reg_no == RoundResult.student_reg_no).filter(Student.added_by_pr_id == pr_id)
                r1_cleared = r1_q.count()

            r1_pct = round((r1_cleared / eligible_count * 100.0), 1) if eligible_count > 0 else 0.0

            off_q = db.query(Offer).filter(Offer.company_id == comp.id)
            if pr_id:
                off_q = off_q.join(Student, Student.reg_no == Offer.student_reg_no).filter(Student.added_by_pr_id == pr_id)
            offers_count = off_q.count()
            conversion_pct = round((offers_count / eligible_count * 100.0), 1) if eligible_count > 0 else 0.0

            company_clear_rates.append({
                "company_id": comp.id,
                "company_name": comp.name,
                "batch_year": comp.batch.year_label if comp.batch else None,
                "eligible_count": eligible_count,
                "round_1_cleared": r1_cleared,
                "round_1_clear_pct": r1_pct,
                "final_offers_count": offers_count,
                "conversion_pct": conversion_pct
            })

        scope_name = None
        if scope == "BATCH" and batch_id:
            batch_obj = db.query(Batch).filter(Batch.id == batch_id).first()
            scope_name = f"Batch {batch_obj.year_label}" if batch_obj else None
        elif scope == "PR" and pr_id:
            pr_obj = db.query(PR).filter(PR.id == pr_id).first()
            scope_name = f"PR: {pr_obj.name}" if pr_obj else None

        return {
            "scope": scope,
            "scope_name": scope_name,
            "total_batches": len(all_batches),
            "total_prs": len(all_prs),
            "total_companies": len(companies),
            "total_students": total_students,
            "unique_placed": unique_placed,
            "total_offers": total_offers,
            "multi_offer_students": multi_offer_students,
            "unplaced_students": unplaced_students,
            "placement_pct": placement_pct,
            "avg_package": avg_package,
            "highest_package": highest_package,
            "batches_summary": batches_summary,
            "pr_leaderboard": pr_leaderboard,
            "company_clear_rates": company_clear_rates
        }
