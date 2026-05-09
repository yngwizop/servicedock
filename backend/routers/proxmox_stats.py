"""Proxmox Cluster Statistics - Aggregierte Daten für Status-Dashboard"""
import time

from fastapi import APIRouter, Request, HTTPException, Depends
from typing import List

from routers.proxmox import get_proxmox_connection
from models.proxmox import ClusterStats, NodeSummary, ResourceSummary, TopUsageItem, TaskSummary
from cluster_compute import aggregate_cluster_compute
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
    - compute_cluster / top_node: aggregierte Host-CPU/RAM und „heißester“ Node
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
        compute_node_rows: List[dict] = []

        # ========================================
        # CLUSTER-MODUS
        # ========================================
        if is_cluster:
            # Clustername abrufen
            try:
                cluster_status = proxmox.cluster.status.get()
                # Nur Clustername — Node-Zählung kommt ausschließlich aus cluster.resources
                # (vermeidet Doppelzählung; resources berücksichtigt zudem configured_node).
                for item in cluster_status:
                    if item.get('type') == 'cluster':
                        stats.cluster_name = item.get('name', 'Cluster')
                if not stats.cluster_name:
                    stats.cluster_name = 'Cluster'
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
                            disk = resource.get('disk', 0)
                            maxdisk = resource.get('maxdisk', 1)
                            
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
                                disk_percent=(disk / maxdisk * 100) if maxdisk > 0 else 0,
                                disk_used=disk,
                                disk_total=maxdisk,
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
                            disk = resource.get('disk', 0)
                            maxdisk = resource.get('maxdisk', 1)
                            
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
                                disk_percent=(disk / maxdisk * 100) if maxdisk > 0 else 0,
                                disk_used=disk,
                                disk_total=maxdisk,
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
                        disk = resource.get('disk', 0)
                        maxdisk = resource.get('maxdisk', 1)
                        
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
                            disk_percent=(disk / maxdisk * 100) if maxdisk > 0 else 0,
                            disk_used=disk,
                            disk_total=maxdisk,
                            status=node_status
                        ))

                        if node_name:
                            compute_node_rows.append({
                                'node': node_name,
                                'online': node_status == 'online',
                                'cpu': float(cpu or 0),
                                'maxcpu': int(maxcpu or 0),
                                'mem': int(mem or 0),
                                'maxmem': int(maxmem or 0),
                            })

                stats.compute_cluster, stats.top_node, stats.top_node_memory = (
                    aggregate_cluster_compute(compute_node_rows)
                )

            except Exception as e:
                logger.error(f"Failed to fetch cluster resources: {e}")
                raise HTTPException(
                    status_code=503, 
                    detail="Cluster-Ressourcen konnten nicht abgerufen werden"
                )

            # Tasks abrufen (letzte X Stunden)
            try:
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
                        key=lambda x: (-x[1]['failed'], (x[0] or '').lower()),
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
                        rootfs = node_status.get('rootfs', {})
                        
                        mem_used = memory.get('used', 0)
                        mem_total = memory.get('total', 1)
                        cpu = node_status.get('cpu', 0)
                        cpuinfo = node_status.get('cpuinfo', {})
                        cpu_cores = cpuinfo.get('cpus', 0)
                        disk_used = rootfs.get('used', 0)
                        disk_total = rootfs.get('total', 1)
                        
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
                            disk_percent=(disk_used / disk_total * 100) if disk_total > 0 else 0,
                            disk_used=disk_used,
                            disk_total=disk_total,
                            status='online' if node_status_str == 'online' else 'offline'
                        ))

                        compute_node_rows.append({
                            'node': node_name,
                            'online': node_status_str == 'online',
                            'cpu': float(cpu or 0),
                            'maxcpu': int(cpu_cores or 0),
                            'mem': int(mem_used or 0),
                            'maxmem': int(mem_total or 0),
                        })
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
                                disk = vm.get('disk', 0)
                                maxdisk = vm.get('maxdisk', 1)
                                
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
                                    disk_percent=(disk / maxdisk * 100) if maxdisk > 0 else 0,
                                    disk_used=disk,
                                    disk_total=maxdisk,
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
                                disk = lxc.get('disk', 0)
                                maxdisk = lxc.get('maxdisk', 1)
                                
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
                                    disk_percent=(disk / maxdisk * 100) if maxdisk > 0 else 0,
                                    disk_used=disk,
                                    disk_total=maxdisk,
                                    status=status
                                ))
                    except Exception as e:
                        logger.error(f"Error fetching LXCs from {node_name}: {e}")
                    
                    # Tasks (per Node, letzte X Stunden)
                    try:
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
                
                stats.tasks.by_node.sort(key=lambda x: (x.node or "").lower())

                stats.compute_cluster, stats.top_node, stats.top_node_memory = (
                    aggregate_cluster_compute(compute_node_rows)
                )

                # Server-Name setzen
                if nodes and len(nodes) > 0:
                    stats.cluster_name = nodes[0].get('node', 'Server')
                else:
                    stats.cluster_name = 'Server'

            except Exception as e:
                logger.error(f"Failed to fetch standalone server data: {e}")
                raise HTTPException(
                    status_code=503, 
                    detail="Server-Daten konnten nicht abgerufen werden"
                )

        # ========================================
        # STORAGE-DATEN sammeln
        # ========================================
        from models.proxmox import StorageItem, StorageTotal, StorageByNode, StorageByType
        
        storage_items: List[StorageItem] = []
        storage_by_node_dict = {}  # Dict[node_name, List[StorageItem]]
        storage_by_type_dict = {}  # Dict[storage_type, List[StorageItem]]
        
        try:
            # Hole alle Nodes
            nodes_to_check = []
            if is_cluster:
                try:
                    cluster_nodes = proxmox.cluster.status.get()
                    for item in cluster_nodes:
                        if item.get('type') == 'node' and item.get('online', 0) == 1:
                            node_name = item.get('name')
                            if configured_node and node_name != configured_node:
                                continue
                            nodes_to_check.append(node_name)
                except Exception as e:
                    logger.warning(f"Could not fetch cluster nodes for storage: {e}")
            else:
                # Standalone: Nutze configured_node
                if configured_node:
                    nodes_to_check.append(configured_node)

            # Feste Reihenfolge: API liefert Node-Reihenfolge nicht garantiert stabil
            nodes_to_check.sort()
            
            # Hole Storage-Daten für jeden Node
            for node_name in nodes_to_check:
                try:
                    storages = proxmox.nodes(node_name).storage.get()
                    for storage in storages:
                        storage_name = storage.get('storage')
                        storage_type = storage.get('type', 'unknown')
                        
                        # Nur aktive/enabled Storages
                        if storage.get('enabled', 1) != 1:
                            continue
                        if storage.get('active', 1) != 1:
                            continue
                        
                        # Hole Status (mit Disk-Daten)
                        try:
                            status = proxmox.nodes(node_name).storage(storage_name).status.get()
                            used = status.get('used', 0)
                            total = status.get('total', 1)
                            avail = status.get('avail', 0)
                            percent = (used / total * 100) if total > 0 else 0
                            
                            item = StorageItem(
                                storage=storage_name,
                                type=storage_type,
                                node=node_name,
                                used=used,
                                total=total,
                                percent=percent,
                                available=avail,
                                enabled=True,
                                active=True
                            )
                            storage_items.append(item)
                            
                            # Gruppiere nach Node
                            if node_name not in storage_by_node_dict:
                                storage_by_node_dict[node_name] = []
                            storage_by_node_dict[node_name].append(item)
                            
                            # Gruppiere nach Type
                            if storage_type not in storage_by_type_dict:
                                storage_by_type_dict[storage_type] = []
                            storage_by_type_dict[storage_type].append(item)
                            
                        except Exception as e:
                            # Storage Status kann fehlschlagen (z.B. NFS offline)
                            logger.debug(f"Could not get status for storage {storage_name} on {node_name}: {e}")
                            continue
                            
                except Exception as e:
                    logger.warning(f"Could not fetch storage for node {node_name}: {e}")
                    continue
            
            # Berechne Storage Total
            total_used = sum(item.used for item in storage_items)
            total_total = sum(item.total for item in storage_items)
            total_avail = sum(item.available for item in storage_items)
            
            if total_total > 0:
                stats.storage_total = StorageTotal(
                    used=total_used,
                    total=total_total,
                    percent=(total_used / total_total * 100),
                    available=total_avail
                )
            
            # Erstelle Storage By Node Liste (sortiert nach Node-Name)
            for node_name in sorted(storage_by_node_dict.keys()):
                node_storages = storage_by_node_dict[node_name]
                node_used = sum(s.used for s in node_storages)
                node_total = sum(s.total for s in node_storages)
                node_percent = (node_used / node_total * 100) if node_total > 0 else 0
                
                stats.storage_by_node.append(StorageByNode(
                    node=node_name,
                    used=node_used,
                    total=node_total,
                    percent=node_percent,
                    storages=node_storages
                ))
            
            # Erstelle Storage By Type Liste
            for storage_type, type_storages in storage_by_type_dict.items():
                type_used = sum(s.used for s in type_storages)
                type_total = sum(s.total for s in type_storages)
                type_percent = (type_used / type_total * 100) if type_total > 0 else 0
                
                stats.storage_by_type.append(StorageByType(
                    type=storage_type,
                    used=type_used,
                    total=type_total,
                    percent=type_percent,
                    count=len(type_storages)
                ))

            stats.storage_by_type.sort(key=lambda x: (x.type or "").lower())
            
        except Exception as e:
            logger.warning(f"Could not fetch storage data: {e}")

        # ========================================
        # CEPH-DATEN sammeln
        # ========================================
        from models.proxmox import CephHealth, CephOSD
        
        try:
            if is_cluster:
                # Versuche Ceph Status abzurufen
                ceph_status = proxmox.cluster.ceph.status.get()
                
                health = ceph_status.get('health', {})
                health_status = health.get('status', 'HEALTH_UNKNOWN')
                
                # OSD Daten - verschiedene API Versionen probieren
                num_osds = 0
                num_up_osds = 0
                num_in_osds = 0
                
                # Prüfe osdmap -> osdmap
                if 'osdmap' in ceph_status:
                    osdmap_data = ceph_status.get('osdmap', {})
                    
                    if isinstance(osdmap_data, dict):
                        # Prüfe ob es nochmal nested 'osdmap' gibt
                        if 'osdmap' in osdmap_data:
                            inner_osd = osdmap_data['osdmap']
                            if isinstance(inner_osd, dict):
                                num_osds = inner_osd.get('num_osds', 0)
                                num_up_osds = inner_osd.get('num_up_osds', 0)
                                num_in_osds = inner_osd.get('num_in_osds', 0)
                        else:
                            # Direkt im osdmap
                            num_osds = osdmap_data.get('num_osds', 0)
                            num_up_osds = osdmap_data.get('num_up_osds', 0)
                            num_in_osds = osdmap_data.get('num_in_osds', 0)
                
                # Fallback: pgmap
                if num_osds == 0 and 'pgmap' in ceph_status:
                    pgmap = ceph_status.get('pgmap', {})
                    num_osds = pgmap.get('num_osds', 0)
                    num_up_osds = pgmap.get('num_up_osds', 0) 
                    num_in_osds = pgmap.get('num_in_osds', 0)
                
                ceph_osd = CephOSD(
                    total=num_osds,
                    up=num_up_osds,
                    in_count=num_in_osds,
                    down=num_osds - num_up_osds,
                    out=num_osds - num_in_osds
                )
                
                stats.ceph = CephHealth(
                    status=health_status,
                    status_message=health.get('status_message'),
                    osd=ceph_osd,
                    available=True
                )

        except Exception as e:
            # Ceph nicht verfügbar (normal bei Nicht-Ceph-Clustern)
            logger.info(f"Ceph not available: {str(e)}")
            stats.ceph = CephHealth(available=False)

        # ========================================
        # Top-Listen sortieren
        # ========================================
        stats.top_cpu_usage = sorted(all_usage_items, key=lambda x: x.cpu_percent, reverse=True)[:top_n]
        stats.top_memory_usage = sorted(all_usage_items, key=lambda x: x.memory_percent, reverse=True)[:top_n]
        stats.top_disk_usage = sorted(all_usage_items, key=lambda x: x.disk_percent, reverse=True)[:top_n]

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
            detail="Cluster-Statistiken konnten nicht abgerufen werden"
        )
