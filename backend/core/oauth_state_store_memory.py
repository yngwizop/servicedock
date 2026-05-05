"""In-memory OAuth state store (dev fallback)."""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional

_states: Dict[str, Dict[str, Any]] = {}


def put_state_mem(prefix: str, state: str, payload: Dict[str, Any], ttl_seconds: int = 600) -> None:
  # Cleanup old
  cutoff = datetime.now(timezone.utc) - timedelta(seconds=max(int(ttl_seconds), 60))
  expired = [k for k, v in _states.items() if v.get("timestamp_dt") and v["timestamp_dt"] < cutoff]
  for k in expired:
    del _states[k]

  _states[f"{prefix}:{state}"] = {
    **payload,
    "timestamp_dt": datetime.now(timezone.utc),
  }


def pop_state_mem(prefix: str, state: str) -> Optional[Dict[str, Any]]:
  return _states.pop(f"{prefix}:{state}", None)

