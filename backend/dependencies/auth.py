"""Authentication dependencies and helpers"""
import os
from typing import Optional
from fastapi import HTTPException, Depends, Request, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from config.settings import SECRET_KEY, ALGORITHM, ADMIN_PASSWORD
from core.security import get_password_hash
from core.logging import logger

# HTTP Bearer token scheme
security = HTTPBearer(auto_error=False)  # auto_error=False to check cookie fallback

# Global admin password hash
ADMIN_PASSWORD_HASH = None

# X-Forwarded-For Trust Configuration
TRUST_FORWARDED_HEADERS = os.getenv("TRUST_FORWARDED_HEADERS", "false").lower() == "true"
TRUSTED_PROXIES = [ip.strip() for ip in os.getenv("TRUSTED_PROXIES", "").split(",") if ip.strip()]

def verify_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    access_token: Optional[str] = Cookie(None)
) -> dict:
    """
    Verifiziert das JWT-Token aus Cookie (bevorzugt) oder Authorization Header (Fallback).
    Cookie-basierte Auth bietet besseren XSS-Schutz.
    """
    token = None
    
    # Priorität 1: httpOnly Cookie (sicherer)
    if access_token:
        token = access_token
    # Fallback: Authorization Header (für API-Clients)
    elif credentials:
        token = credentials.credentials
    
    if not token:
        raise HTTPException(
            status_code=401, 
            detail="Authentication required"
        )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

def require_role(required_role: str):
    """
    Dependency für Rollen-basierte Zugriffskontrolle.
    Prüft ob der Token die erforderliche Rolle hat.
    Unterstützt Cookie und Header-basierte Auth.
    
    Usage:
        @app.get("/api/admin/something")
        def admin_only(token: dict = Depends(require_role("admin"))):
            ...
    """
    def role_checker(
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
        access_token: Optional[str] = Cookie(None)
    ) -> dict:
        token = None
        
        # Priorität 1: httpOnly Cookie
        if access_token:
            token = access_token
        # Fallback: Authorization Header
        elif credentials:
            token = credentials.credentials
        
        if not token:
            raise HTTPException(
                status_code=401,
                detail="Authentication required"
            )
        
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            
            # Prüfe Username
            username: str = payload.get("sub")
            if username is None:
                raise HTTPException(
                    status_code=401, 
                    detail="Invalid authentication credentials"
                )
            
            # Prüfe Rolle
            user_role = payload.get("type")
            if user_role != required_role:
                raise HTTPException(
                    status_code=403, 
                    detail=f"Access denied. Required role: {required_role}"
                )
            
            return payload
            
        except JWTError:
            raise HTTPException(
                status_code=401, 
                detail="Invalid authentication credentials"
            )
    
    return role_checker

def get_client_ip(request: Request) -> str:
    """
    Extrahiert die Client-IP aus dem Request.
    Berücksichtigt X-Forwarded-For nur wenn TRUST_FORWARDED_HEADERS=true
    """
    # Wenn Forwarded Headers vertrauenswürdig sind (hinter Reverse Proxy)
    if TRUST_FORWARDED_HEADERS:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # Nimm die erste IP (Original Client)
            client_ip = forwarded.split(",")[0].strip()
            
            # Optional: Prüfe ob Request von vertrauenswürdigem Proxy kommt
            if TRUSTED_PROXIES and request.client:
                proxy_ip = request.client.host
                if proxy_ip not in TRUSTED_PROXIES:
                    logger.warning(f"Untrusted proxy {proxy_ip} sent X-Forwarded-For: {client_ip}")
                    # Fallback auf Proxy-IP (sicherer)
                    return proxy_ip
            
            return client_ip
    
    # Fallback: Direkte Client-IP (ohne Proxy)
    if request.client:
        return request.client.host
    
    return "unknown"

def initialize_admin_password():
    """
    Initialisiert das Admin-Passwort beim ersten Start.
    ADMIN_PASSWORD muss gesetzt sein - kein Fallback!
    """
    global ADMIN_PASSWORD_HASH
    
    if not ADMIN_PASSWORD:
        raise ValueError(
            "ADMIN_PASSWORD environment variable is required! "
            "Set a strong password (min. 8 characters) in your .env file."
        )
    
    if len(ADMIN_PASSWORD) < 8:
        raise ValueError(
            f"ADMIN_PASSWORD must be at least 8 characters long! "
            f"Current length: {len(ADMIN_PASSWORD)}"
        )
    
    ADMIN_PASSWORD_HASH = get_password_hash(ADMIN_PASSWORD)
    logger.info(f"Admin password initialized (hashed, length: {len(ADMIN_PASSWORD)} chars)")

# Initialisiere beim Import
initialize_admin_password()
