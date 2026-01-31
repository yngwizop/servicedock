"""Admin router - Audit logs and token management"""
import json as json_lib
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Request

from models import DeleteLogsRequest, ProxmoxConfig
from core.security import verify_password, encrypt_value
from core.audit import log_audit
from core.limiter import limiter
from dependencies.auth import require_role, ADMIN_PASSWORD_HASH
from config.database import get_db

router = APIRouter()

@router.get("/api/admin/audit-logs")
@limiter.limit("30/minute")  # Rate limit for audit log access
def get_audit_logs(
    request: Request, 
    limit: int = 100, 
    offset: int = 0, 
    filter_type: str = "all",  # all, failed, failed_logins, permission_errors, vm_operations, success
    token: dict = Depends(require_role("admin")), 
    db = Depends(get_db)
):
    """Holt die neuesten Audit-Log-Einträge mit optionaler Filterung (Admin-only)"""
    cur = db.cursor()
    
    # Build WHERE clause based on filter
    where_clause = ""
    if filter_type == "failed":
        where_clause = "WHERE status = 'failed'"
    elif filter_type == "failed_logins":
        where_clause = "WHERE action = 'LOGIN' AND status = 'failed'"
    elif filter_type == "permission_errors":
        where_clause = "WHERE status = 'failed' AND (details::text ILIKE '%permission%' OR details::text ILIKE '%forbidden%' OR details::text ILIKE '%403%')"
    elif filter_type == "vm_operations":
        where_clause = "WHERE action IN ('START_VM', 'STOP_VM', 'REBOOT_VM', 'START_LXC', 'STOP_LXC', 'REBOOT_LXC')"
    elif filter_type == "success":
        where_clause = "WHERE status = 'success'"
    
    cur.execute(
        f"""SELECT id, timestamp, user_type, ip_address, action, resource_type, 
                  resource_id, status, details, user_agent
           FROM audit_log
           {where_clause}
           ORDER BY timestamp DESC
           LIMIT %s OFFSET %s;""",
        (limit, offset)
    )
    
    rows = cur.fetchall()
    
    # Zähle total Einträge (mit Filter)
    cur.execute(f"SELECT COUNT(*) FROM audit_log {where_clause};")
    filtered_total = cur.fetchone()[0]
    
    # Zähle alle Einträge (ohne Filter)
    cur.execute("SELECT COUNT(*) FROM audit_log;")
    total = cur.fetchone()[0]
    
    logs = []
    for row in rows:
        logs.append({
            "id": row[0],
            "timestamp": row[1].isoformat() if row[1] else None,
            "user_type": row[2],
            "ip_address": row[3],
            "action": row[4],
            "resource_type": row[5],
            "resource_id": row[6],
            "status": row[7],
            "details": json_lib.loads(row[8]) if row[8] else None,
            "user_agent": row[9]
        })
    
    return {
        "logs": logs,
        "total": total,
        "filtered_total": filtered_total,
        "limit": limit,
        "offset": offset
    }

