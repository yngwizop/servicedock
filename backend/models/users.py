"""Pydantic models for local user management."""
import re
from typing import Optional

from pydantic import BaseModel, Field, validator


class LocalUserCreate(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=8, max_length=1000)
    role: str = Field(..., max_length=20)
    display_name: Optional[str] = Field(None, max_length=255)

    @validator("username")
    def username_normalized(cls, v: str) -> str:
        s = (v or "").strip().lower()
        if not s:
            raise ValueError("username required")
        if not re.match(r"^[a-z0-9][a-z0-9._-]{0,99}$", s):
            raise ValueError("invalid username")
        return s

    @validator("role")
    def role_ok(cls, v: str) -> str:
        if v not in ("admin", "viewer"):
            raise ValueError("role must be admin or viewer")
        return v


class LocalUserUpdate(BaseModel):
    role: Optional[str] = Field(None, max_length=20)
    enabled: Optional[bool] = None
    display_name: Optional[str] = Field(None, max_length=255)
    new_password: Optional[str] = Field(None, min_length=8, max_length=1000)

    @validator("role")
    def role_ok_optional(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ("admin", "viewer"):
            raise ValueError("role must be admin or viewer")
        return v


class LocalUserResponse(BaseModel):
    id: int
    username: str
    role: str
    display_name: Optional[str]
    enabled: bool
    force_change: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
