"""Shared rate limiter instance for all routers"""
import os

from slowapi import Limiter
from slowapi.util import get_remote_address

# Create global limiter instance
_redis_url = os.getenv("REDIS_URL", "").strip()
if _redis_url:
  limiter = Limiter(key_func=get_remote_address, storage_uri=_redis_url)
else:
  limiter = Limiter(key_func=get_remote_address)
