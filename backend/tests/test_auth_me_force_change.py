"""GET /api/auth/me exposes force_password_change for local users."""
from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def _token(sub: str = "admin", auth_method: str = "local", role: str = "admin"):
    from core.security import create_access_token
    from datetime import timedelta

    return create_access_token(
        data={
            "sub": sub,
            "type": role,
            "auth_method": auth_method,
            "display_name": None,
        },
        expires_delta=timedelta(minutes=15),
    )


def test_auth_me_force_change_when_flag_set():
    token = _token()
    with patch(
        "routers.auth.get_force_change_for_username",
        return_value=True,
    ):
        res = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert res.status_code == 200
    assert res.json()["force_password_change"] is True


def test_auth_me_no_force_change_for_ad():
    token = _token(auth_method="ad")
    with patch(
        "routers.auth.get_force_change_for_username",
        return_value=True,
    ) as mock_fc:
        res = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert res.status_code == 200
    assert res.json()["force_password_change"] is False
    mock_fc.assert_not_called()
