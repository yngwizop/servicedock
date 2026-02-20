"""Authentication dependencies and helpers"""
import os
from typing import Optional
from fastapi import HTTPException, Depends, Request, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from config.settings import SECRET_KEY, ALGORITHM, ADMIN_PASSWORD
from core.security import get_password_hash, verify_password
from core.logging import logger
import config.database as database_module

# HTTP Bearer token scheme
security = HTTPBearer(auto_error=False)  # auto_error=False to check cookie fallback

# X-Forwarded-For Trust Configuration
TRUST_FORWARDED_HEADERS = os.getenv("TRUST_FORWARDED_HEADERS", "false").lower() == "true"
TRUSTED_PROXIES = [ip.strip() for ip in os.getenv("TRUSTED_PROXIES", "").split(",") if ip.strip()]


def get_admin_password_hash() -> str:
    """Liest den Admin-Passwort-Hash aus der DB (admin_auth Tabelle)."""
    pool = database_module.db_pool
    if pool is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    db = pool.getconn()
    try:
        cur = db.cursor()
        cur.execute("SELECT password_hash FROM admin_auth WHERE id = 1")
        row = cur.fetchone()
        cur.close()
        if not row:
            raise HTTPException(status_code=500, detail="Admin auth not configured")
        return row[0]
    finally:
        pool.putconn(db)


def get_admin_force_change() -> bool:
    """Prüft ob Admin-Passwort geändert werden muss."""
    pool = database_module.db_pool
    if pool is None:
        return False
    
    db = pool.getconn()
    try:
        cur = db.cursor()
        cur.execute("SELECT force_change FROM admin_auth WHERE id = 1")
        row = cur.fetchone()
        cur.close()
        return bool(row[0]) if row else False
    finally:
        pool.putconn(db)


def update_admin_password(new_password: str) -> None:
    """Setzt ein neues Admin-Passwort in der DB (gehashed)."""
    if len(new_password) < 8:
        raise ValueError("Password must be at least 8 characters")
    
    new_hash = get_password_hash(new_password)
    pool = database_module.db_pool
    if pool is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    db = pool.getconn()
    try:
        cur = db.cursor()
        cur.execute(
            "UPDATE admin_auth SET password_hash = %s, force_change = FALSE, updated_at = NOW() WHERE id = 1",
            (new_hash,)
        )
        db.commit()
        cur.close()
        logger.info("Admin password updated successfully")
    finally:
        pool.putconn(db)

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


def require_any_role(*roles: str):
    """
    Dependency die mehrere Rollen erlaubt.
    Z.B. für Endpunkte die Admin UND Viewer nutzen dürfen.
    
    Usage:
        @app.get("/api/services")
        def get_services(token: dict = Depends(require_any_role("admin", "viewer"))):
            ...
    """
    def role_checker(
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
        access_token: Optional[str] = Cookie(None)
    ) -> dict:
        token = None
        
        if access_token:
            token = access_token
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
                raise HTTPException(
                    status_code=401,
                    detail="Invalid authentication credentials"
                )
            
            user_role = payload.get("type")
            if user_role not in roles:
                raise HTTPException(
                    status_code=403,
                    detail=f"Access denied. Required role: {' or '.join(roles)}"
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
    Migriert ADMIN_PASSWORD aus .env in die DB (einmalig).
    Falls ADMIN_PASSWORD gesetzt und DB-Passwort noch 'changeme' ist → übernehmen.
    Wird beim App-Start aufgerufen (main.py startup).
    """
    if not ADMIN_PASSWORD:
        logger.info("No ADMIN_PASSWORD in .env — using DB-based auth (admin_auth table)")
        return
    
    pool = database_module.db_pool
    if pool is None:
        logger.warning("DB pool not ready for admin password migration")
        return
    
    db = pool.getconn()
    try:
        cur = db.cursor()
        cur.execute("SELECT password_hash, force_change FROM admin_auth WHERE id = 1")
        row = cur.fetchone()
        cur.close()
        
        if row and row[1]:  # force_change == True → Noch Default
            # Migriere .env Passwort in DB
            new_hash = get_password_hash(ADMIN_PASSWORD)
            cur = db.cursor()
            cur.execute(
                "UPDATE admin_auth SET password_hash = %s, force_change = FALSE, updated_at = NOW() WHERE id = 1",
                (new_hash,)
            )
            db.commit()
            cur.close()
            logger.info(f"Migrated ADMIN_PASSWORD from .env to DB (length: {len(ADMIN_PASSWORD)} chars)")
            logger.info("You can now remove ADMIN_PASSWORD from your .env file!")
        elif not row:
            # Keine admin_auth Zeile — Insert mit .env Passwort
            new_hash = get_password_hash(ADMIN_PASSWORD)
            cur = db.cursor()
            cur.execute(
                "INSERT INTO admin_auth (id, password_hash, force_change) VALUES (1, %s, FALSE)",
                (new_hash,)
            )
            db.commit()
            cur.close()
            logger.info("Created admin_auth from .env ADMIN_PASSWORD")
        else:
            logger.info("Admin password already set in DB — ignoring .env ADMIN_PASSWORD")
    except Exception as e:
        logger.error(f"Error during admin password migration: {e}")
    finally:
        pool.putconn(db)
