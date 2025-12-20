"""Config Import/Export models"""
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Any
from datetime import datetime

class ServiceExport(BaseModel):
    """Service for export (no id, will be reassigned on import)"""
    name: str
    description: Optional[str] = None
    url: str
    icon: Optional[str] = None
    position: int = 0
    is_favorite: bool = False

class ShortcutExport(BaseModel):
    """Shortcut for export (no id, will be reassigned on import)"""
    name: str
    url: str
    icon: Optional[str] = None
    position: int = 0

class DashboardExport(BaseModel):
    """Dashboard for export with nested services and shortcuts"""
    name: str
    description: Optional[str] = None
    type: str = "dashboard"
    is_active: bool = True
    show_proxmox: bool = True
    services: List[ServiceExport] = []
    shortcuts: List[ShortcutExport] = []

class AppearanceExport(BaseModel):
    """Appearance settings for export"""
    bg_color: str
    bg_image_url: Optional[str] = None
    bg_opacity: float
    shortcut_cols: int
    service_cols: int
    text_color_light: str
    text_color_dark: str
    clock_format: str
    weather_city: str
    weather_fields: List[str]
    show_spotify: bool = True
    show_weather: bool = True
    show_clock: bool = True

class ConfigExport(BaseModel):
    """Complete configuration export"""
    version: str = "1.0"
    exported_at: str
    dashboards: List[DashboardExport]
    appearance: AppearanceExport
    
    class Config:
        json_schema_extra = {
            "example": {
                "version": "1.0",
                "exported_at": "2025-12-20T10:30:00Z",
                "dashboards": [
                    {
                        "name": "Main Dashboard",
                        "description": "Default Dashboard",
                        "type": "dashboard",
                        "is_active": True,
                        "show_proxmox": True,
                        "services": [
                            {
                                "name": "Proxmox",
                                "description": "VM Management",
                                "url": "https://proxmox.local:8006",
                                "icon": "🖥️",
                                "position": 1,
                                "is_favorite": False
                            }
                        ],
                        "shortcuts": [
                            {
                                "name": "Google",
                                "url": "https://google.com",
                                "icon": "🔍",
                                "position": 1
                            }
                        ]
                    }
                ],
                "appearance": {
                    "bg_color": "#1a1f2e",
                    "bg_image_url": None,
                    "bg_opacity": 1.0,
                    "shortcut_cols": 6,
                    "service_cols": 6,
                    "text_color_light": "#ffffff",
                    "text_color_dark": "#ffffff",
                    "clock_format": "24h",
                    "weather_city": "Berlin",
                    "weather_fields": ["temperature", "humidity"],
                    "show_spotify": True,
                    "show_weather": True,
                    "show_clock": True
                }
            }
        }

class ConfigImport(BaseModel):
    """Configuration import with validation"""
    version: str
    exported_at: str
    dashboards: List[DashboardExport]
    appearance: AppearanceExport
    
    @validator('version')
    def validate_version(cls, v):
        if v != "1.0":
            raise ValueError(f'Unsupported config version: {v}. Expected: 1.0')
        return v
    
    @validator('dashboards')
    def validate_dashboards(cls, v):
        if not v or len(v) == 0:
            raise ValueError('Config must contain at least one dashboard')
        return v

class ImportMode(BaseModel):
    """Import mode selection"""
    mode: str = Field(..., pattern="^(append|replace)$")
    
    class Config:
        json_schema_extra = {
            "example": {
                "mode": "append"
            }
        }
