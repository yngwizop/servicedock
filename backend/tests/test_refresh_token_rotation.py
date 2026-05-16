"""Refresh token server-side session tests."""
from core.refresh_token_store import (
    store_refresh_session,
    get_refresh_jti,
    validate_refresh_jti,
    revoke_refresh_session,
    new_refresh_jti,
)


def test_refresh_rotation_and_revocation():
    user = "testuser-rotation"
    jti1 = new_refresh_jti()
    store_refresh_session(user, jti1, ttl_seconds=3600)
    assert get_refresh_jti(user) == jti1
    assert validate_refresh_jti(user, jti1) is True

    jti2 = new_refresh_jti()
    store_refresh_session(user, jti2, ttl_seconds=3600)
    assert validate_refresh_jti(user, jti1) is False
    assert validate_refresh_jti(user, jti2) is True

    revoke_refresh_session(user)
    assert get_refresh_jti(user) is None
    assert validate_refresh_jti(user, jti2) is False


def test_legacy_token_without_jti_allowed():
    user = "legacy-user"
    assert validate_refresh_jti(user, None) is True
