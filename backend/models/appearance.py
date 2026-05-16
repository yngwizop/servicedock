"""Appearance model"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
import re

from core.appearance_url import validate_bg_image_url

class Appearance(BaseModel):
    id: int = 1
    bg_color: Optional[str] = Field(None, max_length=50)
    bg_image_url: Optional[str] = Field(None, max_length=1000)
    bg_opacity: Optional[float] = Field(None, ge=0.0, le=1.0)
    shortcut_cols: Optional[int] = Field(None, ge=1, le=12)
    service_cols: Optional[int] = Field(None, ge=1, le=12)
    text_color_light: Optional[str] = Field(None, max_length=50)
    text_color_dark: Optional[str] = Field(None, max_length=50)
    clock_format: Optional[str] = Field(None, max_length=10)
    weather_city: Optional[str] = Field(None, max_length=100)
    weather_fields: Optional[List[str]] = None
    show_spotify: Optional[bool] = True
    show_weather: Optional[bool] = True
    show_clock: Optional[bool] = True
    
    @validator('bg_color', 'text_color_light', 'text_color_dark')
    def validate_color(cls, v):
        if v is None:
            return v
        v = v.strip()
        # Hex-Color (#RGB oder #RRGGBB) oder CSS-Color-Name
        if not re.match(r'^#[0-9A-Fa-f]{3}$|^#[0-9A-Fa-f]{6}$|^[a-z]+$', v):
            raise ValueError('Invalid color format. Use hex (#RGB or #RRGGBB) or CSS color name')
        return v
    
    @validator('clock_format')
    def validate_clock_format(cls, v):
        if v is None:
            return v
        v = v.strip()
        if v not in ['12h', '24h']:
            raise ValueError('Clock format must be "12h" or "24h"')
        return v
    
    @validator('bg_image_url')
    def validate_bg_image_url_field(cls, v):
        return validate_bg_image_url(v)

    @validator('weather_fields')
    def validate_weather_fields(cls, v):
        if v is None:
            return v
        allowed = ['temperature', 'humidity', 'pressure', 'wind', 'description', 'precipitation', 'cloudCover']
        for field in v:
            if field not in allowed:
                raise ValueError(f'Invalid weather field: {field}. Allowed: {allowed}')
        return v
