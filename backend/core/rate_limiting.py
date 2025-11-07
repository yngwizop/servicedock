"""Rate limiting for failed login attempts"""
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Tuple

from config.settings import MAX_FAILED_ATTEMPTS, LOCKOUT_DURATION_MINUTES, LOCKOUT_RESET_MINUTES
from core.logging import logger

# Structure: {ip: {"count": int, "locked_until": datetime, "first_attempt": datetime}}
failed_login_attempts = defaultdict(lambda: {"count": 0, "locked_until": None, "first_attempt": None})

def check_login_rate_limit(ip: str) -> Tuple[bool, str]:
    """
    Prüft ob IP für Login blockiert ist.
    
    Returns:
        (is_allowed: bool, message: str)
    """
    now = datetime.utcnow()
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
    """Registriert fehlgeschlagenen Login-Versuch und sperrt bei Bedarf."""
    now = datetime.utcnow()
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
    """Setzt Failed-Login-Counter nach erfolgreichem Login zurück."""
    if ip in failed_login_attempts:
        del failed_login_attempts[ip]
