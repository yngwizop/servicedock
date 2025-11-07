"""Proxmox configuration model"""
from pydantic import BaseModel
from typing import Optional

class ProxmoxConfig(BaseModel):
    id: Optional[int] = None
    host: str
    port: int = 8006
    token_name: str  # z.B. "user@pam!tokenname"
    token_value: str  # Der Secret
    verify_ssl: bool = False
    node: Optional[str] = None  # Optional: spezifischer Node
