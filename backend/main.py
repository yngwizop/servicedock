"""
FastAPI Web Dashboard Backend - Refactored
Main application file with modular structure
"""
import os
import json
import json as json_lib
from datetime import timedelta, datetime
from typing import Any
from fastapi import FastAPI, HTTPException, Depends, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from proxmoxer import ProxmoxAPI
import requests
from requests.packages.urllib3.exceptions import InsecureRequestWarning

# Local imports
from config import (
    initialize_connection_pool, get_db,
    ENVIRONMENT, FRONTEND_URL, ACCESS_TOKEN_EXPIRE_MINUTES
)
import config.database
from core import (
    logger, verify_password, create_access_token,
    encrypt_value, decrypt_value, log_audit,
    check_login_rate_limit, record_failed_login, reset_failed_login
)
from middleware import SecurityHeadersMiddleware
from models import AdminLogin, ProxmoxConfig, Shortcut, Service, DeleteLogsRequest
from dependencies import require_role, get_client_ip, ADMIN_PASSWORD_HASH

# Import routers
from routers.shortcuts import router as shortcuts_router
from routers.services import router as services_router
from routers.appearance import router as appearance_router

# Disable SSL warnings
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

# Initialize FastAPI app
app = FastAPI(title="Web Dashboard API", version="2.0")

# Rate Limiter Setup
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# === CORS Configuration ===
if ENVIRONMENT == "production":
    if not FRONTEND_URL:
        raise ValueError("FRONTEND_URL required in production!")
    allowed_origins = [FRONTEND_URL]
    logger.info(f"🔒 CORS Production mode: Only {FRONTEND_URL} allowed")
else:
    # Development mode
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:4173",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:4173",
        "http://127.0.0.1:5173",
    ]
    if FRONTEND_URL:
        allowed_origins.append(FRONTEND_URL)
    
    logger.info(f"⚠️ CORS Development mode: {len(allowed_origins)} origins allowed")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# === Startup Event ===
@app.on_event("startup")
async def startup_event():
    """Initialize app on startup"""
    initialize_connection_pool()
    logger.info("✅ Application startup complete")

# === Include Routers ===
app.include_router(shortcuts_router)
app.include_router(services_router)
app.include_router(appearance_router)

# === Root Endpoint ===
@app.get("/")
def root():
    return {"message": "Web Dashboard Backend v2.0", "status": "running"}

