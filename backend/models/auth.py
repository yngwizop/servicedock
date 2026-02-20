"""Authentication models"""
from pydantic import BaseModel, Field, validator
from typing import Optional

class AdminLogin(BaseModel):
    username: Optional[str] = Field(None, max_length=255)  # Optional: für AD-Login
    password: str = Field(..., min_length=1, max_length=1000)
    
    @validator('password')
    def password_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Password cannot be empty')
        return v

class DeleteLogsRequest(BaseModel):
    password: str = Field(..., min_length=1, max_length=1000)  # Admin password for confirmation
    
    @validator('password')
    def password_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Password cannot be empty')
        return v
