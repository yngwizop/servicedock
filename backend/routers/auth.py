"""Authentication router - Login endpoint with AD + Local support"""
from datetime import timedelta
from fastapi import APIRouter, Request, HTTPException, Depends, Response, Cookie
from typing import Optional

from models.auth import AdminLogin
from core.security import verify_password, create_access_token
from core.rate_limiting import check_login_rate_limit, record_failed_login, reset_failed_login
from core.audit import log_audit
from core.limiter import limiter
from core.ldap_auth import ldap_authenticate, get_ldap_config
from dependencies.auth import get_client_ip, ADMIN_PASSWORD_HASH
from config.settings import ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS, ENVIRONMENT, SECRET_KEY, ALGORITHM
from jose import JWTError, jwt

router = APIRouter()


def _set_auth_cookies(response: Response, user_sub: str, user_type: str, auth_method: str, display_name: str = None):
    """Helper: JWT-Cookies setzen für beliebigen User/Rolle"""
    token_data = {
        "sub": user_sub,
        "type": user_type,
        "auth_method": auth_method,
    }
    if display_name:
        token_data["display_name"] = display_name
    
    # Access Token (short-lived)
    access_token = create_access_token(
        data=token_data,
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    # Refresh Token (long-lived)
    refresh_data = {**token_data, "token_type": "refresh"}
    refresh_token = create_access_token(
        data=refresh_data,
        expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=ENVIRONMENT == "production",
        samesite="strict",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=ENVIRONMENT == "production",
        samesite="strict",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/"
    )


@router.post("/api/login")
@limiter.limit("5/minute")
def login(creds: AdminLogin, request: Request, response: Response):
    """
    Login endpoint with AD + Local fallback:
    1. Wenn AD enabled UND username angegeben → LDAP-Auth versuchen
    2. Wenn LDAP fehlschlägt ODER kein username → Local-Login (Passwort)
    
    Dual-layer rate-limiting + httpOnly Cookie JWT
    """
    client_ip = get_client_ip(request)
    
    # Layer 2: Check IP-based lockout
    is_allowed, error_msg = check_login_rate_limit(client_ip)
    if not is_allowed:
        log_audit(
            action="LOGIN_BLOCKED",
            status="denied",
            user_type="unknown",
            ip_address=client_ip,
            details={"reason": "too_many_failed_attempts"}
        )
        raise HTTPException(status_code=429, detail=error_msg)
    
    # --- AD Login Versuch ---
    if creds.username:
        ldap_config = get_ldap_config()
        if ldap_config and ldap_config.get("enabled"):
            ad_result = ldap_authenticate(creds.username, creds.password)
            
            if ad_result:
                # AD Login erfolgreich
                reset_failed_login(client_ip)
                
                _set_auth_cookies(
                    response=response,
                    user_sub=ad_result["username"],
                    user_type=ad_result["role"],  # "admin" oder "viewer"
                    auth_method="ad",
                    display_name=ad_result.get("display_name"),
                )
                
                log_audit(
                    action="LOGIN_SUCCESS",
                    status="success",
                    user_type=ad_result["role"],
                    ip_address=client_ip,
                    details={
                        "auth_method": "ad",
                        "username": ad_result["username"],
                        "display_name": ad_result.get("display_name"),
                    }
                )
                
                return {
                    "message": "Login successful",
                    "token_type": "bearer",
                    "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                    "auth_method": "ad",
                    "role": ad_result["role"],
                    "username": ad_result["username"],
                    "display_name": ad_result.get("display_name"),
                }
            
            # AD fehlgeschlagen — Fallback auf Local nur wenn kein Username
            # Wenn Username angegeben wurde, ist es ein AD-Login-Versuch
            record_failed_login(client_ip)
            log_audit(
                action="LOGIN_FAILED",
                status="failed",
                user_type="unknown",
                ip_address=client_ip,
                details={"reason": "ad_auth_failed", "username": creds.username}
            )
            raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # --- Local Login (Passwort-only) ---
    if not verify_password(creds.password, ADMIN_PASSWORD_HASH):
        record_failed_login(client_ip)
        
        log_audit(
            action="LOGIN_FAILED",
            status="failed",
            user_type="admin",
            ip_address=client_ip,
            details={"reason": "invalid_password", "auth_method": "local"}
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Local Login erfolgreich
    reset_failed_login(client_ip)
    
    _set_auth_cookies(
        response=response,
        user_sub="admin",
        user_type="admin",
        auth_method="local",
    )
    
    log_audit(
        action="LOGIN_SUCCESS",
        status="success",
        user_type="admin",
        ip_address=client_ip,
        details={"auth_method": "local"}
    )
    
    return {
        "message": "Login successful",
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "auth_method": "local",
        "role": "admin",
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
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Payload-Daten durchreichen (sub, type, auth_method, display_name)
        user_type = payload.get("type", "admin")
        auth_method = payload.get("auth_method", "local")
        display_name = payload.get("display_name")
        
        _set_auth_cookies(
            response=response,
            user_sub=username,
            user_type=user_type,
            auth_method=auth_method,
            display_name=display_name,
        )
        
        client_ip = get_client_ip(request)
        log_audit(
            action="TOKEN_REFRESH",
            status="success",
            user_type=user_type,
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
        secure=ENVIRONMENT == "production",
        samesite="strict"
    )
    
    response.delete_cookie(
        key="refresh_token",
        path="/",
        httponly=True,
        secure=ENVIRONMENT == "production",
        samesite="strict"
    )
    
    return {"message": "Logout successful"}


@router.get("/api/auth/mode")
@limiter.limit("30/minute")
def get_auth_mode(request: Request):
    """
    Public endpoint (kein Auth nötig) — das Frontend fragt ab,
    ob AD-Login verfügbar ist, damit das Login-Modal das Username-Feld zeigt.
    Gibt keine sensiblen Daten zurück.
    """
    ldap_config = get_ldap_config()
    ad_enabled = bool(ldap_config and ldap_config.get("enabled"))
    domain = ldap_config.get("domain") if ad_enabled else None
    
    return {
        "ad_enabled": ad_enabled,
        "domain": domain,  # z.B. "homelab.local" — Hinweis im Login-Modal
    }
