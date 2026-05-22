"""API access blocked when local user has force_change=TRUE."""
from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def _token(sub: str = "admin", auth_method: str = "local", role: str = "admin"):
    from datetime import timedelta

    from core.security import create_access_token

    return create_access_token(
        data={
            "sub": sub,
            "type": role,
            "auth_method": auth_method,
            "display_name": None,
        },
        expires_delta=timedelta(minutes=15),
    )


def test_services_blocked_when_force_change():
    token = _token()
    with patch("dependencies.auth.get_force_change_for_username", return_value=True):
        res = client.get(
            "/api/services",
            headers={"Authorization": f"Bearer {token}"},
            params={"dashboard_id": 1},
        )
    assert res.status_code == 403
    assert "Password change required" in (res.json().get("detail") or "")


def test_auth_me_allowed_when_force_change():
    token = _token()
    with patch("dependencies.auth.get_force_change_for_username", return_value=True):
        res = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert res.status_code == 200


def test_ad_user_not_blocked_by_force_change_flag():
    token = _token(auth_method="ad")
    with patch("dependencies.auth.get_force_change_for_username", return_value=True):
        res = client.get(
            "/api/services",
            headers={"Authorization": f"Bearer {token}"},
            params={"dashboard_id": 1},
        )
    # May be 200 or 500 if DB unavailable in test env; must not be 403 from force_change
    assert res.status_code != 403
