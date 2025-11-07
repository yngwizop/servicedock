"""Shortcut model"""
from pydantic import BaseModel
from typing import Optional

class Shortcut(BaseModel):
    id: Optional[int] = None
    name: str
    url: str
    icon: Optional[str] = None
