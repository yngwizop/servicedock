"""Proxmox router - VM and container management"""
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.concurrency import run_in_threadpool
from proxmoxer import ProxmoxAPI

import config.database
from models.proxmox import ProxmoxConfig
from core.security import decrypt_value, encrypt_value
from core.logging import logger
from core.audit import log_audit
from core.limiter import limiter
from dependencies.auth import require_role, get_client_ip
from config.database import get_db

router = APIRouter()

def get_proxmox_connection(dashboard_id: int = 1):
    """
    Holt Proxmox-Konfiguration aus DB und erstellt API-Verbindung für spezifisches Dashboard.
    
    WICHTIG: Diese Funktion holt sich die Connection selbst aus dem Pool,
    da sie von mehreren Endpoints aufgerufen wird (nicht als FastAPI Dependency).
    """
    if config.database.db_pool is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    conn = None
    cur = None
    try:
        conn = config.database.db_pool.getconn()
        cur = conn.cursor()
        cur.execute(
            "SELECT host, port, token_name, token_value, verify_ssl, node FROM proxmox_config WHERE dashboard_id = %s;",
            (dashboard_id,)
        )
        row = cur.fetchone()
        
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
    except Exception as e:
        logger.error(f"Database error in get_proxmox_connection: {e}")
        return None, None
    finally:
        if cur is not None:
            try:
                cur.close()  # ✅ Auch im Error-Fall schließen
            except:
                pass
        if conn is not None:
            config.database.db_pool.putconn(conn)

def _get_permission_error_message(e: Exception) -> str:
    """Helper: Gibt passende Error-Message für Permission-Fehler zurück"""
    error_msg = str(e)
    if "Permission" in error_msg or "403" in error_msg or "authorization" in error_msg.lower():
        return "Permission denied. API token needs 'PVEVMAdmin' role."
    return "Operation failed"

