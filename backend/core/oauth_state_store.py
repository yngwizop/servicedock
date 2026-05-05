"""OAuth state storage with Redis fallback.

Used for CSRF protection in OAuth flows (Spotify).
"""

import json
import os
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from core.logging import logger


def _redis_client():
  url = os.getenv("REDIS_URL", "").strip()
  if not url:
    return None
  try:
    import redis

    return redis.Redis.from_url(url, decode_responses=True)
  except Exception as exc:
    logger.warning(f"Redis disabled for oauth state: {exc}")
    return None


def _key(prefix: str, state: str) -> str:
  return f"oauth_state:{prefix}:{state}"


def put_state(prefix: str, state: str, payload: Dict[str, Any], ttl_seconds: int = 600) -> None:
  """Store state with TTL."""
  data = dict(payload)
  data["timestamp"] = datetime.now(timezone.utc).isoformat()

  r = _redis_client()
  if r is not None:
    r.set(_key(prefix, state), json.dumps(data), ex=max(int(ttl_seconds), 60))
    return

  # In-memory fallback (discouraged for production; kept for dev)
  from core.oauth_state_store_memory import put_state_mem

  put_state_mem(prefix, state, data, ttl_seconds=ttl_seconds)


def pop_state(prefix: str, state: str) -> Optional[Dict[str, Any]]:
  """Fetch and delete state."""
  r = _redis_client()
  if r is not None:
    k = _key(prefix, state)
    raw = r.get(k)
    if not raw:
      return None
    r.delete(k)
    try:
      return json.loads(raw)
    except Exception:
      return None

  from core.oauth_state_store_memory import pop_state_mem

  return pop_state_mem(prefix, state)

