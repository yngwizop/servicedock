"""Response models for API endpoints"""
from pydantic import BaseModel
from typing import Optional, List

class ServiceResponse(BaseModel):
    """Response model for Service endpoints"""
    id: int
    name: str
    description: Optional[str]
    url: str
    icon: Optional[str]
    position: int
    is_favorite: Optional[bool] = False
    
    class Config:
        from_attributes = True  # Pydantic v2

class ShortcutResponse(BaseModel):
    """Response model for Shortcut endpoints"""
    id: int
    name: str
    url: str
    icon: Optional[str]
    position: int
    
    class Config:
        from_attributes = True

class AppearanceResponse(BaseModel):
    """Response model for Appearance settings"""
    bg_color: str
    bg_image_url: Optional[str]
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
    
    class Config:
        from_attributes = True
