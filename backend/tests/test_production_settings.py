"""Production environment guardrails (contract tests)."""
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND.parent


def test_settings_enforces_redis_in_production():
    source = (BACKEND / "config" / "settings.py").read_text(encoding="utf-8")
    assert 'if ENVIRONMENT == "production":' in source
    assert "REDIS_URL is required" in source
    assert "localhost" in source  # FRONTEND_URL localhost check


def test_production_compose_defaults():
    compose_path = REPO_ROOT / "docker-compose.yml"
    if not compose_path.is_file():
        pytest.skip("docker-compose.yml not in workspace (backend-only checkout)")
    compose = compose_path.read_text(encoding="utf-8")
    assert "ENVIRONMENT=production" in compose
    assert "REDIS_URL=${REDIS_URL:-redis://redis:6379/0}" in compose
    assert "DOCKERHUB_USER" in compose
    assert "FRONTEND_URL=${FRONTEND_URL:?" in compose or "FRONTEND_URL=${FRONTEND_URL:?Set" in compose
