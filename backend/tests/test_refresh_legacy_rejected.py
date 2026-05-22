"""Refresh tokens without jti must be rejected."""
from fastapi.testclient import TestClient
from jose import jwt

from config.settings import SECRET_KEY, ALGORITHM
from main import app

client = TestClient(app)


def test_refresh_without_jti_returns_401():
    payload = {
        "sub": "admin",
        "type": "admin",
        "token_type": "refresh",
        "auth_method": "local",
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    res = client.post("/api/refresh", cookies={"refresh_token": token})
    assert res.status_code == 401
