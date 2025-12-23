"""Proxmox configuration and statistics models"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List

class ProxmoxConfig(BaseModel):
    id: Optional[int] = None
    host: str = Field(..., min_length=1, max_length=255)
    port: int = Field(8006, ge=1, le=65535)
    token_name: str = Field(..., min_length=1, max_length=255)  # z.B. "user@pam!tokenname"
    token_value: str = Field(..., min_length=1, max_length=1000)  # Der Secret
    verify_ssl: bool = False
    node: Optional[str] = Field(None, max_length=100)  # Optional: spezifischer Node
    is_cluster: bool = False  # NEU: Cluster oder Standalone?
    
    @validator('host')
    def host_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Host cannot be empty or whitespace only')
        return v.strip()
    
    @validator('token_name')
    def token_name_format(cls, v):
        if not v or not v.strip():
            raise ValueError('Token name cannot be empty')
        v = v.strip()
        # Format: user@realm!tokenname oder user@realm (ohne Token-ID)
        if '@' not in v:
            raise ValueError('Token name must contain @ (e.g., root@pam!mytoken)')
        return v
    
    @validator('token_value')
    def token_value_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Token value cannot be empty')
        return v.strip()
    
    @validator('node')
    def node_strip(cls, v):
        if v:
            return v.strip()
        return v


# ========================================
# Modelle für Cluster-Statistiken
# ========================================

class NodeSummary(BaseModel):
    """Zusammenfassung der Node-Status"""
    online: int = 0
    offline: int = 0
    total: int = 0


class ResourceSummary(BaseModel):
    """Zusammenfassung von VM/LXC-Status"""
    running: int = 0
    stopped: int = 0
    total: int = 0


class TopUsageItem(BaseModel):
    """Ein Element in der Top-CPU/Memory-Liste"""
    name: str
    type: str  # 'node', 'qemu', 'lxc'
    vmid: Optional[int] = None
    node: str
    cpu_percent: float = 0.0
    cpu_used: float = 0.0  # Aktuelle CPU-Nutzung in Cores
    cpu_cores: int = 0  # Anzahl CPU-Cores
    memory_percent: float = 0.0
    memory_used: int = 0  # Bytes
    memory_total: int = 0  # Bytes
    status: str = "unknown"


class TaskByNode(BaseModel):
    """Task-Statistiken pro Node"""
    node: str
    failed: int = 0
    running: int = 0
    success: int = 0


class TaskSummary(BaseModel):
    """Zusammenfassung der Proxmox-Tasks"""
    failed: int = 0
    running: int = 0
    success: int = 0
    by_node: List[TaskByNode] = []  # Detaillierte Aufschlüsselung pro Node


class ClusterStats(BaseModel):
    """Aggregierte Cluster-Statistiken für Status-Dashboard"""
    nodes: NodeSummary
    vms: ResourceSummary
    lxcs: ResourceSummary
    top_cpu_usage: List[TopUsageItem] = []
    top_memory_usage: List[TopUsageItem] = []
    tasks: TaskSummary
    cluster_name: Optional[str] = None
    is_cluster: bool = False
