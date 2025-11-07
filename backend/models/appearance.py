"""Appearance model"""
from pydantic import BaseModel, Field
from typing import Optional, List

class Appearance(BaseModel):
    id: int = 1
    bg_color: Optional[str] = None
    bg_image_url: Optional[str] = None
    bg_opacity: Optional[float] = Field(None, ge=0.0, le=1.0)
    shortcut_cols: Optional[int] = Field(None, ge=1, le=12)
    service_cols: Optional[int] = Field(None, ge=1, le=12)
    text_color_light: Optional[str] = None
    text_color_dark: Optional[str] = None
    clock_format: Optional[str] = None
    weather_city: Optional[str] = None
    weather_fields: Optional[List[str]] = None
