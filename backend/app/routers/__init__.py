from app.routers.auth import router as auth_router
from app.routers.batches import router as batches_router
from app.routers.prs import router as prs_router
from app.routers.students import router as students_router
from app.routers.aliases import router as aliases_router
from app.routers.companies import router as companies_router
from app.routers.round_results import router as round_results_router
from app.routers.offers import router as offers_router
from app.routers.analytics import router as analytics_router
from app.routers.audit import router as audit_router

__all__ = [
    "auth_router",
    "batches_router",
    "prs_router",
    "students_router",
    "aliases_router",
    "companies_router",
    "round_results_router",
    "offers_router",
    "analytics_router",
    "audit_router"
]