@router.get("/api/proxmox/config")
@limiter.limit("30/minute")  # Rate limit for config reads
async def get_proxmox_config(request: Request, dashboard_id: int = 1, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    """Gibt Proxmox-Konfiguration zurück (ohne Secret, token_name maskiert)"""
    def _get_config_sync():
        cur = db.cursor()
        try:
            cur.execute(
                "SELECT id, host, port, token_name, verify_ssl, node FROM proxmox_config WHERE dashboard_id = %s;",
                (dashboard_id,)
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
        finally:
            cur.close()
    
    return await run_in_threadpool(_get_config_sync)

@router.put("/api/proxmox/config")
@limiter.limit("5/minute")  # Stricter limit for config changes
async def update_proxmox_config(config: ProxmoxConfig, request: Request, dashboard_id: int = 1, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    """Speichert Proxmox-Konfiguration (Token wird verschlüsselt)"""
    def _update_config_sync():
        cur = db.cursor()
        try:
            # Verschlüssele den Token-Wert
            encrypted_token = encrypt_value(config.token_value)
            
            # Prüfe ob Eintrag existiert
            cur.execute("SELECT id, token_value FROM proxmox_config WHERE dashboard_id = %s;", (dashboard_id,))
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
                           WHERE dashboard_id=%s 
                           RETURNING id;""",
                        (config.host, config.port, config.token_name, encrypted_token, config.verify_ssl, config.node, dashboard_id)
                    )
                else:
                    cur.execute(
                        """UPDATE proxmox_config 
                           SET host=%s, port=%s, token_name=%s, token_value=%s, verify_ssl=%s, node=%s 
                           WHERE dashboard_id=%s 
                           RETURNING id;""",
                        (config.host, config.port, config.token_name, encrypted_token, config.verify_ssl, config.node, dashboard_id)
                    )
            else:
                cur.execute(
                    """INSERT INTO proxmox_config (host, port, token_name, token_value, verify_ssl, node, dashboard_id) 
                       VALUES (%s, %s, %s, %s, %s, %s, %s) 
                       RETURNING id;""",
                    (config.host, config.port, config.token_name, encrypted_token, config.verify_ssl, config.node, dashboard_id)
                )
            
            updated = cur.fetchone()
            db.commit()
            
            if not updated:
                raise HTTPException(status_code=500, detail="Failed to save Proxmox configuration")
            
            return {"message": "Proxmox configuration saved"}
        finally:
            cur.close()
    
    return await run_in_threadpool(_update_config_sync)

@router.get("/api/proxmox/vms")
@limiter.limit("20/minute")  # Rate limit for VM list
def list_proxmox_vms(request: Request, dashboard_id: int = 1, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    """Holt alle VMs und LXCs von Proxmox für spezifisches Dashboard"""
    client_ip = get_client_ip(request)
    
    proxmox, configured_node = get_proxmox_connection(dashboard_id)
    
    if not proxmox:
        log_audit(
            action="VIEW_VMS",
            status="failed",
            user_type="admin",
            ip_address=client_ip,
            details={"error": "Proxmox not configured"}
        )
        raise HTTPException(status_code=404, detail="Proxmox not configured")
    
    try:
        all_resources = []
        node_stats = []
        
        # Hole alle Nodes
        nodes = proxmox.nodes.get()
        
        for node_data in nodes:
            node_name = node_data['node']
            
            # Wenn ein spezifischer Node konfiguriert ist, nur diesen abfragen
            if configured_node and node_name != configured_node:
                continue
            
            # Hole Node-Statistiken (CPU Cores des Hosts)
            try:
                node_status = proxmox.nodes(node_name).status.get()
                node_stats.append({
                    "node": node_name,
                    "cpus": node_status.get('cpuinfo', {}).get('cpus', 0),
                    "cpu_usage": node_status.get('cpu', 0),
                    "memory_total": node_status.get('memory', {}).get('total', 0),
                    "memory_used": node_status.get('memory', {}).get('used', 0),
                    "uptime": node_status.get('uptime', 0)
                })
            except Exception as e:
                logger.error(f"Error fetching node stats from {node_name}", exc_info=False)
            
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
            user_type="admin",
            ip_address=client_ip,
            details={"count": len(all_resources), "nodes": len(node_stats)}
        )
        
        return {
            "resources": all_resources,
            "nodes": node_stats
        }
        
    except Exception as e:
        logger.error("Proxmox API error", exc_info=False)
        log_audit(
            action="VIEW_VMS",
            status="failed",
            user_type="admin",
            ip_address=client_ip,
            details={"error": "API error"}
        )
        raise HTTPException(status_code=500, detail="Failed to fetch Proxmox resources")

@router.post("/api/proxmox/vm/{vmid}/start")
@limiter.limit("30/minute")  # Allow batch operations (10+ VMs)
def start_proxmox_vm(vmid: int, vm_type: str = "qemu", dashboard_id: int = 1, request: Request = None, token: dict = Depends(require_role("admin"))):
    """Startet eine VM oder LXC"""
    client_ip = get_client_ip(request) if request else "unknown"
    
    proxmox, _ = get_proxmox_connection(dashboard_id)
    
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
            else:
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
        log_audit(
            action="START_VM",
            status="failed",
            user_type="admin",
            ip_address=client_ip,
            resource_type=vm_type,
            resource_id=str(vmid),
            details={"error": str(e)}
        )
        raise HTTPException(status_code=500, detail=_get_permission_error_message(e))
        raise HTTPException(status_code=500, detail=detail)

@router.post("/api/proxmox/vm/{vmid}/stop")
@limiter.limit("30/minute")  # Allow batch operations (10+ VMs)
def stop_proxmox_vm(vmid: int, vm_type: str = "qemu", dashboard_id: int = 1, request: Request = None, token: dict = Depends(require_role("admin"))):
    """Stoppt eine VM oder LXC"""
    client_ip = get_client_ip(request) if request else "unknown"
    proxmox, _ = get_proxmox_connection(dashboard_id)
    
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
            else:
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
        log_audit(action="STOP_VM", status="failed", user_type="admin", ip_address=client_ip,
                  resource_type=vm_type, resource_id=str(vmid), details={"error": str(e)})
        logger.error(f"Proxmox VM stop failed: {str(e)}", exc_info=False)
        raise HTTPException(status_code=500, detail=_get_permission_error_message(e))

@router.post("/api/proxmox/vm/{vmid}/reboot")
@limiter.limit("30/minute")  # Allow batch operations (10+ VMs)
def reboot_proxmox_vm(vmid: int, vm_type: str = "qemu", dashboard_id: int = 1, request: Request = None, token: dict = Depends(require_role("admin"))):
    """Startet eine VM oder LXC neu"""
    client_ip = get_client_ip(request) if request else "unknown"
    proxmox, _ = get_proxmox_connection(dashboard_id)
    
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
            else:
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
        log_audit(action="REBOOT_VM", status="failed", user_type="admin", ip_address=client_ip,
                  resource_type=vm_type, resource_id=str(vmid), details={"error": str(e)})
        logger.error(f"Proxmox VM reboot failed: {str(e)}", exc_info=False)
        raise HTTPException(status_code=500, detail=_get_permission_error_message(e))
