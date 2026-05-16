"""Whitelisted documentation files from the repository root (Markdown)."""
import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from core.limiter import limiter
from dependencies.auth import require_help_docs_access

router = APIRouter(prefix="/api/docs", tags=["docs"])

# Dev: backend/routers/docs.py → …/backend → repo root (servicedock).
# Docker: build copies README.md + docs/*.md to SERVICEDOCK_HELP_DOCS_DIR (see backend/Dockerfile).
def _help_docs_root() -> Path:
    raw = (os.environ.get("SERVICEDOCK_HELP_DOCS_DIR") or "").strip()
    if raw:
        p = Path(raw).resolve()
        if p.is_dir():
            return p
    return Path(__file__).resolve().parent.parent.parent


REPO_ROOT = _help_docs_root()

# Curated list: id -> filename under REPO_ROOT (must stay in sync with whitelist)
HELP_DOCS = [
    {"id": "readme", "file": "README.md"},
    {"id": "quickstart", "file": "QUICKSTART.md"},
    {"id": "initial-setup", "file": "INITIAL_SETUP.md"},
    {"id": "token-rotation", "file": "TOKEN_ROTATION_GUIDE.md"},
    {"id": "proxmox", "file": "PROXMOX_SETUP.md"},
    {"id": "spotify", "file": "SPOTIFY_ADDON.md"},
    {"id": "ldap", "file": "LDAP_INTEGRATION.md"},
    {"id": "deploy", "file": "DEPLOY.md"},
    {"id": "https", "file": "HTTPS_SETUP.md"},
]

_ALLOWED_FILES = frozenset(entry["file"] for entry in HELP_DOCS)
_ID_TO_FILE = {entry["id"]: entry["file"] for entry in HELP_DOCS}
_MAX_BYTES = 1_500_000


@router.get("/help")
@limiter.limit("60/minute")
async def list_help_docs(
    request: Request,
    _user: dict = Depends(require_help_docs_access),
):
    """List available help documents (ids and filenames)."""
    return {"docs": HELP_DOCS}


@router.get("/help/{doc_id}")
@limiter.limit("60/minute")
async def get_help_doc(
    request: Request,
    doc_id: str,
    _user: dict = Depends(require_help_docs_access),
):
    """Return raw Markdown for a whitelisted document."""
    filename = _ID_TO_FILE.get(doc_id)
    if not filename or filename not in _ALLOWED_FILES:
        raise HTTPException(status_code=404, detail="Unknown document")

    root_resolved = REPO_ROOT.resolve()
    path = (REPO_ROOT / filename).resolve()
    if not path.is_relative_to(root_resolved):
        raise HTTPException(status_code=400, detail="Invalid path")

    if not path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    size = path.stat().st_size
    if size > _MAX_BYTES:
        raise HTTPException(status_code=413, detail="Document too large")

    content = path.read_text(encoding="utf-8", errors="replace")
    return {"id": doc_id, "file": filename, "markdown": content}
