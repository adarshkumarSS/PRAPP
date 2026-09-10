from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from app.database import get_db
from app.schemas.analytics import DashboardSummaryResponse
from app.services.analytics_service import AnalyticsService
from app.services.seed_service import seed_demo_data
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["Analytics & Dashboards"])

@router.get("/dashboard", response_model=DashboardSummaryResponse)
def get_dashboard_metrics(
    scope: Optional[str] = None, # "GLOBAL", "BATCH", "PR"
    batch_id: Optional[UUID] = None,
    pr_id: Optional[UUID] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    actual_scope = "GLOBAL"
    target_batch_id = batch_id
    target_pr_id = pr_id

    if current_user["role"] == "PR":
        # PR is batch-scoped by default
        actual_scope = "PR"
        target_pr_id = current_user["id"]
        target_batch_id = current_user.get("batch_id")
    elif scope:
        actual_scope = scope.upper()

    summary = AnalyticsService.get_dashboard_summary(
        db=db,
        batch_id=target_batch_id,
        pr_id=target_pr_id,
        scope=actual_scope
    )
    return summary

@router.post("/seed-demo")
def seed_demo_endpoint(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = seed_demo_data(db)
    return result
