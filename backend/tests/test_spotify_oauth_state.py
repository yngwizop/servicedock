from fastapi import FastAPI
from fastapi.testclient import TestClient
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from core.limiter import limiter
from dependencies.auth import require_role
from routers.spotify import router as spotify_router


def build_app():
  app = FastAPI()
  app.state.limiter = limiter
  app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
  app.include_router(spotify_router)
  return app


def test_spotify_callback_rejects_unknown_state(monkeypatch):
  # Don't hit DB for config
  import routers.spotify as sp

  monkeypatch.setattr(sp, "get_spotify_config", lambda: {"client_id": "x", "client_secret": "y", "redirect_uri": "http://x", "connected": False})

  app = build_app()
  app.dependency_overrides[require_role] = lambda role: (lambda: {"sub": "a", "type": "admin"})
  try:
    client = TestClient(app)
    r = client.get("/api/spotify/callback?code=abc&state=does-not-exist")
    assert r.status_code == 400
  finally:
    app.dependency_overrides.clear()