# ===== AUTH ENDPOINT =====
@app.post("/api/login")
@limiter.limit("5/minute")
def login(creds: AdminLogin, request: Request):
    """Login with dual-layer rate-limiting"""
    client_ip = get_client_ip(request)
    
    # Layer 2: Check IP-based lockout
    is_allowed, error_msg = check_login_rate_limit(client_ip)
    if not is_allowed:
        log_audit(
            action="LOGIN_BLOCKED",
            status="denied",
            user_type="admin",
            ip_address=client_ip,
            details={"reason": "too_many_failed_attempts"}
        )
        raise HTTPException(status_code=429, detail=error_msg)
    
    # Verify password
    if not verify_password(creds.password, ADMIN_PASSWORD_HASH):
        record_failed_login(client_ip)
        
        log_audit(
            action="LOGIN_FAILED",
            status="failed",
            user_type="admin",
            ip_address=client_ip,
            details={"reason": "invalid_password"}
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Success - reset counter
    reset_failed_login(client_ip)
    
    # Create JWT token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": "admin", "type": "admin"},
        expires_delta=access_token_expires
    )
    
    log_audit(
        action="LOGIN_SUCCESS",
        status="success",
        user_type="admin",
        ip_address=client_ip
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

# ===== REORDER ENDPOINTS =====
@app.put("/api/admin/services/reorder")
def reorder_services(body: Any = Body(...), token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    """Reorder services"""
    new_order = body.get("newOrder", [])
    if not new_order or not isinstance(new_order, list):
        raise HTTPException(status_code=400, detail="newOrder array is required")
    
    cur = db.cursor()
    try:
        for idx, service_id in enumerate(new_order):
            cur.execute(
                "UPDATE services SET position = %s WHERE id = %s;",
                (idx, service_id)
            )
        db.commit()
        return {"message": "Services reordered successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Reorder services failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to reorder services")

@app.put("/api/admin/shortcuts/reorder")
def reorder_shortcuts(body: Any = Body(...), token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    """Reorder shortcuts"""
    new_order = body.get("newOrder", [])
    if not new_order or not isinstance(new_order, list):
        raise HTTPException(status_code=400, detail="newOrder array is required")
    
    cur = db.cursor()
    try:
        for idx, shortcut_id in enumerate(new_order):
            cur.execute(
                "UPDATE shortcuts SET position = %s WHERE id = %s;",
                (idx, shortcut_id)
            )
        db.commit()
        return {"message": "Shortcuts reordered successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Reorder shortcuts failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to reorder shortcuts")

# - routers/auth.py (login - above)
# - routers/proxmox.py (~350 lines)
# - routers/admin.py (audit logs, ~200 lines)
# These remain inline for now due to size/complexity

# ===== PROXMOX ENDPOINTS =====
def get_proxmox_connection():
    """
    Holt Proxmox-Konfiguration aus DB und erstellt API-Verbindung.
    
    WICHTIG: Diese Funktion holt sich die Connection selbst aus dem Pool,
    da sie von mehreren Endpoints aufgerufen wird (nicht als FastAPI Dependency).
    """
    if config.database.db_pool is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    conn = None
    try:
        conn = config.database.db_pool.getconn()
        cur = conn.cursor()
        cur.execute(
            "SELECT host, port, token_name, token_value, verify_ssl, node FROM proxmox_config WHERE id = 1;"
        )
        row = cur.fetchone()
        cur.close()
        
        if not row:
            return None, None
        
        host, port, token_name, token_value_encrypted, verify_ssl, node = row
        
        # Entschlüssele den Token
        token_value = decrypt_value(token_value_encrypted)
        
        if not token_value:
            logger.error("Failed to decrypt Proxmox token")
            return None, None
        
        try:
            # Token Format: "user@realm!tokenname"
            # Proxmoxer erwartet user und token_name getrennt
            if '!' in token_name:
                user_part = token_name.split('!')[0]  # z.B. "root@pam"
                token_id = token_name.split('!')[1]   # z.B. "mytoken"
            else:
                # Fallback wenn kein ! vorhanden
                user_part = token_name
                token_id = 'default'
            
            # Proxmox API Connection erstellen
            proxmox = ProxmoxAPI(
                host,
                port=port,
                user=user_part,
                token_name=token_id,
                token_value=token_value,
                verify_ssl=verify_ssl
            )
            return proxmox, node
        except Exception as e:
            # Keine Details loggen, um Token-Leaks zu vermeiden
            logger.error("Proxmox connection error")
            return None, None
    finally:
        if conn is not None:
            config.database.db_pool.putconn(conn)

@app.get("/api/proxmox/config")
def get_proxmox_config(token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    """Gibt Proxmox-Konfiguration zurück (ohne Secret, token_name maskiert)"""
    cur = db.cursor()
    cur.execute(
        "SELECT id, host, port, token_name, verify_ssl, node FROM proxmox_config WHERE id = 1;"
    )
    row = cur.fetchone()
    
    if not row:
        return {
            "configured": False,
            "host": None,
            "port": 8006,
            "token_name": None,
            "verify_ssl": False,
            "node": None
        }
    
    # Maskiere token_name: zeige nur user@realm!*** statt vollem Token-Namen
    token_name = row[3]
    masked_token_name = None
    if token_name and '!' in token_name:
        user_realm = token_name.split('!')[0]  # z.B. "lxc-creator@pve"
        masked_token_name = f"{user_realm}!***"
    elif token_name:
        masked_token_name = "***"
    
    return {
        "configured": True,
        "id": row[0],
        "host": row[1],
        "port": row[2],
        "token_name": masked_token_name,
        "verify_ssl": row[4],
        "node": row[5]
    }

@app.put("/api/proxmox/config")
def update_proxmox_config(config: ProxmoxConfig, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    """Speichert Proxmox-Konfiguration (Token wird verschlüsselt)"""
    cur = db.cursor()
    
    # Verschlüssele den Token-Wert
    encrypted_token = encrypt_value(config.token_value)
    
    # Prüfe ob Eintrag existiert
    cur.execute("SELECT id, token_value FROM proxmox_config WHERE id = 1;")
    existing = cur.fetchone()
    
    # Wenn kein neuer Token angegeben wurde, behalte den alten
    token_was_updated = bool(config.token_value)
    if not config.token_value and existing:
        encrypted_token = existing[1]  # Behalte den alten verschlüsselten Token
    
    if existing:
        # Wenn ein neuer Token gesetzt wurde, aktualisiere token_created_at
        if token_was_updated:
            cur.execute(
                """UPDATE proxmox_config 
                   SET host=%s, port=%s, token_name=%s, token_value=%s, verify_ssl=%s, node=%s, token_created_at=NOW() 
                   WHERE id=1 
                   RETURNING id;""",
                (config.host, config.port, config.token_name, encrypted_token, config.verify_ssl, config.node)
            )
        else:
            cur.execute(
                """UPDATE proxmox_config 
                   SET host=%s, port=%s, token_name=%s, token_value=%s, verify_ssl=%s, node=%s 
                   WHERE id=1 
                   RETURNING id;""",
                (config.host, config.port, config.token_name, encrypted_token, config.verify_ssl, config.node)
            )
    else:
        cur.execute(
            """INSERT INTO proxmox_config (id, host, port, token_name, token_value, verify_ssl, node) 
               VALUES (1, %s, %s, %s, %s, %s, %s) 
               RETURNING id;""",
            (config.host, config.port, config.token_name, encrypted_token, config.verify_ssl, config.node)
        )
    
    updated = cur.fetchone()
    db.commit()
    
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to save Proxmox configuration")
    
    return {"message": "Proxmox configuration saved"}

@app.get("/api/proxmox/vms")
@limiter.limit("30/minute")  # Max 30 Anfragen pro Minute
def get_proxmox_vms(request: Request, db = Depends(get_db)):
    """Holt alle VMs und LXCs von Proxmox"""
    client_ip = get_client_ip(request)
    
    proxmox, configured_node = get_proxmox_connection()
    
    if not proxmox:
        log_audit(
            action="VIEW_VMS",
            status="failed",
            user_type="guest",
            ip_address=client_ip,
            details={"error": "Proxmox not configured"}
        )
        raise HTTPException(status_code=404, detail="Proxmox not configured")
    
    try:
        all_resources = []
        
        # Hole alle Nodes
        nodes = proxmox.nodes.get()
        
        for node_data in nodes:
            node_name = node_data['node']
            
            # Wenn ein spezifischer Node konfiguriert ist, nur diesen abfragen
            if configured_node and node_name != configured_node:
                continue
            
            try:
                # Hole QEMUs (VMs)
                qemus = proxmox.nodes(node_name).qemu.get()
                for vm in qemus:
                    all_resources.append({
                        "id": f"qemu-{node_name}-{vm['vmid']}",
                        "vmid": vm['vmid'],
                        "name": vm.get('name', f"VM {vm['vmid']}"),
                        "type": "qemu",
                        "status": vm.get('status', 'unknown'),
                        "cpu": vm.get('cpu', 0),
                        "mem": vm.get('mem', 0),
                        "maxmem": vm.get('maxmem', 0),
                        "disk": vm.get('disk', 0),
                        "maxdisk": vm.get('maxdisk', 0),
                        "uptime": vm.get('uptime', 0),
                        "node": node_name
                    })
                
                # Hole LXCs (Container)
                lxcs = proxmox.nodes(node_name).lxc.get()
                for container in lxcs:
                    all_resources.append({
                        "id": f"lxc-{node_name}-{container['vmid']}",
                        "vmid": container['vmid'],
                        "name": container.get('name', f"CT {container['vmid']}"),
                        "type": "lxc",
                        "status": container.get('status', 'unknown'),
                        "cpu": container.get('cpu', 0),
                        "mem": container.get('mem', 0),
                        "maxmem": container.get('maxmem', 0),
                        "disk": container.get('disk', 0),
                        "maxdisk": container.get('maxdisk', 0),
                        "uptime": container.get('uptime', 0),
                        "node": node_name
                    })
            except Exception as e:
                logger.error(f"Error fetching resources from node {node_name}", exc_info=False)
                continue
        
        # Log erfolgreichen Zugriff
        log_audit(
            action="VIEW_VMS",
            status="success",
            user_type="guest",
            ip_address=client_ip,
            details={"count": len(all_resources)}
        )
        
        return {"resources": all_resources}
        
    except Exception as e:
        logger.error("Proxmox API error", exc_info=False)
        log_audit(
            action="VIEW_VMS",
            status="failed",
            user_type="guest",
            ip_address=client_ip,
            details={"error": "API error"}  # Keine Exception-Details!
        )
        raise HTTPException(status_code=500, detail="Failed to fetch Proxmox resources")

@app.post("/api/proxmox/vm/{vmid}/start")
@limiter.limit("10/minute")  # Max 10 Start-Befehle pro Minute
def start_proxmox_vm(vmid: int, vm_type: str = "qemu", request: Request = None, token: dict = Depends(require_role("admin"))):
    """Startet eine VM oder LXC"""
    client_ip = get_client_ip(request) if request else "unknown"
    
    proxmox, _ = get_proxmox_connection()
    
    if not proxmox:
        log_audit(
            action="START_VM",
            status="failed",
            user_type="admin",
            ip_address=client_ip,
            resource_type=vm_type,
            resource_id=str(vmid),
            details={"error": "Proxmox not configured"}
        )
        raise HTTPException(status_code=404, detail="Proxmox not configured")
    
    try:
        # Finde den richtigen Node für diese VM/LXC
        nodes = proxmox.nodes.get()
        
        for node_data in nodes:
            node_name = node_data['node']
            
            if vm_type == "qemu":
                vms = proxmox.nodes(node_name).qemu.get()
                if any(vm['vmid'] == vmid for vm in vms):
                    proxmox.nodes(node_name).qemu(vmid).status.start.post()
                    log_audit(
                        action="START_VM",
                        status="success",
                        user_type="admin",
                        ip_address=client_ip,
                        resource_type=vm_type,
                        resource_id=str(vmid),
                        details={"node": node_name}
                    )
                    return {"message": f"VM {vmid} started"}
            else:  # lxc
                containers = proxmox.nodes(node_name).lxc.get()
                if any(ct['vmid'] == vmid for ct in containers):
                    proxmox.nodes(node_name).lxc(vmid).status.start.post()
                    log_audit(
                        action="START_LXC",
                        status="success",
                        user_type="admin",
                        ip_address=client_ip,
                        resource_type=vm_type,
                        resource_id=str(vmid),
                        details={"node": node_name}
                    )
                    return {"message": f"Container {vmid} started"}
        
        log_audit(
            action="START_VM",
            status="failed",
            user_type="admin",
            ip_address=client_ip,
            resource_type=vm_type,
            resource_id=str(vmid),
            details={"error": "VM not found"}
        )
        raise HTTPException(status_code=404, detail=f"VM/Container {vmid} not found")
        
    except Exception as e:
        error_msg = str(e)
        # Prüfe auf Permission-Fehler
        if "Permission" in error_msg or "403" in error_msg or "authorization" in error_msg.lower():
            detail = "Permission denied. API token needs 'PVEVMAdmin' role."
        else:
            detail = f"Failed to start VM: {error_msg}"
        
        log_audit(
            action="START_VM",
            status="failed",
            user_type="admin",
            ip_address=client_ip,
            resource_type=vm_type,
            resource_id=str(vmid),
            details={"error": error_msg}
        )
        logger.error(f"Proxmox VM start failed: {error_msg}", exc_info=False)
        raise HTTPException(status_code=500, detail=detail)

@app.post("/api/proxmox/vm/{vmid}/stop")
@limiter.limit("10/minute")  # Max 10 Stop-Befehle pro Minute
def stop_proxmox_vm(vmid: int, vm_type: str = "qemu", request: Request = None, token: dict = Depends(require_role("admin"))):
    """Stoppt eine VM oder LXC"""
    client_ip = get_client_ip(request) if request else "unknown"
    proxmox, _ = get_proxmox_connection()
    
    if not proxmox:
        log_audit(action="STOP_VM", status="failed", user_type="admin", ip_address=client_ip,
                  resource_type=vm_type, resource_id=str(vmid), details={"error": "Proxmox not configured"})
        raise HTTPException(status_code=404, detail="Proxmox not configured")
    
    try:
        nodes = proxmox.nodes.get()
        
        for node_data in nodes:
            node_name = node_data['node']
            
            if vm_type == "qemu":
                vms = proxmox.nodes(node_name).qemu.get()
                if any(vm['vmid'] == vmid for vm in vms):
                    proxmox.nodes(node_name).qemu(vmid).status.stop.post()
                    log_audit(action="STOP_VM", status="success", user_type="admin", ip_address=client_ip,
                              resource_type=vm_type, resource_id=str(vmid), details={"node": node_name})
                    return {"message": f"VM {vmid} stopped"}
            else:  # lxc
                containers = proxmox.nodes(node_name).lxc.get()
                if any(ct['vmid'] == vmid for ct in containers):
                    proxmox.nodes(node_name).lxc(vmid).status.stop.post()
                    log_audit(action="STOP_LXC", status="success", user_type="admin", ip_address=client_ip,
                              resource_type=vm_type, resource_id=str(vmid), details={"node": node_name})
                    return {"message": f"Container {vmid} stopped"}
        
        log_audit(action="STOP_VM", status="failed", user_type="admin", ip_address=client_ip,
                  resource_type=vm_type, resource_id=str(vmid), details={"error": "VM not found"})
        raise HTTPException(status_code=404, detail=f"VM/Container {vmid} not found")
        
    except Exception as e:
        error_msg = str(e)
        # Prüfe auf Permission-Fehler
        if "Permission" in error_msg or "403" in error_msg or "authorization" in error_msg.lower():
            detail = "Permission denied. API token needs 'PVEVMAdmin' role."
        else:
            detail = f"Failed to stop VM: {error_msg}"
        
        log_audit(action="STOP_VM", status="failed", user_type="admin", ip_address=client_ip,
                  resource_type=vm_type, resource_id=str(vmid), details={"error": error_msg})
        logger.error(f"Proxmox VM stop failed: {error_msg}", exc_info=False)
        raise HTTPException(status_code=500, detail=detail)

@app.post("/api/proxmox/vm/{vmid}/reboot")
@limiter.limit("10/minute")  # Max 10 Reboot-Befehle pro Minute
def reboot_proxmox_vm(vmid: int, vm_type: str = "qemu", request: Request = None, token: dict = Depends(require_role("admin"))):
    """Startet eine VM oder LXC neu"""
    client_ip = get_client_ip(request) if request else "unknown"
    proxmox, _ = get_proxmox_connection()
    
    if not proxmox:
        log_audit(action="REBOOT_VM", status="failed", user_type="admin", ip_address=client_ip,
                  resource_type=vm_type, resource_id=str(vmid), details={"error": "Proxmox not configured"})
        raise HTTPException(status_code=404, detail="Proxmox not configured")
    
    try:
        nodes = proxmox.nodes.get()
        
        for node_data in nodes:
            node_name = node_data['node']
            
            if vm_type == "qemu":
                vms = proxmox.nodes(node_name).qemu.get()
                if any(vm['vmid'] == vmid for vm in vms):
                    proxmox.nodes(node_name).qemu(vmid).status.reboot.post()
                    log_audit(action="REBOOT_VM", status="success", user_type="admin", ip_address=client_ip,
                              resource_type=vm_type, resource_id=str(vmid), details={"node": node_name})
                    return {"message": f"VM {vmid} rebooting"}
            else:  # lxc
                containers = proxmox.nodes(node_name).lxc.get()
                if any(ct['vmid'] == vmid for ct in containers):
                    proxmox.nodes(node_name).lxc(vmid).status.reboot.post()
                    log_audit(action="REBOOT_LXC", status="success", user_type="admin", ip_address=client_ip,
                              resource_type=vm_type, resource_id=str(vmid), details={"node": node_name})
                    return {"message": f"Container {vmid} rebooting"}
        
        log_audit(action="REBOOT_VM", status="failed", user_type="admin", ip_address=client_ip,
                  resource_type=vm_type, resource_id=str(vmid), details={"error": "VM not found"})
        raise HTTPException(status_code=404, detail=f"VM/Container {vmid} not found")
        
    except Exception as e:
        error_msg = str(e)
        # Prüfe auf Permission-Fehler
        if "Permission" in error_msg or "403" in error_msg or "authorization" in error_msg.lower():
            detail = "Permission denied. API token needs 'PVEVMAdmin' role."
        else:
            detail = f"Failed to reboot VM: {error_msg}"
        
        log_audit(action="REBOOT_VM", status="failed", user_type="admin", ip_address=client_ip,
                  resource_type=vm_type, resource_id=str(vmid), details={"error": error_msg})
        logger.error(f"Proxmox VM reboot failed: {error_msg}", exc_info=False)
        raise HTTPException(status_code=500, detail=detail)

# ===== ADMIN ENDPOINTS =====
@app.get("/api/admin/audit-logs")
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

@app.get("/api/admin/audit-stats")
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

@app.post("/api/admin/audit-logs/cleanup")
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

@app.post("/api/admin/audit-logs/delete-all")
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

@app.get("/api/admin/proxmox/token-info")
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
    from datetime import datetime, timezone
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

@app.post("/api/admin/proxmox/rotate-token")
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
        raise HTTPException(status_code=404, detail="Proxmox config not found")
    
    return {"message": "Token rotated successfully", "timestamp": datetime.now().isoformat()}