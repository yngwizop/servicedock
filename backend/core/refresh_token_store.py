"""Server-side refresh token session store (Redis with in-memory fallback)."""

import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from core.logging import logger

_MEM: dict[str, dict] = {}


def _redis_client():
    url = os.getenv("REDIS_URL", "").strip()
    if not url:
        return None
    try:
        import redis

        return redis.Redis.from_url(url, decode_responses=True)
    except Exception as exc:
        logger.warning("Redis disabled for refresh tokens: %s", exc)
        return None


def _key(user_sub: str) -> str:
    return f"refresh_sess:{user_sub}"


def _mem_cleanup() -> None:
    now = datetime.now(timezone.utc)
    expired = [
        k
        for k, v in _MEM.items()
        if v.get("expires_at") and v["expires_at"] < now
    ]
    for k in expired:
        del _MEM[k]


def store_refresh_session(user_sub: str, jti: str, ttl_seconds: int) -> None:
    """Bind the active refresh jti for a user."""
    ttl = max(int(ttl_seconds), 60)
    r = _redis_client()
    if r is not None:
        r.set(_key(user_sub), jti, ex=ttl)
        return
    _mem_cleanup()
    _MEM[user_sub] = {
        "jti": jti,
        "expires_at": datetime.now(timezone.utc) + timedelta(seconds=ttl),
    }


def get_refresh_jti(user_sub: str) -> Optional[str]:
    r = _redis_client()
    if r is not None:
        return r.get(_key(user_sub))
    _mem_cleanup()
    entry = _MEM.get(user_sub)
    if not entry:
        return None
    if entry.get("expires_at") and entry["expires_at"] < datetime.now(timezone.utc):
        del _MEM[user_sub]
        return None
    return entry.get("jti")


def validate_refresh_jti(user_sub: str, jti: Optional[str]) -> bool:
    """
    True if jti matches the active server-side session.
    Tokens without jti are rejected (legacy migration complete).
    """
    if not jti:
        return False
    current = get_refresh_jti(user_sub)
    if current is None:
        return False
    return current == jti


def revoke_refresh_session(user_sub: str) -> None:
    r = _redis_client()
    if r is not None:
        r.delete(_key(user_sub))
        return
    _MEM.pop(user_sub, None)


def new_refresh_jti() -> str:
    return str(uuid.uuid4())
