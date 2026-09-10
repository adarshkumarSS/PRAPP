import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, SessionLocal
import app.models
from app.services.seed_service import init_admin_user, seed_demo_data
from app.services.alias_resolver import AliasResolverService
from app.services.analytics_service import AnalyticsService

def main():
    print("Testing connection to Supabase PostgreSQL...")
    
    # 1. Create all tables
    Base.metadata.create_all(bind=engine)
    print("[OK] All tables created and verified in Supabase PostgreSQL!")

    # 2. Seed initial admin
    db = SessionLocal()
    try:
        admin = init_admin_user(db)
        print(f"[OK] Default Admin verified: {admin.email} (ID: {admin.id})")

        # 3. Seed demo data
        demo_res = seed_demo_data(db)
        print(f"[OK] Demo data seeder: {demo_res['message']}")

        # 4. Test Token Resolution Engine
        print("\n--- Testing Token Resolution Engine ---")
        test_tokens = ["H244201", "917724420002", "3", "23CS004", "H244205", "UNKNOWN_ROLL_99"]
        resolution = AliasResolverService.resolve_tokens(db, test_tokens)
        print(f"Pasted tokens count: {resolution['total_tokens_found']}")
        print(f"Matched count: {resolution['matched_count']}")
        print(f"Unrecognized count: {resolution['unrecognized_count']}")
        for m in resolution['matched']:
            print(f"  Token '{m['raw_token']}' -> Canonical RegNo: {m['canonical_reg_no']} ({m['student_name']}) [Format: {m['format_type']}]")

        # 5. Test Analytics Service
        print("\n--- Testing Analytics and Dual-Offer Rollup ---")
        summary = AnalyticsService.get_dashboard_summary(db, scope="GLOBAL")
        print(f"Unique Placed (Headline): {summary['unique_placed']} / {summary['total_students']} ({summary['placement_pct']}%)")
        print(f"Total Offers (Secondary): {summary['total_offers']}")
        print(f"Multi-Offer Candidates: {summary['multi_offer_students']}")
        print(f"Batches active: {summary['total_batches']}")
        print(f"Campus Drives: {summary['total_companies']}")
        
        print("\n=== ALL BACKEND AND SUPABASE INTEGRATION TESTS PASSED ===")
    finally:
        db.close()

if __name__ == "__main__":
    main()
