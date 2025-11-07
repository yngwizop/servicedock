"""Audit logging functions"""
import json as json_lib
from typing import Optional

import config.database
from core.logging import logger

def sanitize_audit_details(details: dict) -> dict:
    """
    Entfernt sensible Keys aus Audit-Details.
    Verhindert dass Token/Passwörter in Logs landen.
    """
    if not details:
        return details
    
    SENSITIVE_KEYS = [
        'password', 'token', 'token_value', 'secret', 'key',
        'authorization', 'api_key', 'access_token', 'refresh_token',
        'new_token_value', 'token_secret', 'private_key'
    ]
    
    sanitized = details.copy()
    for key in SENSITIVE_KEYS:
        if key in sanitized:
            sanitized[key] = '***REDACTED***'
    
    return sanitized

def log_audit(
    action: str,
    status: str = "success",
    user_type: str = "system",
    ip_address: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[dict] = None,
    user_agent: Optional[str] = None
):
    """
    Schreibt einen Eintrag ins Audit-Log.
    Details werden automatisch sanitized (sensible Daten entfernt).
    
    WICHTIG: Diese Funktion holt sich die Connection selbst aus dem Pool,
    da sie von vielen Stellen aufgerufen wird (nicht als FastAPI Dependency).
    """
    # Hole db_pool zur Laufzeit, nicht beim Import
    pool = config.database.db_pool
    if pool is None:
        logger.error("Cannot write audit log: DB pool not initialized")
        return
    
    conn = None
    try:
        conn = pool.getconn()
        cur = conn.cursor()
        
        # Sanitize details BEFORE logging!
        safe_details = sanitize_audit_details(details)
        details_json = json_lib.dumps(safe_details) if safe_details else None
        
        cur.execute(
            """INSERT INTO audit_log 
               (timestamp, user_type, ip_address, action, resource_type, resource_id, status, details, user_agent)
               VALUES (NOW(), %s, %s, %s, %s, %s, %s, %s, %s);""",
            (user_type, ip_address, action, resource_type, resource_id, status, details_json, user_agent)
        )
        conn.commit()
        cur.close()
    except Exception as e:
        logger.error("Audit log write failed", exc_info=False)
    finally:
        if conn is not None and pool is not None:
            pool.putconn(conn)
