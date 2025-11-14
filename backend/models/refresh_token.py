"""Refresh Token Models"""
from pydantic import BaseModel

class RefreshTokenRequest(BaseModel):
    """Request model for refresh token"""
    # Refresh token will come from httpOnly cookie
    pass

class TokenResponse(BaseModel):
    """Response model for token endpoints"""
    message: str
    token_type: str = "bearer"
    expires_in: int
