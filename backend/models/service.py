"""Service model"""
from pydantic import BaseModel, Field, validator
from typing import Optional

class Service(BaseModel):
    id: Optional[int] = None
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    url: str = Field(..., min_length=1, max_length=500)
    icon: Optional[str] = Field(None, max_length=500)
    
    @validator('name')
    def name_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Name cannot be empty or whitespace only')
        return v.strip()
    
    @validator('url')
    def url_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('URL cannot be empty or whitespace only')
        return v.strip()
    
    @validator('description')
    def description_strip(cls, v):
        if v:
            return v.strip()
        return v
