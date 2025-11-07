"""Pydantic models package"""
from .shortcut import Shortcut
from .service import Service
from .appearance import Appearance
from .proxmox import ProxmoxConfig
from .auth import AdminLogin, DeleteLogsRequest

__all__ = [
    "Shortcut",
    "Service",
    "Appearance",
    "ProxmoxConfig",
    "AdminLogin",
    "DeleteLogsRequest",
]
