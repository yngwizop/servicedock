import os
import sys
from pathlib import Path

# Minimal env for importing config.settings in CI / local pytest (no .env file).
os.environ.setdefault(
    "JWT_SECRET_KEY",
    "ci-test-jwt-secret-key-minimum-32-characters-long",
)
os.environ.setdefault(
    "ENCRYPTION_KEY",
    "dGVzdC1lbmNyeXB0aW9uLWtleS1mb3ItY2ktdGVzdHMtMDEyMzQ1Njc4OWFi",
)
os.environ.setdefault(
    "DATABASE_URL",
    os.environ.get(
        "DATABASE_URL",
        "postgresql://user:password@localhost:5432/dashboard",
    ),
)
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("FRONTEND_URL", "http://localhost:5173")

# Ensure `backend/` is importable when running pytest from repo root.
BACKEND = Path(__file__).resolve().parent.parent
if str(BACKEND) not in sys.path:
  sys.path.insert(0, str(BACKEND))

