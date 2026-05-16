"""Shared rate limiter instance for all routers"""
import os

from fastapi import Request
from slowapi import Limiter

from dependencies.auth import get_client_ip


def _rate_limit_key(request: Request) -> str:
    """Align slowapi client key with login lockout / audit IP logic."""
    return get_client_ip(request)


# Create global limiter instance
_redis_url = os.getenv("REDIS_URL", "").strip()
if _redis_url:
    limiter = Limiter(key_func=_rate_limit_key, storage_uri=_redis_url)
else:
    limiter = Limiter(key_func=_rate_limit_key)