@router.get("/api/admin/audit-stats")
@limiter.limit("30/minute")
def get_audit_stats(request: Request, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    """Holt Statistiken über Audit-Logs (Admin-only)"""
    cur = db.cursor()
    
    # Aktionen der letzten 24h
    cur.execute("""
        SELECT action, COUNT(*) as count
        FROM audit_log
        WHERE timestamp > NOW() - INTERVAL '24 hours'
        GROUP BY action
        ORDER BY count DESC;
    """)
    actions_24h = [{"action": row[0], "count": row[1]} for row in cur.fetchall()]
    
    # Top IPs der letzten 7 Tage
    cur.execute("""
        SELECT ip_address, COUNT(*) as count
        FROM audit_log
        WHERE timestamp > NOW() - INTERVAL '7 days'
        GROUP BY ip_address
        ORDER BY count DESC
        LIMIT 10;
    """)
    top_ips = [{"ip": row[0], "count": row[1]} for row in cur.fetchall()]
    
    # Fehlerrate
    cur.execute("""
        SELECT 
            COUNT(CASE WHEN status = 'success' THEN 1 END) as success_count,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
            COUNT(*) as total_count
        FROM audit_log
        WHERE timestamp > NOW() - INTERVAL '24 hours';
    """)
    row = cur.fetchone()
    error_stats = {
        "success": row[0] or 0,
        "failed": row[1] or 0,
        "total": row[2] or 0
    }
    
    # Security Threats (24h)
    # Failed Logins (Login-Versuche mit status=failed)
    cur.execute("""
        SELECT COUNT(*) 
        FROM audit_log
        WHERE action = 'LOGIN' 
          AND status = 'failed'
          AND timestamp > NOW() - INTERVAL '24 hours';
    """)
    failed_logins = cur.fetchone()[0] or 0
    
    # Permission Denied Errors (aus details JSON)
    cur.execute("""
        SELECT COUNT(*) 
        FROM audit_log
        WHERE status = 'failed'
          AND (details::text ILIKE '%permission%' OR details::text ILIKE '%forbidden%' OR details::text ILIKE '%403%')
          AND timestamp > NOW() - INTERVAL '24 hours';
    """)
    permission_errors = cur.fetchone()[0] or 0
    
    # Unique IPs mit fehlgeschlagenen Anfragen (potenzielle Angreifer)
    cur.execute("""
        SELECT COUNT(DISTINCT ip_address)
        FROM audit_log
        WHERE status = 'failed'
          AND timestamp > NOW() - INTERVAL '24 hours';
    """)
    failed_ips = cur.fetchone()[0] or 0
    
    return {
        "actions_24h": actions_24h,
        "top_ips": top_ips,
        "error_stats": error_stats,
        "security_threats": {
            "failed_logins": failed_logins,
            "permission_errors": permission_errors,
            "blocked_ips": failed_ips,  # IPs mit failed requests
            "suspicious_activity": failed_logins > 10 or permission_errors > 5
        }
    }

@router.post("/api/admin/audit-logs/cleanup")
@limiter.limit("10/hour")  # Very strict limit for cleanup operations
def cleanup_audit_logs(request: Request, days: int = 90, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    """Löscht Audit-Logs die älter als X Tage sind (Standard: 90 Tage)"""
    cur = db.cursor()
    
    # Validiere days Parameter
    if days < 1:
        raise HTTPException(status_code=400, detail="Days must be at least 1")
    if days > 365:
        raise HTTPException(status_code=400, detail="Days cannot exceed 365")
    
    # Zähle wie viele gelöscht werden
    cur.execute(
        "SELECT COUNT(*) FROM audit_log WHERE timestamp < NOW() - make_interval(days => %s);",
        (days,)
    )
    count_to_delete = cur.fetchone()[0]
    
    # Lösche alte Einträge
    cur.execute(
        "DELETE FROM audit_log WHERE timestamp < NOW() - make_interval(days => %s);",
        (days,)
    )
    
    db.commit()
    
    return {
        "message": f"Alte Audit-Logs gelöscht",
        "deleted_count": count_to_delete,
        "older_than_days": days
    }

@router.post("/api/admin/audit-logs/delete-all")
@limiter.limit("3/hour")  # Extremely strict limit for delete all
def delete_all_audit_logs(request: Request, delete_request: DeleteLogsRequest, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    """Löscht ALLE Audit-Logs (Admin-Passwort erforderlich)"""
    
    # Zusätzliche Passwort-Prüfung für diese kritische Operation
    if not verify_password(delete_request.password, ADMIN_PASSWORD_HASH):
        raise HTTPException(status_code=403, detail="Falsches Admin-Passwort")
    
    cur = db.cursor()
    
    # Zähle wie viele gelöscht werden
    cur.execute("SELECT COUNT(*) FROM audit_log;")
    count_to_delete = cur.fetchone()[0]
    
    # Lösche alle Einträge
    cur.execute("DELETE FROM audit_log;")
    
    # Setze Auto-Increment zurück
    cur.execute("ALTER SEQUENCE audit_log_id_seq RESTART WITH 1;")
    
    db.commit()
    
    return {
        "message": "Alle Audit-Logs gelöscht",
        "deleted_count": count_to_delete
    }

# ===== Token Rotation =====

@router.get("/api/admin/proxmox/token-info")
def get_token_info(dashboard_id: int = 1, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    """Gibt Informationen über das Alter des aktuellen Tokens zurück"""
    cur = db.cursor()
    
    cur.execute("""
        SELECT token_created_at, token_last_rotated, token_name
        FROM proxmox_config
        WHERE dashboard_id = %s;
    """, (dashboard_id,))
    row = cur.fetchone()
    
    if not row:
        return {"configured": False}
    
    created_at, last_rotated, token_name = row
    
    # Berechne Alter
    now = datetime.now(timezone.utc)
    
    if last_rotated:
        age_days = (now - last_rotated.replace(tzinfo=timezone.utc)).days
        last_rotated_str = last_rotated.isoformat()
    elif created_at:
        age_days = (now - created_at.replace(tzinfo=timezone.utc)).days
        last_rotated_str = None
    else:
        age_days = None
        last_rotated_str = None
    
    # Empfehlung
    rotation_recommended = age_days and age_days > 60  # Empfehle Rotation nach 60 Tagen
    
    return {
        "configured": True,
        "token_name": token_name,
        "created_at": created_at.isoformat() if created_at else None,
        "last_rotated": last_rotated_str,
        "age_days": age_days,
        "rotation_recommended": rotation_recommended
    }

@router.get("/api/admin/rate-limit-usage")
@limiter.limit("30/minute")
def get_rate_limit_usage(request: Request, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    """
    Gibt aktuellen Rate Limit Verbrauch der letzten Minute zurück.
    Basiert auf Audit-Logs (da SlowAPI In-Memory storage hat).
    """
    cur = db.cursor()
    
    # Login-Requests letzte Minute
    cur.execute("""
        SELECT COUNT(*) 
        FROM audit_log
        WHERE action IN ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGIN_BLOCKED')
          AND timestamp > NOW() - INTERVAL '1 minute';
    """)
    login_count = cur.fetchone()[0] or 0
    
    # Proxmox View Operations (GET requests) letzte Minute
    cur.execute("""
        SELECT COUNT(*) 
        FROM audit_log
        WHERE action = 'VIEW_VMS'
          AND timestamp > NOW() - INTERVAL '1 minute';
    """)
    view_count = cur.fetchone()[0] or 0
    
    # Proxmox Control Operations (START/STOP/REBOOT) letzte Minute
    cur.execute("""
        SELECT COUNT(*) 
        FROM audit_log
        WHERE action IN ('START_VM', 'STOP_VM', 'REBOOT_VM', 'START_LXC', 'STOP_LXC', 'REBOOT_LXC')
          AND timestamp > NOW() - INTERVAL '1 minute';
    """)
    control_count = cur.fetchone()[0] or 0
    
    # Admin Operations (Audit Logs Access) letzte Minute
    cur.execute("""
        SELECT COUNT(*) 
        FROM audit_log
        WHERE action ILIKE '%AUDIT%'
          AND timestamp > NOW() - INTERVAL '1 minute';
    """)
    admin_count = cur.fetchone()[0] or 0
    
    return {
        "login": {
            "current": login_count,
            "limit": 5,
            "percentage": min(100, int((login_count / 5) * 100))
        },
        "proxmox_view": {
            "current": view_count,
            "limit": 20,
            "percentage": min(100, int((view_count / 20) * 100))
        },
        "proxmox_control": {
            "current": control_count,
            "limit": 30,
            "percentage": min(100, int((control_count / 30) * 100))
        },
        "admin": {
            "current": admin_count,
            "limit": 30,
            "percentage": min(100, int((admin_count / 30) * 100))
        }
    }

@router.post("/api/admin/proxmox/rotate-token")
def rotate_token(config: ProxmoxConfig, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    """
    Rotiert den Proxmox-Token (speichert neuen Token und updated Zeitstempel)
    """
    cur = db.cursor()
    
    # Verschlüssele den neuen Token
    encrypted_token = encrypt_value(config.token_value)
    
    # Update mit neuem Token und setze Rotations-Zeitstempel
    cur.execute("""
        UPDATE proxmox_config 
        SET token_value = %s,
            token_name = %s,
            token_last_rotated = NOW()
        WHERE id = 1
        RETURNING id;
    """, (encrypted_token, config.token_name))
    
    updated = cur.fetchone()
    db.commit()
    
    # Log die Rotation
    log_audit(
        action="ROTATE_TOKEN",
        status="success" if updated else "failed",
        user_type="admin",
        details={"token_name": config.token_name}
    )
    
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to rotate token")
    
    return {"message": "Token rotated successfully"}
