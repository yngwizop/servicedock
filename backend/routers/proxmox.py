"""Proxmox router - VM and container management"""
import warnings

from typing import Optional

from fastapi import APIRouter, Request, HTTPException, Depends, Body
from fastapi.concurrency import run_in_threadpool
from proxmoxer import ProxmoxAPI
from requests.packages.urllib3.exceptions import InsecureRequestWarning

import config.database
from models.proxmox import (
    ProxmoxConfig,
    ProxmoxConfigUpdate,
    ProxmoxTestConfig,
    ClusterStats,
    NodeSummary,
    ResourceSummary,
    TopUsageItem,
    TaskSummary,
)
from core.security import decrypt_value, encrypt_value
from core.logging import logger
from core.audit import log_audit
from core.network_safety import is_safe_proxmox_host
from core.limiter import limiter
from dependencies.auth import require_role, get_client_ip
from config.database import get_db

router = APIRouter()


def _assert_safe_proxmox_host(host: str) -> None:
    ok, reason = is_safe_proxmox_host(host)
    if not ok:
        raise HTTPException(
            status_code=400,
            detail={"code": "proxmox_host_not_allowed", "reason": reason},
        )


def _log_tls_verify_disabled(host: str, request: Request, token: dict) -> None:
    log_audit(
        action="PROXMOX_TLS_VERIFY_DISABLED",
        status="warning",
        user_type=token.get("type", "admin"),
        ip_address=get_client_ip(request),
        details={"host": host},
    )


def _build_proxmox_api(host: str, port: int, token_name: str, token_value: str, verify_ssl: bool):
    """Create a ProxmoxAPI client from plain credentials."""
    if "!" in token_name:
        user_part = token_name.split("!")[0]
        token_id = token_name.split("!")[1]
    else:
        user_part = token_name
        token_id = "default"
    with warnings.catch_warnings():
        if not verify_ssl:
            warnings.simplefilter("ignore", InsecureRequestWarning)
        return ProxmoxAPI(
            host,
            port=port,
            user=user_part,
            token_name=token_id,
            token_value=token_value,
            verify_ssl=verify_ssl,
        )


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

        _assert_safe_proxmox_host(host)
        
        # Entschlüssele den Token
        token_value = decrypt_value(token_value_encrypted)
        
        if not token_value:
            logger.error("Failed to decrypt Proxmox token")
            return None, None
        
        try:
            proxmox = _build_proxmox_api(host, port, token_name, token_value, verify_ssl)
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
                "SELECT id, host, port, token_name, verify_ssl, node, is_cluster, updated_at FROM proxmox_config WHERE dashboard_id = %s;",
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
                    "is_cluster": False,
                    "updated_at": None,
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
                "is_cluster": row[6],
                "updated_at": row[7].isoformat() if row[7] else None,
            }
        finally:
            cur.close()
    
    return await run_in_threadpool(_get_config_sync)

