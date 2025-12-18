"""Dashboard model"""
from pydantic import BaseModel, Field
from typing import Optional

class Dashboard(BaseModel):
    id: Optional[int] = None
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    type: Optional[str] = Field('default', max_length=50)  # default, work, home, etc.
    is_active: Optional[bool] = True
    show_proxmox: Optional[bool] = True
    
class DashboardCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    type: Optional[str] = Field('default', max_length=50)

class DashboardResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    type: str
    is_active: bool
    service_count: int
    shortcut_count: int
    show_proxmox: bool = True
