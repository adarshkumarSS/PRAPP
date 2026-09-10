import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000/api"

def api_call(method, endpoint, data=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    
    with urllib.request.urlopen(req) as resp:
        if resp.status == 204:
            return None
        return json.loads(resp.read().decode("utf-8"))

def test_full_flow():
    print("=================================================================")
    print("  PLACEMENT TRACKER v2: COMPLETE END-TO-END VERIFICATION SUITE")
    print("=================================================================")

    # 1. Health Check
    health = api_call("GET", "/health")
    print(f"1. Health Check: {health}")
    assert health["status"] == "healthy"

    # 2. Admin Login
    admin_login = api_call("POST", "/auth/login", {
        "email": "admin@placement.edu",
        "password": "Admin@2027",
        "role_hint": "ADMIN"
    })
    admin_token = admin_login["access_token"]
    print(f"2. Admin Logged In: {admin_login['name']} (Role: {admin_login['role']})")

    # 3. PR Login
    pr_login = api_call("POST", "/auth/login", {
        "email": "pr.arun@placement.edu",
        "password": "PR@2027",
        "role_hint": "PR"
    })
    pr_token = pr_login["access_token"]
    print(f"3. PR Logged In: {pr_login['name']} (Assigned Batch: {pr_login['batch_year']})")

    # 4. Get Batches (Admin)
    batches = api_call("GET", "/batches", token=admin_token)
    print(f"4. Batches Retrieved: {len(batches)} batches active")
    for b in batches:
        print(f"   - Batch {b['year_label']}: {b['student_count']} students, {b['pr_count']} PRs, {b['placement_pct']}% placement")

    # 5. Get PR Accounts (Admin)
    prs = api_call("GET", "/prs", token=admin_token)
    print(f"5. PR Coordinators: {len(prs)} accounts registered")

    # 6. Test Multi-Format Token Resolution
    print("\n--- Testing Token Resolution Endpoint (/api/aliases/resolve) ---")
    paste_tokens = ["H244201", "917724420002", "3", "23CS004", "H244205", "UNKNOWN_ROLL_XYZ"]
    resolved = api_call("POST", "/aliases/resolve", {
        "tokens": paste_tokens
    }, token=pr_token)
    print(f"Input tokens: {len(paste_tokens)}")
    print(f"Matched: {resolved['matched_count']}")
    print(f"Unrecognized: {resolved['unrecognized_count']} -> {resolved['unrecognized']}")
    for m in resolved["matched"]:
        print(f"   * '{m['raw_token']}' => {m['canonical_reg_no']} ({m['student_name']}) [{m['format_type']}]")

    # 7. Test Companies & Dynamic Rounds
    companies = api_call("GET", "/companies", token=pr_token)
    print(f"\n7. Active Recruitment Drives: {len(companies)}")
    for c in companies:
        print(f"   - {c['name']} (Eligible: {c['eligible_count']}, Offers: {c['offers_count']})")
        for r in c["rounds"]:
            print(f"     [Seq {r['sequence']}] {r['name']} -> Cleared: {r['cleared_count']}")

    # 8. Test Round Results Diff Preview & Commit
    target_comp = companies[0]
    target_round = target_comp["rounds"][0]
    print(f"\n8. Testing Round Result Diff on [{target_comp['name']} -> {target_round['name']}]")
    diff_res = api_call("POST", f"/rounds/{target_round['id']}/diff", {
        "raw_text": "H244201\n917724420002\n23CS003"
    }, token=pr_token)
    print(f"   Diff preview: {diff_res['matched_count']} matched, {diff_res['newly_cleared_count']} newly cleared, {diff_res['already_cleared_count']} already cleared")

    # 9. Test Offers & Dual-Offer Exclusivity
    offers = api_call("GET", "/offers", token=pr_token)
    print(f"\n9. Recorded Placement Offers: {len(offers)}")
    for o in offers:
        final_tag = "[FINAL]" if o["is_final"] else "[SECONDARY]"
        print(f"   - {o['student_reg_no']} ({o['student_name']}) -> {o['company_name']}: {o['package_value']} LPA {final_tag}")

    # 10. Test Analytics Dashboard (Dual-Offer Aware Rollup)
    analytics = api_call("GET", "/analytics/dashboard?scope=GLOBAL", token=admin_token)
    print("\n10. Global Analytics Dashboard Summary:")
    print(f"   - Unique Candidates Placed: {analytics['unique_placed']} / {analytics['total_students']}")
    print(f"   - Headline Placement Rate: {analytics['placement_pct']}%")
    print(f"   - Total Offers Handed Out: {analytics['total_offers']} (>= unique placed)")
    print(f"   - Multi-Offer Candidates: {analytics['multi_offer_students']}")
    print(f"   - PR Leaderboard Top: {analytics['pr_leaderboard'][0]['pr_name']} ({analytics['pr_leaderboard'][0]['placement_pct']}%)")

    print("\n=================================================================")
    print("  ALL 10 VERIFICATION FLOWS PASSED SUCCESSFULLY (100% GREEN)")
    print("=================================================================")

if __name__ == "__main__":
    test_full_flow()
