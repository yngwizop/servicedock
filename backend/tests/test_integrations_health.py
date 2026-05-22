from datetime import timedelta
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from core.limiter import limiter
from core.security import create_access_token
from routers.integrations import router as integrations_router


def _auth_headers():
  token = create_access_token(
    data={"sub": "ci-admin", "type": "admin", "auth_method": "local"},
    expires_delta=timedelta(minutes=15),
  )
  return {"Authorization": f"Bearer {token}"}


def build_app():
  app = FastAPI()
  app.state.limiter = limiter
  app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
  app.include_router(integrations_router)
  return app


def test_integrations_health_requires_auth():
  app = build_app()
  client = TestClient(app)
  r = client.get("/api/integrations/health?dashboard_id=1")
  assert r.status_code == 401


def test_integrations_health_shape(monkeypatch):
  # Avoid DB / external calls by patching check functions.
  import routers.integrations as integ

  monkeypatch.setattr(
    integ,
    "_check_proxmox",
    lambda dashboard_id: {"name": "proxmox", "status": "ok", "configured": True, "detail": "mock"},
  )
  monkeypatch.setattr(
    integ,
    "_check_spotify_for_health",
    lambda: {"name": "spotify", "status": "ok", "configured": True, "detail": "mock"},
  )
  monkeypatch.setattr(
    integ,
    "_check_ldap",
    lambda: {"name": "ldap", "status": "warning", "configured": True, "detail": "mock"},
  )

  app = build_app()
  client = TestClient(app)
  with patch("dependencies.auth.get_force_change_for_username", return_value=False):
    r = client.get(
      "/api/integrations/health?dashboard_id=1",
      headers=_auth_headers(),
    )
  assert r.status_code == 200, r.text
  body = r.json()
  assert body["dashboard_id"] == 1
  assert "generated_at" in body
  assert isinstance(body["checks"], list)
  assert {c["name"] for c in body["checks"]} == {"proxmox", "spotify", "ldap"}
  assert body["overall_status"] in {"ok", "warning", "not_configured", "down", "disabled"}


def test_integrations_health_ldap_disabled_does_not_warn(monkeypatch):
  import routers.integrations as integ

  monkeypatch.setattr(
    integ,
    "_check_proxmox",
    lambda dashboard_id: {"name": "proxmox", "status": "ok", "configured": True, "detail": "mock"},
  )
  monkeypatch.setattr(
    integ,
    "_check_spotify_for_health",
    lambda: {"name": "spotify", "status": "ok", "configured": True, "detail": "mock"},
  )
  monkeypatch.setattr(
    integ,
    "_check_ldap",
    lambda: {"name": "ldap", "status": "disabled", "configured": False, "detail": "LDAP not in use"},
  )

  app = build_app()
  client = TestClient(app)
  with patch("dependencies.auth.get_force_change_for_username", return_value=False):
    r = client.get(
      "/api/integrations/health?dashboard_id=1",
      headers=_auth_headers(),
    )
  assert r.status_code == 200
  body = r.json()
  assert body["overall_status"] == "ok"
  ldap = next(c for c in body["checks"] if c["name"] == "ldap")
  assert ldap["status"] == "disabled"

