from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base, SessionLocal
import app.models # Ensure all models are registered with Base.metadata
from app.services.seed_service import init_admin_user
from app.routers import (
    auth_router,
    batches_router,
    prs_router,
    students_router,
    aliases_router,
    companies_router,
    round_results_router,
    offers_router,
    analytics_router,
    audit_router
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    try:
        print("Creating Supabase PostgreSQL tables if not present...")
        Base.metadata.create_all(bind=engine)
        print("Database tables initialized successfully.")
        
        # Seed initial admin
        db = SessionLocal()
        try:
            init_admin_user(db)
        finally:
            db.close()
    except Exception as e:
        print(f"Warning during database initialization: {e}")

    yield

app = FastAPI(
    title="Placement Tracker API",
    version="2.0.0",
    description="Backend API for Placement Tracker Architecture v2 (Batch-Based) with Supabase PostgreSQL",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(batches_router)
app.include_router(prs_router)
app.include_router(students_router)
app.include_router(aliases_router)
app.include_router(companies_router)
app.include_router(round_results_router)
app.include_router(offers_router)
app.include_router(analytics_router)
app.include_router(audit_router)

@app.get("/")
def root():
    return {
        "app": "Placement Tracker API",
        "version": "2.0.0",
        "architecture": "Architecture v2 (Batch-Based)",
        "status": "online"
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "database": "connected"}
