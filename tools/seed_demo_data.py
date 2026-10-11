"""
Standalone CLI tool to seed the Demo User ('prince', 78kg, stable weight)
and 7 days of historical Indian meal logs into Neon PostgreSQL or SQLite.

Usage:
  python tools/seed_demo_data.py [OPTIONAL_NEON_DATABASE_URL]

Examples:
  python tools/seed_demo_data.py
  python tools/seed_demo_data.py "postgresql://user:pass@ep-xxxx.us-west-2.aws.neon.tech/neondb?sslmode=require"
"""
import sys
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

if len(sys.argv) > 1 and sys.argv[1].startswith("postgres"):
    os.environ["DATABASE_URL"] = sys.argv[1]
    print(f"Connecting to remote database: {sys.argv[1][:45]}...")

from backend.database import create_tables
from backend.demo_data import ensure_demo_user_seeded, DEMO_USERNAME, DEMO_EMAIL, DEMO_PASSWORD, DEMO_WEIGHT, DEMO_GOAL

if __name__ == "__main__":
    print(f"Initializing tables and seeding demo profile for: {DEMO_USERNAME} ({DEMO_WEIGHT}kg, {DEMO_GOAL})...")
    create_tables()
    user_id = ensure_demo_user_seeded()
    print("\nSUCCESS! Demo user and 7-day meal history are ready.")
    print("-------------------------------------------------------")
    print(f"Username : {DEMO_USERNAME}")
    print(f"Email    : {DEMO_EMAIL}")
    print(f"Password : {DEMO_PASSWORD}")
    print("Weight   : 78 kg")
    print("Height   : 179 cm")
    print("Age      : 20")
    print("Goal     : Stable Weight (Maintenance)")
    print("Meals    : 7 Days (27 historical meals seeded)")
    print("-------------------------------------------------------")
