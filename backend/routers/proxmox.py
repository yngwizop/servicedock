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
            "SELECT host, port, token_name, token_value, verify_ssl, node, is_cluster FROM proxmox_config WHERE dashboard_id = %s;",
            (dashboard_id,)
        )
        row = cur.fetchone()
        
        if not row:
            return None, None, False
        
        host, port, token_name, token_value_encrypted, verify_ssl, node, is_cluster = row
        
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
            return proxmox, node, is_cluster
        except Exception as e:
            # Keine Details loggen, um Token-Leaks zu vermeiden
            logger.error("Proxmox connection error")
            return None, None, False
    except Exception as e:
        logger.error(f"Database error in get_proxmox_connection: {e}")
        return None, None, False
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
                "SELECT id, host, port, token_name, verify_ssl, node, is_cluster FROM proxmox_config WHERE dashboard_id = %s;",
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
                    "node": None,
                    "is_cluster": False
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
                "node": row[5],
                "is_cluster": row[6]
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
                           SET host=%s, port=%s, token_name=%s, token_value=%s, verify_ssl=%s, node=%s, is_cluster=%s, token_created_at=NOW() 
                           WHERE dashboard_id=%s 
                           RETURNING id;""",
                        (config.host, config.port, config.token_name, encrypted_token, config.verify_ssl, config.node, config.is_cluster, dashboard_id)
                    )
                else:
                    cur.execute(
                        """UPDATE proxmox_config 
                           SET host=%s, port=%s, token_name=%s, token_value=%s, verify_ssl=%s, node=%s, is_cluster=%s 
                           WHERE dashboard_id=%s 
                           RETURNING id;""",
                        (config.host, config.port, config.token_name, encrypted_token, config.verify_ssl, config.node, config.is_cluster, dashboard_id)
                    )
            else:
                cur.execute(
                    """INSERT INTO proxmox_config (host, port, token_name, token_value, verify_ssl, node, is_cluster, dashboard_id) 
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s) 
                       RETURNING id;""",
                    (config.host, config.port, config.token_name, encrypted_token, config.verify_ssl, config.node, config.is_cluster, dashboard_id)
                )
            
            updated = cur.fetchone()
            db.commit()
            
            if not updated:
                raise HTTPException(status_code=500, detail="Failed to save Proxmox configuration")
            
            return {"message": "Proxmox configuration saved"}
        finally:
            cur.close()
    
    return await run_in_threadpool(_update_config_sync)

@router.post("/api/proxmox/test")
@limiter.limit("10/minute")  # Rate limit for connection tests
async def test_proxmox_connection(request: Request, dashboard_id: int = 1, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    """Testet die Proxmox-Verbindung und gibt detailliertes Feedback"""
    def _test_connection_sync():
        proxmox, configured_node, is_cluster = get_proxmox_connection(dashboard_id)
        
        if not proxmox:
            return {
                "success": False,
                "error": "Proxmox nicht konfiguriert oder Token-Entschlüsselung fehlgeschlagen"
            }
        
        try:
            # Versuche Nodes abzurufen
            nodes = proxmox.nodes.get()
            
            if not nodes or len(nodes) == 0:
                return {
                    "success": False,
                    "error": "Keine Nodes gefunden. Prüfe die Berechtigungen des API Tokens."
                }
            
            # Sammle Node-Namen
            node_names = [node['node'] for node in nodes]
            
            # Prüfe ob konfigurierter Node existiert
            if configured_node and configured_node not in node_names:
                return {
                    "success": False,
                    "error": f"Konfigurierter Node '{configured_node}' nicht gefunden. Verfügbare Nodes: {', '.join(node_names)}"
                }
            
            return {
                "success": True,
                "message": "Verbindung erfolgreich!",
                "nodes": node_names,
                "configured_node": configured_node
            }
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Proxmox connection test failed: {error_msg}")
            
            # Detaillierte Fehlermeldung
            if "401" in error_msg or "authentication" in error_msg.lower():
                detail = "Authentifizierung fehlgeschlagen. Prüfe Token Name (Format: user@realm!tokenname) und Token Secret."
            elif "403" in error_msg or "permission" in error_msg.lower():
                detail = "Keine Berechtigung. Der API Token benötigt mindestens:\n- Pfad: /\n- Rolle: PVEAuditor (für Lesezugriff) oder PVEAdmin (für volle Kontrolle)\n\nWichtig: Bei aktivierter 'Privilege Separation' benötigt der TOKEN die Berechtigung, nicht der User!"
            elif "connection" in error_msg.lower() or "timeout" in error_msg.lower() or "refused" in error_msg.lower():
                detail = "Verbindung fehlgeschlagen. Prüfe:\n- Host/IP-Adresse korrekt?\n- Port erreichbar? (Standard: 8006)\n- Firewall blockiert Zugriff?"
            elif "ssl" in error_msg.lower() or "certificate" in error_msg.lower():
                detail = "SSL-Zertifikatfehler. Bei self-signed Zertifikaten: Deaktiviere 'SSL-Zertifikat verifizieren'."
            else:
                detail = f"Proxmox API Fehler: {error_msg}"
            
            return {
                "success": False,
                "error": detail
            }
    
    return await run_in_threadpool(_test_connection_sync)

@router.get("/api/proxmox/vms")
@limiter.limit("20/minute")  # Rate limit for VM list
def list_proxmox_vms(request: Request, dashboard_id: int = 1, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    """Holt alle VMs und LXCs von Proxmox für spezifisches Dashboard"""
    client_ip = get_client_ip(request)
    
    proxmox, configured_node, is_cluster = get_proxmox_connection(dashboard_id)
    
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
        
        # CLUSTER-MODUS: Nutze /cluster/resources API
        if is_cluster:
            logger.info("🌐 Using Cluster API: /cluster/resources")
            try:
                # Hole ALLE Ressourcen ohne Filter, um zu debuggen
                resources = proxmox.cluster.resources.get()
                logger.info(f"✓ Cluster API returned {len(resources)} total resources")
                
                # Log die Typen der Ressourcen
                resource_types = {}
                for r in resources:
                    rtype = r.get('type', 'unknown')
                    resource_types[rtype] = resource_types.get(rtype, 0) + 1
                logger.info(f"📊 Resource types: {resource_types}")
                
                # Sammle Node-Namen für Stats
                nodes_seen = set()
                
                for resource in resources:
                    # Filter: nur VMs/LXCs (type='qemu' oder 'lxc')
                    res_type = resource.get('type')
                    if res_type not in ['qemu', 'lxc']:
                        continue
                    
                    logger.info(f"🔍 Found {res_type}: {resource.get('name')} (ID: {resource.get('vmid')}) on node {resource.get('node')}")
                    
                    node_name = resource.get('node')
                    nodes_seen.add(node_name)
                
                for resource in resources:
                    # Filter: nur VMs/LXCs (type='qemu' oder 'lxc')
                    res_type = resource.get('type')
                    if res_type not in ['qemu', 'lxc']:
                        continue
                    
                    node_name = resource.get('node')
                    nodes_seen.add(node_name)
                    
                    # Wenn ein spezifischer Node konfiguriert ist, filtern
                    if configured_node and node_name != configured_node:
                        continue
                    
                    all_resources.append({
                        "id": f"{res_type}-{node_name}-{resource.get('vmid')}",
                        "vmid": resource.get('vmid'),
                        "name": resource.get('name', f"{'VM' if res_type == 'qemu' else 'CT'} {resource.get('vmid')}"),
                        "type": res_type,
                        "status": resource.get('status', 'unknown'),
                        "cpu": resource.get('cpu', 0),
                        "mem": resource.get('mem', 0),
                        "maxmem": resource.get('maxmem', 0),
                        "disk": resource.get('disk', 0),
                        "maxdisk": resource.get('maxdisk', 0),
                        "uptime": resource.get('uptime', 0),
                        "node": node_name
                    })
                
                # Hole Node-Statistiken
                for node_name in nodes_seen:
                    if configured_node and node_name != configured_node:
                        continue
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
                        logger.error(f"Error fetching node stats from {node_name}: {str(e)}")
                
            except Exception as e:
                error_msg = str(e)
                logger.error(f"Failed to fetch cluster resources: {error_msg}")
                
                if "401" in error_msg or "authentication" in error_msg.lower():
                    detail_msg = "Authentifizierung fehlgeschlagen. Prüfe Token Name und Secret."
                elif "403" in error_msg or "permission" in error_msg.lower():
                    detail_msg = "Keine Berechtigung. API Token benötigt für Cluster-Zugriff die Rolle 'PVEAuditor' oder höher auf Pfad '/'."
                elif "connection" in error_msg.lower() or "timeout" in error_msg.lower():
                    detail_msg = "Verbindung zum Proxmox-Cluster fehlgeschlagen. Prüfe Host/IP und Port."
                elif "ssl" in error_msg.lower() or "certificate" in error_msg.lower():
                    detail_msg = "SSL-Zertifikatfehler. Deaktiviere 'SSL-Zertifikat verifizieren' bei self-signed Zertifikaten."
                else:
                    detail_msg = f"Cluster API Fehler: {error_msg}"
                
                raise HTTPException(status_code=503, detail=detail_msg)
        
        # STANDALONE-MODUS: Nutze /nodes/<node>/qemu und /nodes/<node>/lxc API
        else:
            logger.info("🖥️  Using Standalone API: /nodes/<node>/qemu + /nodes/<node>/lxc")
        try:
            nodes = proxmox.nodes.get()
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to fetch Proxmox nodes: {error_msg}")
            
            # Detaillierte Fehlermeldung für häufige Probleme
            if "401" in error_msg or "authentication" in error_msg.lower():
                detail_msg = "Authentifizierung fehlgeschlagen. Prüfe Token Name und Secret."
            elif "403" in error_msg or "permission" in error_msg.lower():
                detail_msg = "Keine Berechtigung. API Token benötigt mindestens die Rolle 'PVEAuditor' für Lesezugriff."
            elif "connection" in error_msg.lower() or "timeout" in error_msg.lower():
                detail_msg = "Verbindung zum Proxmox-Server fehlgeschlagen. Prüfe Host/IP und Port."
            elif "ssl" in error_msg.lower() or "certificate" in error_msg.lower():
                detail_msg = "SSL-Zertifikatfehler. Deaktiviere 'SSL-Zertifikat verifizieren' bei self-signed Zertifikaten."
            else:
                detail_msg = f"Proxmox API Fehler: {error_msg}"
            
            log_audit(
                action="VIEW_VMS",
                status="failed",
                user_type="admin",
                ip_address=client_ip,
                details={"error": detail_msg}
            )
            raise HTTPException(status_code=503, detail=detail_msg)
        
# STANDALONE-MODUS: Nutze /nodes/<node>/qemu und /nodes/<node>/lxc API
        else:
            logger.info("🖥️  Using Standalone API: /nodes/<node>/qemu + /nodes/<node>/lxc")
            
            try:
                nodes = proxmox.nodes.get()
            except Exception as e:
                error_msg = str(e)
                logger.error(f"Failed to fetch Proxmox nodes: {error_msg}")
                
                # Detaillierte Fehlermeldung für häufige Probleme
                if "401" in error_msg or "authentication" in error_msg.lower():
                    detail_msg = "Authentifizierung fehlgeschlagen. Prüfe Token Name und Secret."
                elif "403" in error_msg or "permission" in error_msg.lower():
                    detail_msg = "Keine Berechtigung. API Token benötigt mindestens die Rolle 'PVEAuditor' für Lesezugriff."
                elif "connection" in error_msg.lower() or "timeout" in error_msg.lower():
                    detail_msg = "Verbindung zum Proxmox-Server fehlgeschlagen. Prüfe Host/IP und Port."
                elif "ssl" in error_msg.lower() or "certificate" in error_msg.lower():
                    detail_msg = "SSL-Zertifikatfehler. Deaktiviere 'SSL-Zertifikat verifizieren' bei self-signed Zertifikaten."
                else:
                    detail_msg = f"Proxmox API Fehler: {error_msg}"
                
                log_audit(
                    action="VIEW_VMS",
                    status="failed",
                    user_type="admin",
                    ip_address=client_ip,
                    details={"error": detail_msg}
                )
                raise HTTPException(status_code=503, detail=detail_msg)
            
            logger.info(f"📡 Found {len(nodes)} node(s)")
            
            for node_data in nodes:
                node_name = node_data['node']
                
                # Wenn ein spezifischer Node konfiguriert ist, nur diesen abfragen
                if configured_node and node_name != configured_node:
                    continue
            
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
                    error_msg = str(e)
                    logger.error(f"Error fetching node stats from {node_name}: {error_msg}")
                
                try:
                    # Hole QEMUs (VMs)
                    qemus = proxmox.nodes(node_name).qemu.get()
                    logger.info(f"✓ Found {len(qemus)} VMs on node {node_name}")
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
                    logger.info(f"✓ Found {len(lxcs)} LXC containers on node {node_name}")
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
                    error_msg = str(e)
                    logger.error(f"⚠️ Error fetching resources from node {node_name}: {error_msg}")
                    if "403" in error_msg or "permission" in error_msg.lower():
                        logger.error(f"💡 Permission denied for node {node_name}")
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
    
    proxmox, _, _ = get_proxmox_connection(dashboard_id)
    
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
    proxmox, _, _ = get_proxmox_connection(dashboard_id)
    
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
    proxmox, _, _ = get_proxmox_connection(dashboard_id)
    
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
