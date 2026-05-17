"""Production environment guardrails (contract tests)."""
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent


def test_settings_enforces_redis_in_production():
    source = (BACKEND / "config" / "settings.py").read_text(encoding="utf-8")
    assert 'if ENVIRONMENT == "production":' in source
    assert "REDIS_URL is required" in source
    assert "localhost" in source  # FRONTEND_URL localhost check


def test_production_compose_defaults():
    compose = (BACKEND.parent / "docker-compose.yml").read_text(encoding="utf-8")
    assert "ENVIRONMENT=production" in compose
    assert "REDIS_URL=${REDIS_URL:-redis://redis:6379/0}" in compose
    assert "DOCKERHUB_USER" in compose
    assert "FRONTEND_URL=${FRONTEND_URL:?" in compose or "FRONTEND_URL=${FRONTEND_URL:?Set" in compose
