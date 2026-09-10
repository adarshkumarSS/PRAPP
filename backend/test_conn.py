import psycopg2

regions = [
    "ap-south-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2",
    "us-east-1", "us-east-2", "us-west-1", "us-west-2",
    "eu-central-1", "eu-west-1", "eu-west-2", "eu-west-3", "eu-north-1",
    "sa-east-1", "ca-central-1"
]

print("Scanning Supabase Pooler IPv4 across AWS regions for project dcujimoqieonrzpptpoo...")

found = False
for region in regions:
    host = f"aws-0-{region}.pooler.supabase.com"
    user = "postgres.dcujimoqieonrzpptpoo"
    for port in [6543, 5432]:
        try:
            conn = psycopg2.connect(
                host=host,
                port=port,
                user=user,
                password="CSBSPR@2027",
                dbname="postgres",
                connect_timeout=3
            )
            print(f"SUCCESS: Connected to Supabase Pooler in [{region}] on port [{port}]!")
            print(f"Connection URL: postgresql://postgres.dcujimoqieonrzpptpoo:CSBSPR%402027@{host}:{port}/postgres")
            conn.close()
            found = True
            break
        except Exception as e:
            # print(f"  {region}:{port} -> {e}")
            pass
    if found:
        break

if not found:
    print("Could not locate pooler. Let's check direct IP or alternative...")
