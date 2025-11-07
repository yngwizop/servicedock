"""Service model"""
from pydantic import BaseModel
from typing import Optional

class Service(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    url: str
    icon: Optional[str] = None
