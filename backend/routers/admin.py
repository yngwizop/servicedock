"""Admin router - Audit logs and token management"""
import json as json_lib
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends

from models import DeleteLogsRequest, ProxmoxConfig
from core.security import verify_password, encrypt_value
from core.audit import log_audit
from dependencies.auth import require_role, ADMIN_PASSWORD_HASH
from config.database import get_db

router = APIRouter()

@router.get("/api/admin/audit-logs")
def get_audit_logs(limit: int = 100, offset: int = 0, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    """Holt die neuesten Audit-Log-Einträge (Admin-only)"""
    cur = db.cursor()
    
    cur.execute(
        """SELECT id, timestamp, user_type, ip_address, action, resource_type, 
                  resource_id, status, details, user_agent
           FROM audit_log
           ORDER BY timestamp DESC
           LIMIT %s OFFSET %s;""",
        (limit, offset)
    )
    
    rows = cur.fetchall()
    
    # Zähle total Einträge
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
        "limit": limit,
        "offset": offset
    }

@router.get("/api/admin/audit-stats")
def get_audit_stats(token: dict = Depends(require_role("admin")), db = Depends(get_db)):
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
    
    return {
        "actions_24h": actions_24h,
        "top_ips": top_ips,
        "error_stats": error_stats
    }

@router.post("/api/admin/audit-logs/cleanup")
def cleanup_old_audit_logs(days: int = 90, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    """Löscht Audit-Logs die älter als X Tage sind (Standard: 90 Tage)"""
    cur = db.cursor()
    
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
def delete_all_audit_logs(request: DeleteLogsRequest, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    """Löscht ALLE Audit-Logs (Admin-Passwort erforderlich)"""
    
    # Zusätzliche Passwort-Prüfung für diese kritische Operation
    if not verify_password(request.password, ADMIN_PASSWORD_HASH):
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
def get_token_info(token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    """Gibt Informationen über das Alter des aktuellen Tokens zurück"""
    cur = db.cursor()
    
    cur.execute("""
        SELECT token_created_at, token_last_rotated, token_name
        FROM proxmox_config
        WHERE id = 1;
    """)
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
