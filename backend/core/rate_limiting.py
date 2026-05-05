"""Rate limiting for failed login attempts"""
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from typing import Tuple
import threading
import os
import json

from config.settings import MAX_FAILED_ATTEMPTS, LOCKOUT_DURATION_MINUTES, LOCKOUT_RESET_MINUTES
from core.logging import logger

# Structure: {ip: {"count": int, "locked_until": datetime, "first_attempt": datetime}}
failed_login_attempts = defaultdict(lambda: {"count": 0, "locked_until": None, "first_attempt": None})

# Thread-Lock für Thread-Safety bei gleichzeitigen Login-Versuchen
_login_lock = threading.Lock()


def _redis_client():
    url = os.getenv("REDIS_URL", "").strip()
    if not url:
        return None
    try:
        import redis  # lazy import

        return redis.Redis.from_url(url, decode_responses=True)
    except Exception as exc:
        logger.warning(f"Redis disabled for login rate limiting: {exc}")
        return None


def _key(ip: str) -> str:
    return f"login_fail:{ip}"


def _load_redis_state(r, ip: str):
    raw = r.get(_key(ip))
    if not raw:
        return {"count": 0, "locked_until": None, "first_attempt": None}
    try:
        data = json.loads(raw)
        return {
            "count": int(data.get("count", 0)),
            "locked_until": data.get("locked_until"),
            "first_attempt": data.get("first_attempt"),
        }
    except Exception:
        return {"count": 0, "locked_until": None, "first_attempt": None}


def _save_redis_state(r, ip: str, state):
    # TTL ensures state disappears after reset window
    ttl_seconds = max(int(LOCKOUT_RESET_MINUTES * 60), 60)
    r.set(_key(ip), json.dumps(state), ex=ttl_seconds)


def check_login_rate_limit(ip: str) -> Tuple[bool, str]:
    """
    Prüft ob IP für Login blockiert ist.
    Thread-safe durch Lock.
    
    Returns:
        (is_allowed: bool, message: str)
    """
    r = _redis_client()
    if r is not None:
        now = datetime.now(timezone.utc)
        state = _load_redis_state(r, ip)
        locked_until = state.get("locked_until")
        first_attempt = state.get("first_attempt")
        count = int(state.get("count", 0))

        # locked?
        if locked_until:
            try:
                locked_dt = datetime.fromisoformat(locked_until)
            except Exception:
                locked_dt = None
            if locked_dt and now < locked_dt:
                remaining = int((locked_dt - now).total_seconds() / 60)
                return False, f"Too many failed login attempts. Try again in {remaining} minutes."
            # lock expired -> reset
            count = 0
            locked_until = None
            first_attempt = None

        if first_attempt:
            try:
                first_dt = datetime.fromisoformat(first_attempt)
            except Exception:
                first_dt = None
            if first_dt:
                time_since_first = (now - first_dt).total_seconds() / 60
                if time_since_first > LOCKOUT_RESET_MINUTES:
                    count = 0
                    first_attempt = None

        _save_redis_state(
            r,
            ip,
            {
                "count": count,
                "locked_until": locked_until,
                "first_attempt": first_attempt,
            },
        )
        return True, ""

    with _login_lock:
        now = datetime.now(timezone.utc)
        attempt_data = failed_login_attempts[ip]
        
        # 1. Prüfe ob IP aktuell gesperrt ist
        if attempt_data["locked_until"]:
            if now < attempt_data["locked_until"]:
                remaining = int((attempt_data["locked_until"] - now).total_seconds() / 60)
                return False, f"Too many failed login attempts. Try again in {remaining} minutes."
            else:
                # Lock abgelaufen → Reset
                attempt_data["count"] = 0
                attempt_data["locked_until"] = None
                attempt_data["first_attempt"] = None
        
        # 2. Reset Counter wenn letzter Versuch > 60min her
        if attempt_data["first_attempt"]:
            time_since_first = (now - attempt_data["first_attempt"]).total_seconds() / 60
            if time_since_first > LOCKOUT_RESET_MINUTES:
                attempt_data["count"] = 0
                attempt_data["first_attempt"] = None
        
        # 3. IP ist nicht gesperrt
        return True, ""

def record_failed_login(ip: str):
    """
    Registriert fehlgeschlagenen Login-Versuch und sperrt bei Bedarf.
    Thread-safe durch Lock.
    """
    r = _redis_client()
    if r is not None:
        now = datetime.now(timezone.utc)
        state = _load_redis_state(r, ip)
        if not state.get("first_attempt"):
            state["first_attempt"] = now.isoformat()
        state["count"] = int(state.get("count", 0)) + 1
        if int(state["count"]) >= MAX_FAILED_ATTEMPTS:
            locked_until = now + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            state["locked_until"] = locked_until.isoformat()
            logger.warning(
                f"IP {ip} locked out for {LOCKOUT_DURATION_MINUTES} minutes after {state['count']} failed attempts"
            )
        _save_redis_state(r, ip, state)
        return

    with _login_lock:
        now = datetime.now(timezone.utc)
        attempt_data = failed_login_attempts[ip]
        
        # Erster Versuch → Timestamp setzen
        if attempt_data["first_attempt"] is None:
            attempt_data["first_attempt"] = now
        
        # Counter erhöhen
        attempt_data["count"] += 1
        
        # Sperre aktivieren bei MAX_FAILED_ATTEMPTS
        if attempt_data["count"] >= MAX_FAILED_ATTEMPTS:
            attempt_data["locked_until"] = now + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            logger.warning(f"IP {ip} locked out for {LOCKOUT_DURATION_MINUTES} minutes after {attempt_data['count']} failed attempts")

def reset_failed_login(ip: str):
    """
    Setzt Failed-Login-Counter nach erfolgreichem Login zurück.
    Thread-safe durch Lock.
    """
    r = _redis_client()
    if r is not None:
        try:
            r.delete(_key(ip))
        except Exception:
            pass
        return

    with _login_lock:
        if ip in failed_login_attempts:
            del failed_login_attempts[ip]