@router.put("/api/proxmox/config")
@limiter.limit("5/minute")  # Stricter limit for config changes
async def update_proxmox_config(
    config: ProxmoxConfigUpdate,
    request: Request,
    dashboard_id: int = 1,
    token: dict = Depends(require_role("admin")),
    db=Depends(get_db),
):
    """Speichert Proxmox-Konfiguration (Token wird verschlüsselt)."""
    _assert_safe_proxmox_host(config.host)
    if not config.verify_ssl:
        _log_tls_verify_disabled(config.host, request, token)

    def _update_config_sync():
        cur = db.cursor()
        try:
            cur.execute(
                "SELECT id, token_name, token_value FROM proxmox_config WHERE dashboard_id = %s;",
                (dashboard_id,),
            )
            existing = cur.fetchone()

            if not existing:
                if not config.token_name:
                    raise HTTPException(
                        status_code=400,
                        detail={"code": "proxmox_token_name_required"},
                    )
                if not config.token_value:
                    raise HTTPException(
                        status_code=400,
                        detail={"code": "proxmox_token_value_required"},
                    )

            token_name = (
                config.token_name
                if config.token_name
                else (existing[1] if existing else None)
            )
            token_was_updated = bool(config.token_value)
            if config.token_value:
                encrypted_token = encrypt_value(config.token_value)
            elif existing:
                encrypted_token = existing[2]
            else:
                raise HTTPException(
                    status_code=400,
                    detail={"code": "proxmox_token_value_required"},
                )

            if existing:
                if token_was_updated:
                    cur.execute(
                        """UPDATE proxmox_config
                           SET host=%s, port=%s, token_name=%s, token_value=%s, verify_ssl=%s,
                               node=%s, is_cluster=%s, token_created_at=NOW(), updated_at=NOW()
                           WHERE dashboard_id=%s
                           RETURNING id;""",
                        (
                            config.host,
                            config.port,
                            token_name,
                            encrypted_token,
                            config.verify_ssl,
                            config.node,
                            config.is_cluster,
                            dashboard_id,
                        ),
                    )
                else:
                    cur.execute(
                        """UPDATE proxmox_config
                           SET host=%s, port=%s, token_name=%s, token_value=%s, verify_ssl=%s,
                               node=%s, is_cluster=%s, updated_at=NOW()
                           WHERE dashboard_id=%s
                           RETURNING id;""",
                        (
                            config.host,
                            config.port,
                            token_name,
                            encrypted_token,
                            config.verify_ssl,
                            config.node,
                            config.is_cluster,
                            dashboard_id,
                        ),
                    )
            else:
                cur.execute(
                    """INSERT INTO proxmox_config
                       (host, port, token_name, token_value, verify_ssl, node, is_cluster, dashboard_id, updated_at)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                       RETURNING id;""",
                    (
                        config.host,
                        config.port,
                        token_name,
                        encrypted_token,
                        config.verify_ssl,
                        config.node,
                        config.is_cluster,
                        dashboard_id,
                    ),
                )

            updated = cur.fetchone()
            db.commit()

            if not updated:
                raise HTTPException(
                    status_code=500, detail="Failed to save Proxmox configuration"
                )

            return {"message": "Proxmox configuration saved"}
        finally:
            cur.close()

    return await run_in_threadpool(_update_config_sync)

