import sys
from pathlib import Path

# Ensure `backend/` is importable when running pytest from repo root.
BACKEND = Path(__file__).resolve().parent.parent
if str(BACKEND) not in sys.path:
  sys.path.insert(0, str(BACKEND))

