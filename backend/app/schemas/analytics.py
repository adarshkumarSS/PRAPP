from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

class BatchMetricItem(BaseModel):
    batch_id: UUID
    year_label: str
    total_students: int
    unique_placed: int
    total_offers: int
    multi_offer_students: int
    placement_pct: float
    avg_package: Optional[float] = None
    max_package: Optional[float] = None

class PRLeaderboardItem(BaseModel):
    pr_id: UUID
    pr_name: str
    pr_email: str
    batch_id: Optional[UUID] = None
    batch_year: Optional[str] = None
    total_students_added: int
    unique_placed: int
    placement_pct: float

class CompanyClearRateItem(BaseModel):
    company_id: UUID
    company_name: str
    batch_year: Optional[str] = None
    eligible_count: int
    round_1_cleared: int
    round_1_clear_pct: float
    final_offers_count: int
    conversion_pct: float

class DashboardSummaryResponse(BaseModel):
    scope: str # "GLOBAL" or "BATCH" or "PR"
    scope_name: Optional[str] = None
    total_batches: int = 0
    total_prs: int = 0
    total_companies: int = 0
    total_students: int
    unique_placed: int            # Headline metric!
    total_offers: int             # Secondary stat (>= unique_placed)
    multi_offer_students: int     # Students holding > 1 offer
    unplaced_students: int
    placement_pct: float
    avg_package: Optional[float] = None
    highest_package: Optional[float] = None
    batches_summary: List[BatchMetricItem] = []
    pr_leaderboard: List[PRLeaderboardItem] = []
    company_clear_rates: List[CompanyClearRateItem] = []
