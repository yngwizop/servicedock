"""Proxmox configuration model"""
from pydantic import BaseModel, Field, validator
from typing import Optional

class ProxmoxConfig(BaseModel):
    id: Optional[int] = None
    host: str = Field(..., min_length=1, max_length=255)
    port: int = Field(8006, ge=1, le=65535)
    token_name: str = Field(..., min_length=1, max_length=255)  # z.B. "user@pam!tokenname"
    token_value: str = Field(..., min_length=1, max_length=1000)  # Der Secret
    verify_ssl: bool = False
    node: Optional[str] = Field(None, max_length=100)  # Optional: spezifischer Node
    
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
