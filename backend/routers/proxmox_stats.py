"""Proxmox Cluster Statistics - Aggregierte Daten für Status-Dashboard"""
from fastapi import APIRouter, Request, HTTPException, Depends
from typing import List

from routers.proxmox import get_proxmox_connection
from models.proxmox import ClusterStats, NodeSummary, ResourceSummary, TopUsageItem, TaskSummary
from core.logging import logger
from core.audit import log_audit
from core.limiter import limiter
from dependencies.auth import require_role, get_client_ip
from config.database import get_db

router = APIRouter()


@router.get("/api/proxmox/cluster-stats", response_model=ClusterStats)
@limiter.limit("20/minute")
def get_cluster_stats(
    request: Request, 
    dashboard_id: int = 1,
    top_n: int = 10,
    task_hours: int = 48,
    token: dict = Depends(require_role("admin")), 
    db = Depends(get_db)
):
    """
    Aggregierte Cluster-Statistiken für das Status-Dashboard.
    
    Liefert:
    - Node-Status (online/offline/total)
    - VM-Status (running/stopped/total)
    - LXC-Status (running/stopped/total)
    - Top 10 CPU-Auslastung (Nodes + VMs/LXCs)
    - Top 10 Memory-Auslastung (Nodes + VMs/LXCs)
    - Task-Zusammenfassung (failed/running/success)
    """
    client_ip = get_client_ip(request)
    proxmox, configured_node, is_cluster = get_proxmox_connection(dashboard_id)
    
    if not proxmox:
        log_audit(
            action="VIEW_CLUSTER_STATS",
            status="failed",
            user_type="admin",
            ip_address=client_ip,
            details={"error": "Proxmox not configured"}
        )
        raise HTTPException(status_code=404, detail="Proxmox nicht konfiguriert")
    
    try:
        # Initialisiere Statistiken
        stats = ClusterStats(
            nodes=NodeSummary(),
            vms=ResourceSummary(),
            lxcs=ResourceSummary(),
            top_cpu_usage=[],
            top_memory_usage=[],
            tasks=TaskSummary(),
            cluster_name=None,
            is_cluster=is_cluster
        )
        
        all_usage_items: List[TopUsageItem] = []
        
        # ========================================
        # CLUSTER-MODUS
        # ========================================
        if is_cluster:
            # Clustername abrufen
            try:
                cluster_status = proxmox.cluster.status.get()
                for item in cluster_status:
                    if item.get('type') == 'cluster':
                        stats.cluster_name = item.get('name', 'Cluster')
                        break
                    elif item.get('type') == 'node':
                        stats.nodes.total += 1
                        if item.get('online', 0) == 1:
                            stats.nodes.online += 1
                        else:
                            stats.nodes.offline += 1
            except Exception as e:
                logger.warning(f"Could not fetch cluster status: {e}")
                stats.cluster_name = "Cluster"
            
            # Alle Ressourcen abrufen
            try:
                resources = proxmox.cluster.resources.get()
                
                for resource in resources:
                    res_type = resource.get('type')
                    node_name = resource.get('node')
                    status = resource.get('status', 'unknown')
                    
                    # Filter bei konfiguriertem Node (für VMs/LXCs)
                    if res_type in ['qemu', 'lxc'] and configured_node and node_name != configured_node:
                        continue
                    
                    # Filter bei konfiguriertem Node (für Nodes selbst)
                    if res_type == 'node' and configured_node and node_name != configured_node:
                        continue
                    
                    # VMs
                    if res_type == 'qemu':
                        stats.vms.total += 1
                        if status == 'running':
                            stats.vms.running += 1
                        elif status == 'stopped':
                            stats.vms.stopped += 1
                        
                        if status == 'running':
                            mem = resource.get('mem', 0)
                            maxmem = resource.get('maxmem', 1)
                            cpu = resource.get('cpu', 0)
                            maxcpu = resource.get('maxcpu', 0)
                            
                            all_usage_items.append(TopUsageItem(
                                name=resource.get('name', f"VM {resource.get('vmid')}"),
                                type='qemu',
                                vmid=resource.get('vmid'),
                                node=node_name,
                                cpu_percent=cpu * 100,
                                cpu_used=cpu,
                                cpu_cores=maxcpu,
                                memory_percent=(mem / maxmem * 100) if maxmem > 0 else 0,
                                memory_used=mem,
                                memory_total=maxmem,
                                status=status
                            ))
                    
                    # LXCs
                    elif res_type == 'lxc':
                        stats.lxcs.total += 1
                        if status == 'running':
                            stats.lxcs.running += 1
                        elif status == 'stopped':
                            stats.lxcs.stopped += 1
                        
                        if status == 'running':
                            mem = resource.get('mem', 0)
                            maxmem = resource.get('maxmem', 1)
                            cpu = resource.get('cpu', 0)
                            maxcpu = resource.get('maxcpu', 0)
                            
                            all_usage_items.append(TopUsageItem(
                                name=resource.get('name', f"LXC {resource.get('vmid')}"),
                                type='lxc',
                                vmid=resource.get('vmid'),
                                node=node_name,
                                cpu_percent=cpu * 100,
                                cpu_used=cpu,
                                cpu_cores=maxcpu,
                                memory_percent=(mem / maxmem * 100) if maxmem > 0 else 0,
                                memory_used=mem,
                                memory_total=maxmem,
                                status=status
                            ))
                    
                    # === Nodes (für Top-Listen und Zählung) ===
                    elif res_type == 'node':
                        # Node-Zählung
                        stats.nodes.total += 1
                        node_status = resource.get('status', 'offline')
                        if node_status == 'online':
                            stats.nodes.online += 1
                        else:
                            stats.nodes.offline += 1
                        
                        # Für Top-Listen
                        mem = resource.get('mem', 0)
                        maxmem = resource.get('maxmem', 1)
                        cpu = resource.get('cpu', 0)
                        maxcpu = resource.get('maxcpu', 0)
                        
                        all_usage_items.append(TopUsageItem(
                            name=node_name,
                            type='node',
                            node=node_name,
                            cpu_percent=cpu * 100,
                            cpu_used=cpu,
                            cpu_cores=maxcpu,
                            memory_percent=(mem / maxmem * 100) if maxmem > 0 else 0,
                            memory_used=mem,
                            memory_total=maxmem,
                            status=node_status
                        ))
                
            except Exception as e:
                logger.error(f"Failed to fetch cluster resources: {e}")
                raise HTTPException(
                    status_code=503, 
                    detail=f"Cluster-Ressourcen konnten nicht abgerufen werden: {str(e)}"
                )
            
            # Tasks abrufen (letzte X Stunden)
            try:
                import time
                # Hole alle Tasks ohne limit (Proxmox API unterstützt 'limit' Parameter nicht standardmäßig)
                tasks = proxmox.cluster.tasks.get()
                
                # Filtere nach den letzten X Stunden
                time_threshold = time.time() - (task_hours * 60 * 60)
                
                # Gruppiere nach Nodes
                tasks_by_node = {}
                
                for task in tasks:
                    # Prüfe Zeitstempel (wenn vorhanden)
                    task_starttime = task.get('starttime', 0)
                    if task_starttime < time_threshold:
                        continue  # Überspringe alte Tasks
                    
                    task_node = task.get('node', 'unknown')
                    task_status = task.get('status', '').lower()
                    exitstatus = task.get('exitstatus', '')
                    
                    # Initialisiere Node-Zähler
                    if task_node not in tasks_by_node:
                        tasks_by_node[task_node] = {'failed': 0, 'running': 0, 'success': 0}
                    
                    # Zähle Status
                    if task_status == 'running':
                        stats.tasks.running += 1
                        tasks_by_node[task_node]['running'] += 1
                    elif 'error' in task_status or (task_status == 'stopped' and exitstatus != 'OK'):
                        stats.tasks.failed += 1
                        tasks_by_node[task_node]['failed'] += 1
                    elif task_status == 'ok' or (task_status == 'stopped' and exitstatus == 'OK'):
                        stats.tasks.success += 1
                        tasks_by_node[task_node]['success'] += 1
                
                # Konvertiere zu Liste, sortiert nach failed-Tasks (absteigend)
                from models.proxmox import TaskByNode
                stats.tasks.by_node = [
                    TaskByNode(node=node, **counts)
                    for node, counts in sorted(
                        tasks_by_node.items(),
                        key=lambda x: x[1]['failed'],
                        reverse=True
                    )
                ]
            except Exception as e:
                logger.warning(f"Could not fetch cluster tasks: {e}")
        
        # ========================================
        # STANDALONE-MODUS
        # ========================================
        else:
            try:
                nodes = proxmox.nodes.get()
                
                for node_data in nodes:
                    node_name = node_data['node']
                    
                    if configured_node and node_name != configured_node:
                        continue
                    
                    # Node-Status
                    stats.nodes.total += 1
                    node_status_str = node_data.get('status', 'offline')
                    if node_status_str == 'online':
                        stats.nodes.online += 1
                    else:
                        stats.nodes.offline += 1
                    
                    # Node-Details für Top-Listen
                    try:
                        node_status = proxmox.nodes(node_name).status.get()
                        memory = node_status.get('memory', {})
                        
                        mem_used = memory.get('used', 0)
                        mem_total = memory.get('total', 1)
                        cpu = node_status.get('cpu', 0)
                        cpuinfo = node_status.get('cpuinfo', {})
                        cpu_cores = cpuinfo.get('cpus', 0)
                        
                        all_usage_items.append(TopUsageItem(
                            name=node_name,
                            type='node',
                            node=node_name,
                            cpu_percent=cpu * 100,
                            cpu_used=cpu * cpu_cores if cpu_cores > 0 else cpu,
                            cpu_cores=cpu_cores,
                            memory_percent=(mem_used / mem_total * 100) if mem_total > 0 else 0,
                            memory_used=mem_used,
                            memory_total=mem_total,
                            status='online' if node_status_str == 'online' else 'offline'
                        ))
                    except Exception as e:
                        logger.error(f"Error fetching node stats from {node_name}: {e}")
                    
                    # VMs
                    try:
                        vms = proxmox.nodes(node_name).qemu.get()
                        for vm in vms:
                            stats.vms.total += 1
                            status = vm.get('status', 'unknown')
                            if status == 'running':
                                stats.vms.running += 1
                            elif status == 'stopped':
                                stats.vms.stopped += 1
                            
                            if status == 'running':
                                mem = vm.get('mem', 0)
                                maxmem = vm.get('maxmem', 1)
                                cpu = vm.get('cpu', 0)
                                maxcpu = vm.get('cpus', 0)
                                
                                all_usage_items.append(TopUsageItem(
                                    name=vm.get('name', f"VM {vm.get('vmid')}"),
                                    type='qemu',
                                    vmid=vm.get('vmid'),
                                    node=node_name,
                                    cpu_percent=cpu * 100,
                                    cpu_used=cpu,
                                    cpu_cores=maxcpu,
                                    memory_percent=(mem / maxmem * 100) if maxmem > 0 else 0,
                                    memory_used=mem,
                                    memory_total=maxmem,
                                    status=status
                                ))
                    except Exception as e:
                        logger.error(f"Error fetching VMs from {node_name}: {e}")
                    
                    # LXCs
                    try:
                        lxcs = proxmox.nodes(node_name).lxc.get()
                        for lxc in lxcs:
                            stats.lxcs.total += 1
                            status = lxc.get('status', 'unknown')
                            if status == 'running':
                                stats.lxcs.running += 1
                            elif status == 'stopped':
                                stats.lxcs.stopped += 1
                            
                            if status == 'running':
                                mem = lxc.get('mem', 0)
                                maxmem = lxc.get('maxmem', 1)
                                cpu = lxc.get('cpu', 0)
                                maxcpu = lxc.get('cpus', 0)
                                
                                all_usage_items.append(TopUsageItem(
                                    name=lxc.get('name', f"CT {lxc.get('vmid')}"),
                                    type='lxc',
                                    vmid=lxc.get('vmid'),
                                    node=node_name,
                                    cpu_percent=cpu * 100,
                                    cpu_used=cpu,
                                    cpu_cores=maxcpu,
                                    memory_percent=(mem / maxmem * 100) if maxmem > 0 else 0,
                                    memory_used=mem,
                                    memory_total=maxmem,
                                    status=status
                                ))
                    except Exception as e:
                        logger.error(f"Error fetching LXCs from {node_name}: {e}")
                    
                    # Tasks (per Node, letzte X Stunden)
                    try:
                        import time
                        # Hole Tasks ohne limit
                        tasks = proxmox.nodes(node_name).tasks.get()
                        
                        # Filtere nach den letzten X Stunden
                        time_threshold = time.time() - (task_hours * 60 * 60)
                        
                        node_task_counts = {'failed': 0, 'running': 0, 'success': 0}
                        
                        for task in tasks:
                            # Prüfe Zeitstempel
                            task_starttime = task.get('starttime', 0)
                            if task_starttime < time_threshold:
                                continue
                            
                            task_status = task.get('status', '').lower()
                            exitstatus = task.get('exitstatus', '')
                            
                            if task_status == 'running':
                                stats.tasks.running += 1
                                node_task_counts['running'] += 1
                            elif 'error' in task_status or (task_status == 'stopped' and exitstatus != 'OK'):
                                stats.tasks.failed += 1
                                node_task_counts['failed'] += 1
                            elif task_status == 'ok' or (task_status == 'stopped' and exitstatus == 'OK'):
                                stats.tasks.success += 1
                                node_task_counts['success'] += 1
                        
                        # Füge Node-spezifische Counts hinzu
                        from models.proxmox import TaskByNode
                        stats.tasks.by_node.append(
                            TaskByNode(node=node_name, **node_task_counts)
                        )
                    except Exception as e:
                        logger.warning(f"Could not fetch tasks from {node_name}: {e}")
                
                # Server-Name setzen
                if nodes and len(nodes) > 0:
                    stats.cluster_name = nodes[0].get('node', 'Server')
                else:
                    stats.cluster_name = 'Server'
                    
            except Exception as e:
                logger.error(f"Failed to fetch standalone server data: {e}")
                raise HTTPException(
                    status_code=503, 
                    detail=f"Server-Daten konnten nicht abgerufen werden: {str(e)}"
                )
        
        # ========================================
        # Top-Listen sortieren
        # ========================================
        stats.top_cpu_usage = sorted(all_usage_items, key=lambda x: x.cpu_percent, reverse=True)[:top_n]
        stats.top_memory_usage = sorted(all_usage_items, key=lambda x: x.memory_percent, reverse=True)[:top_n]
        
        log_audit(
            action="VIEW_CLUSTER_STATS",
            status="success",
            user_type="admin",
            ip_address=client_ip,
            details={"dashboard_id": dashboard_id}
        )
        
        return stats
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching cluster stats: {e}")
        log_audit(
            action="VIEW_CLUSTER_STATS",
            status="failed",
            user_type="admin",
            ip_address=client_ip,
            details={"error": str(e)}
        )
        raise HTTPException(
            status_code=500, 
            detail=f"Cluster-Statistiken konnten nicht abgerufen werden: {str(e)}"
        )