@router.delete("/api/proxmox/config")
@limiter.limit("5/minute")  # Stricter limit for config deletion
async def delete_proxmox_config(request: Request, dashboard_id: int = 1, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    """Löscht die Proxmox-Konfiguration für ein Dashboard"""
    def _delete_config_sync():
        cur = db.cursor()
        try:
            # Prüfe ob Eintrag existiert
            cur.execute("SELECT id FROM proxmox_config WHERE dashboard_id = %s;", (dashboard_id,))
            existing = cur.fetchone()
            
            if not existing:
                raise HTTPException(status_code=404, detail="No Proxmox configuration found for this dashboard")
            
            # Lösche die Konfiguration
            cur.execute("DELETE FROM proxmox_config WHERE dashboard_id = %s;", (dashboard_id,))
            db.commit()
            
            return {"message": "Proxmox configuration deleted successfully"}
        finally:
            cur.close()
    
    return await run_in_threadpool(_delete_config_sync)

def _proxmox_test_error_code(error_msg: str) -> tuple[str, dict]:
    lower = error_msg.lower()
    if "401" in error_msg or "authentication" in lower:
        return "proxmox_test_auth_failed", {}
    if "403" in error_msg or "permission" in lower:
        return "proxmox_test_forbidden", {}
    if "connection" in lower or "timeout" in lower or "refused" in lower:
        return "proxmox_test_connection_failed", {}
    if "ssl" in lower or "certificate" in lower:
        return "proxmox_test_ssl_failed", {}
    return "proxmox_test_unknown", {"raw": error_msg}


def _run_proxmox_connection_test(proxmox, configured_node: Optional[str]) -> dict:
    try:
        nodes = proxmox.nodes.get()
        if not nodes:
            return {
                "success": False,
                "error_code": "proxmox_test_no_nodes",
            }
        node_names = [node["node"] for node in nodes]
        if configured_node and configured_node not in node_names:
            return {
                "success": False,
                "error_code": "proxmox_test_node_mismatch",
                "error_context": {
                    "configured": configured_node,
                    "available": node_names,
                },
            }
        return {
            "success": True,
            "nodes": node_names,
            "configured_node": configured_node,
        }
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Proxmox connection test failed: {error_msg}")
        code, ctx = _proxmox_test_error_code(error_msg)
        return {"success": False, "error_code": code, "error_context": ctx}


def _resolve_stored_token_plain(dashboard_id: int, db) -> Optional[str]:
    cur = db.cursor()
    try:
        cur.execute(
            "SELECT token_value FROM proxmox_config WHERE dashboard_id = %s;",
            (dashboard_id,),
        )
        row = cur.fetchone()
        if not row:
            return None
        return decrypt_value(row[0])
    finally:
        cur.close()


@router.post("/api/proxmox/test")
@limiter.limit("10/minute")  # Rate limit for connection tests
async def test_proxmox_connection(
    request: Request,
    dashboard_id: int = 1,
    test_config: Optional[ProxmoxTestConfig] = Body(None),
    token: dict = Depends(require_role("admin")),
    db=Depends(get_db),
):
    """Test Proxmox connection using form values (optional body) or saved DB config."""

    def _test_connection_sync():
        if test_config is None:
            proxmox, configured_node, _is_cluster = get_proxmox_connection(dashboard_id)
            if not proxmox:
                return {
                    "success": False,
                    "error_code": "proxmox_test_not_configured",
                }
            return _run_proxmox_connection_test(proxmox, configured_node)

        _assert_safe_proxmox_host(test_config.host)
        if not test_config.verify_ssl:
            _log_tls_verify_disabled(test_config.host, request, token)

        token_plain = test_config.token_value
        if not token_plain:
            token_plain = _resolve_stored_token_plain(dashboard_id, db)
            if not token_plain:
                return {
                    "success": False,
                    "error_code": "proxmox_test_token_missing",
                }

        token_name = test_config.token_name
        if not token_name:
            cur = db.cursor()
            try:
                cur.execute(
                    "SELECT token_name FROM proxmox_config WHERE dashboard_id = %s;",
                    (dashboard_id,),
                )
                row = cur.fetchone()
                if row and row[0]:
                    token_name = row[0]
            finally:
                cur.close()
        if not token_name:
            return {
                "success": False,
                "error_code": "proxmox_test_token_name_missing",
            }

        try:
            proxmox = _build_proxmox_api(
                test_config.host,
                test_config.port,
                token_name,
                token_plain,
                test_config.verify_ssl,
            )
        except Exception:
            logger.error("Proxmox connection error during test")
            return {
                "success": False,
                "error_code": "proxmox_test_build_failed",
            }

        return _run_proxmox_connection_test(proxmox, test_config.node)

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
        cluster_name = None  # NEU: Clustername
        
        # CLUSTER-MODUS: Nutze /cluster/resources API
        if is_cluster:
            logger.info("🌐 Using Cluster API: /cluster/resources")
            try:
                # NEU: Hole Clusternamen aus /cluster/status
                try:
                    cluster_status = proxmox.cluster.status.get()
                    for item in cluster_status:
                        if item.get('type') == 'cluster':
                            cluster_name = item.get('name', 'Cluster')
                            break
                except Exception as e:
                    logger.warning(f"Could not fetch cluster name: {e}")
                    cluster_name = "Cluster"
                
                # Hole ALLE Ressourcen ohne Filter, um zu debuggen
                resources = proxmox.cluster.resources.get()
                logger.info(f"✓ Cluster API returned {len(resources)} total resources")
                
                # Log die Typen der Ressourcen
                resource_types = {}
                for r in resources:
                    rtype = r.get('type', 'unknown')
                    resource_types[rtype] = resource_types.get(rtype, 0) + 1
                logger.info(f"📊 Resource types: {resource_types}")
                
                # Sammle Node-Namen für Stats und verarbeite Ressourcen
                nodes_seen = set()
                
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
                    
                    logger.info(f"🔍 Found {res_type}: {resource.get('name')} (ID: {resource.get('vmid')}) on node {node_name}")
                    
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

                code, ctx = _proxmox_test_error_code(error_msg)
                raise HTTPException(
                    status_code=503,
                    detail={"code": code, "context": ctx, "scope": "cluster"},
                )
        
        # STANDALONE-MODUS: Nutze /nodes/<node>/qemu und /nodes/<node>/lxc API
        else:
            logger.info("🖥️  Using Standalone API: /nodes/<node>/qemu + /nodes/<node>/lxc")
            
            try:
                nodes = proxmox.nodes.get()
            except Exception as e:
                error_msg = str(e)
                logger.error(f"Failed to fetch Proxmox nodes: {error_msg}")
                code, ctx = _proxmox_test_error_code(error_msg)
                detail_payload = {"code": code, "context": ctx, "scope": "standalone"}
                
                log_audit(
                    action="VIEW_VMS",
                    status="failed",
                    user_type="admin",
                    ip_address=client_ip,
                    details={"code": code},
                )
                raise HTTPException(status_code=503, detail=detail_payload)

            logger.info(f"📡 Found {len(nodes)} node(s)")

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
            "nodes": node_stats,
            "cluster_name": cluster_name  # NEU: Clustername zurückgeben
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
