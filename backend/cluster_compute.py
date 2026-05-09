"""Aggregation von Hypervisor-Compute-Metriken (nur Proxmox-Nodes, keine VM-Doppelzählung)."""
from __future__ import annotations

from typing import Any, List, Optional, Tuple

from models.proxmox import ClusterComputeAggregate, TopNodeLoad

# Gewichteter Last-Score für „Top Node“ (CPU vs. RAM)
LOAD_CPU_WEIGHT = 0.6
LOAD_MEM_WEIGHT = 0.4


def aggregate_cluster_compute(
    rows: List[dict[str, Any]],
) -> Tuple[Optional[ClusterComputeAggregate], Optional[TopNodeLoad], Optional[TopNodeLoad]]:
    """
    rows: Eintrag pro Node aus cluster/resources (type node) oder Standalone-Status:
      - node: str
      - online: bool
      - cpu: Anteil 0..1 (wie Proxmox cluster/resources)
      - maxcpu: int (Threads/Kerne)
      - mem, maxmem: int Bytes
    """
    online = [r for r in rows if r.get("online")]
    if not online:
        return None, None, None

    sum_used_cpu_cores = 0.0
    sum_maxcpu = 0
    sum_mem = 0
    sum_maxmem = 0
    candidates: List[dict[str, Any]] = []

    for r in online:
        maxcpu = int(r.get("maxcpu") or 0)
        cpu = float(r.get("cpu") or 0.0)
        mem = int(r.get("mem") or 0)
        maxmem = int(r.get("maxmem") or 0)
        node = (r.get("node") or "").strip() or "?"

        if maxcpu > 0:
            sum_used_cpu_cores += cpu * maxcpu
            sum_maxcpu += maxcpu
        if maxmem > 0:
            sum_mem += mem
            sum_maxmem += maxmem

        cpu_pct = cpu * 100.0
        mem_pct = (mem / maxmem * 100.0) if maxmem > 0 else 0.0
        load_score = LOAD_CPU_WEIGHT * cpu_pct + LOAD_MEM_WEIGHT * mem_pct
        candidates.append(
            {
                "node": node,
                "cpu_percent": cpu_pct,
                "memory_percent": mem_pct,
                "load_score": load_score,
            }
        )

    cpu_pct_agg = (sum_used_cpu_cores / sum_maxcpu * 100.0) if sum_maxcpu > 0 else 0.0
    ram_pct_agg = (sum_mem / sum_maxmem * 100.0) if sum_maxmem > 0 else 0.0

    agg = ClusterComputeAggregate(
        cpu_percent=round(cpu_pct_agg, 2),
        ram_percent=round(ram_pct_agg, 2),
        cpu_used_cores=round(sum_used_cpu_cores, 3),
        cpu_total_cores=sum_maxcpu,
        ram_used_bytes=sum_mem,
        ram_total_bytes=sum_maxmem,
        nodes_online=len(online),
    )

    by_load = max(candidates, key=lambda x: x["load_score"])
    top = TopNodeLoad(
        node=by_load["node"],
        cpu_percent=round(by_load["cpu_percent"], 2),
        memory_percent=round(by_load["memory_percent"], 2),
        load_score=round(by_load["load_score"], 2),
    )

    by_mem = max(candidates, key=lambda x: x["memory_percent"])
    top_mem: Optional[TopNodeLoad] = None
    if by_mem["node"] != by_load["node"]:
        top_mem = TopNodeLoad(
            node=by_mem["node"],
            cpu_percent=round(by_mem["cpu_percent"], 2),
            memory_percent=round(by_mem["memory_percent"], 2),
            load_score=round(by_mem["load_score"], 2),
        )

    return agg, top, top_mem
