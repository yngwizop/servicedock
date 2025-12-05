"""Authentication router - Login endpoint"""
from datetime import timedelta
from fastapi import APIRouter, Request, HTTPException, Depends, Response, Cookie
from typing import Optional

from models.auth import AdminLogin
from core.security import verify_password, create_access_token
from core.rate_limiting import check_login_rate_limit, record_failed_login, reset_failed_login
from core.audit import log_audit
from core.limiter import limiter
from dependencies.auth import get_client_ip, ADMIN_PASSWORD_HASH
from config.settings import ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS, ENVIRONMENT, SECRET_KEY, ALGORITHM
from jose import JWTError, jwt

router = APIRouter()

@router.post("/api/login")
@limiter.limit("5/minute")
def login(creds: AdminLogin, request: Request, response: Response):
    """
    Login endpoint with dual-layer rate-limiting:
    - Layer 1: SlowAPI rate limiter (5 requests/minute) - applied in main.py
    - Layer 2: IP-based lockout after failed attempts
    
    Stores JWT in httpOnly cookie for better XSS protection
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
    
    # Create Access Token (short-lived)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": "admin", "type": "admin"},
        expires_delta=access_token_expires
    )
    
    # Create Refresh Token (long-lived)
    refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token = create_access_token(
        data={"sub": "admin", "type": "admin", "token_type": "refresh"},
        expires_delta=refresh_token_expires
    )
    
    # Set httpOnly cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,  # Prevents JavaScript access (XSS protection)
        secure=ENVIRONMENT == "production",  # HTTPS only in production
        samesite="strict",  # ✅ CSRF protection - verhindert Cross-Site Requests
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=ENVIRONMENT == "production",
        samesite="strict",  # ✅ CSRF protection
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/"
    )
    
    log_audit(
        action="LOGIN_SUCCESS",
        status="success",
        user_type="admin",
        ip_address=client_ip
    )
    
    return {
        "message": "Login successful",
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@router.post("/api/refresh")
@limiter.limit("10/minute")
def refresh_token(
    request: Request, 
    response: Response,
    refresh_token: Optional[str] = Cookie(None)
):
    """
    Refresh access token using refresh token from cookie
    """
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token provided")
    
    try:
        # Verify refresh token
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Check if it's actually a refresh token
        if payload.get("token_type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        username = payload.get("sub")
        if username is None or username != "admin":
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Create new access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        new_access_token = create_access_token(
            data={"sub": "admin", "type": "admin"},
            expires_delta=access_token_expires
        )
        
        # Update access token cookie
        response.set_cookie(
            key="access_token",
            value=new_access_token,
            httponly=True,
            secure=ENVIRONMENT == "production",
            samesite="strict",  # ✅ CSRF protection
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            path="/"
        )
        
        client_ip = get_client_ip(request)
        log_audit(
            action="TOKEN_REFRESH",
            status="success",
            user_type="admin",
            ip_address=client_ip
        )
        
        return {
            "message": "Token refreshed",
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
        
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@router.post("/api/logout")
def logout(response: Response):
    """
    Logout endpoint - removes httpOnly cookies
    """
    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        samesite="lax"
    )
    
    response.delete_cookie(
        key="refresh_token",
        path="/",
        httponly=True,
        samesite="lax"
    )
    
    return {"message": "Logout successful"}
