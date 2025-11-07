"""Authentication router - Login endpoint"""
from datetime import timedelta
from fastapi import APIRouter, Request, HTTPException, Depends

from models.auth import AdminLogin
from core.security import verify_password, create_access_token
from core.rate_limiting import check_login_rate_limit, record_failed_login, reset_failed_login
from core.audit import log_audit
from core.limiter import limiter
from dependencies.auth import get_client_ip, ADMIN_PASSWORD_HASH
from config.settings import ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter()

@router.post("/api/login")
@limiter.limit("5/minute")
def login(creds: AdminLogin, request: Request):
    """
    Login endpoint with dual-layer rate-limiting:
    - Layer 1: SlowAPI rate limiter (5 requests/minute) - applied in main.py
    - Layer 2: IP-based lockout after failed attempts
    """
    client_ip = get_client_ip(request)
    
    # Layer 2: Check IP-based lockout
    is_allowed, error_msg = check_login_rate_limit(client_ip)
    if not is_allowed:
        log_audit(
            action="LOGIN_BLOCKED",
            status="denied",
            user_type="admin",
            ip_address=client_ip,
            details={"reason": "too_many_failed_attempts"}
        )
        raise HTTPException(status_code=429, detail=error_msg)
    
    # Verify password
    if not verify_password(creds.password, ADMIN_PASSWORD_HASH):
        record_failed_login(client_ip)
        
        log_audit(
            action="LOGIN_FAILED",
            status="failed",
            user_type="admin",
            ip_address=client_ip,
            details={"reason": "invalid_password"}
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Success - reset counter
    reset_failed_login(client_ip)
    
    # Create JWT token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": "admin", "type": "admin"},
        expires_delta=access_token_expires
    )
    
    log_audit(
        action="LOGIN_SUCCESS",
        status="success",
        user_type="admin",
        ip_address=client_ip
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }
