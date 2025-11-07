"""Reorder model for shortcuts and services"""
from pydantic import BaseModel, Field, validator
from typing import List

class ReorderRequest(BaseModel):
    newOrder: List[int] = Field(..., min_items=0, max_items=1000)
    
    @validator('newOrder')
    def validate_order(cls, v):
        if not isinstance(v, list):
            raise ValueError('newOrder must be a list of integers')
        
        # Prüfe auf negative IDs
        for item_id in v:
            if not isinstance(item_id, int):
                raise ValueError('All items in newOrder must be integers')
            if item_id < 0:
                raise ValueError('IDs cannot be negative')
        
        # Prüfe auf Duplikate
        if len(v) != len(set(v)):
            raise ValueError('Duplicate IDs found in newOrder')
        
        return v
