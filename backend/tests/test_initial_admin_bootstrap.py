"""Bootstrap fallback creates admin user only when missing."""
import os
from unittest.mock import MagicMock, patch

from core.local_users import _bootstrap_initial_admin


def _db_without_admin() -> MagicMock:
    db = MagicMock()
    cur = MagicMock()
    cur.fetchone.return_value = None
    db.cursor.return_value = cur
    return db


def _db_with_admin() -> MagicMock:
    db = MagicMock()
    cur = MagicMock()
    cur.fetchone.return_value = (1,)
    db.cursor.return_value = cur
    return db


def test_bootstrap_uses_env_password_when_set_and_admin_missing():
    db = _db_without_admin()
    with patch.dict(os.environ, {"INITIAL_ADMIN_PASSWORD": "MySecurePass1"}):
        with patch("core.local_users.get_password_hash", return_value="hashed") as mock_hash:
            _bootstrap_initial_admin(db)
    mock_hash.assert_called_with("MySecurePass1")
    db.commit.assert_called_once()


def test_bootstrap_uses_changeme_default_when_env_missing():
    db = _db_without_admin()
    env = {k: v for k, v in os.environ.items() if k != "INITIAL_ADMIN_PASSWORD"}
    with patch.dict(os.environ, env, clear=True):
        with patch("core.local_users.get_password_hash", return_value="hashed") as mock_hash:
            _bootstrap_initial_admin(db)
    mock_hash.assert_called_with("changeme")
    db.commit.assert_called_once()


def test_bootstrap_skips_when_admin_already_exists():
    db = _db_with_admin()
    with patch("core.local_users.get_password_hash", return_value="hashed") as mock_hash:
        _bootstrap_initial_admin(db)
    mock_hash.assert_not_called()
    db.commit.assert_not_called()
