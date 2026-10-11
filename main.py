"""
FoodLens AI - Root Application Entry Point
Supports both:
  - uvicorn main:app --host 0.0.0.0 --port $PORT
  - uvicorn backend.main:app --host 0.0.0.0 --port $PORT
  - python main.py
"""
import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Import the FastAPI application from backend.main
from backend.main import app

if __name__ == "__main__":
    import uvicorn

    port_env = os.environ.get("PORT", "8000")
    try:
        port = int(port_env)
    except ValueError:
        port = 8000

    print(f"[FoodLens AI] Starting Uvicorn on 0.0.0.0:{port}...")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, log_level="info")
