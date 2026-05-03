#!/usr/bin/env python3
"""Smoke checks for /api/docs/help. Run from backend: python tests/smoke_docs_api.py"""
import sys
from pathlib import Path
from unittest.mock import patch

BACKEND = Path(__file__).resolve().parent.parent
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from fastapi import FastAPI
from fastapi.testclient import TestClient
from jose import jwt
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from config.settings import ALGORITHM, SECRET_KEY
from core.limiter import limiter
from dependencies.auth import require_help_docs_access
from routers import docs


def build_app():
    app = FastAPI()
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.include_router(docs.router)
    return app


def main():
    app = build_app()
    client = TestClient(app)

    r = client.get("/api/docs/help")
    assert r.status_code == 401, f"expected 401 without auth, got {r.status_code}: {r.text}"

    def fake_user():
        return {"sub": "smoke", "type": "viewer"}

    app.dependency_overrides[require_help_docs_access] = fake_user
    try:
        r = client.get("/api/docs/help")
        assert r.status_code == 200, r.text
        assert "docs" in r.json()

        r = client.get("/api/docs/help/readme")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("id") == "readme"
        assert "markdown" in body

        r = client.get("/api/docs/help/does-not-exist-xyz")
        assert r.status_code == 404, r.text
    finally:
        app.dependency_overrides.clear()

    # LDAP/AD enabled: help docs admin-only (viewer → 403)
    with patch("core.ldap_auth.get_ldap_config", return_value={"enabled": True}):
        vt = jwt.encode({"sub": "v", "type": "viewer"}, SECRET_KEY, algorithm=ALGORITHM)
        r = client.get("/api/docs/help", cookies={"access_token": vt})
        assert r.status_code == 403, r.text
        at = jwt.encode({"sub": "a", "type": "admin"}, SECRET_KEY, algorithm=ALGORITHM)
        r = client.get("/api/docs/help", cookies={"access_token": at})
        assert r.status_code == 200, r.text

    print("smoke_docs_api: OK")


if __name__ == "__main__":
    main()
