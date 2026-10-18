import os
import sys
from pathlib import Path

# Add backend directory to sys.path so 'app' imports work from anywhere
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import uvicorn

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 Starting Hirely AI Backend Server...")
    print("📖 Swagger UI Docs: http://localhost:8000/docs")
    print("⚡ Health Check:    http://localhost:8000/health")
    print("=" * 60)
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
