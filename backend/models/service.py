"""Service model"""
from pydantic import BaseModel, Field, validator
from typing import Optional

class Service(BaseModel):
    id: Optional[int] = None
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    url: str = Field(..., min_length=1, max_length=500)
    icon: Optional[str] = Field(None, max_length=500)
    is_favorite: Optional[bool] = False
    dashboard_id: Optional[int] = 1
    
    @validator('name')
    def name_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Name cannot be empty or whitespace only')
        return v.strip()
    
    @validator('url')
    def url_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('URL cannot be empty or whitespace only')
        v = v.strip()
        # Block dangerous URI schemes (XSS vectors)
        dangerous = ('javascript:', 'data:', 'vbscript:', 'blob:')
        if any(v.lower().startswith(s) for s in dangerous):
            raise ValueError('URL contains a blocked scheme')
        return v
    
    @validator('description')
    def description_strip(cls, v):
        if v:
            return v.strip()
        return v
