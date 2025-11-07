"""Authentication models"""
from pydantic import BaseModel

class AdminLogin(BaseModel):
    password: str

class DeleteLogsRequest(BaseModel):
    password: str  # Admin password for confirmation
