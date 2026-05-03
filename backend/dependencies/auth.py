"""Authentication dependencies and helpers"""
import os
from typing import Optional
from fastapi import HTTPException, Depends, Request, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from config.settings import SECRET_KEY, ALGORITHM, ADMIN_PASSWORD
from core.security import get_password_hash, verify_password
from core.logging import logger
from core.local_users import (
    get_user_by_username,
    sync_admin_auth_from_local_admin,
    update_local_user,
)
import config.database as database_module

# HTTP Bearer token scheme
security = HTTPBearer(auto_error=False)  # auto_error=False to check cookie fallback

# X-Forwarded-For Trust Configuration
TRUST_FORWARDED_HEADERS = os.getenv("TRUST_FORWARDED_HEADERS", "false").lower() == "true"
TRUSTED_PROXIES = [ip.strip() for ip in os.getenv("TRUSTED_PROXIES", "").split(",") if ip.strip()]


def get_force_change_for_username(username: str) -> bool:
    """force_change-Flag für den genannten lokalen Benutzer."""
    u = get_user_by_username(username)
    if not u:
        return False
    return bool(u.get("force_change"))


def get_admin_force_change() -> bool:
    """Legacy: entspricht force_change für den eingebauten User ``admin``."""
    return get_force_change_for_username("admin")


def update_local_user_password(username: str, new_password: str) -> None:
    """Setzt Passwort für lokalen User (username, kleingeschrieben)."""
    if len(new_password) < 8:
        raise ValueError("Password must be at least 8 characters")

    u = get_user_by_username(username)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    new_hash = get_password_hash(new_password)
    update_local_user(
        int(u["id"]),
        password_hash=new_hash,
        force_change=False,
    )
    if u["username"].lower() == "admin":
        sync_admin_auth_from_local_admin()
    logger.info("Local user password updated: %s", username)


def verify_destructive_password(token: dict, password: str) -> bool:
    """
    Passwort-Bestätigung für kritische Aktionen (lokal: bcrypt; AD: LDAP-Bind).
    """
    sub = token.get("sub")
    if not sub or not password:
        return False
    method = token.get("auth_method") or "local"
    if method == "ad":
        from core.ldap_auth import ldap_authenticate

        return bool(ldap_authenticate(sub, password))
    u = get_user_by_username(sub)
    if not u or not u.get("enabled"):
        return False
    return verify_password(password, u["password_hash"])

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


def require_help_docs_access(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    access_token: Optional[str] = Cookie(None),
) -> dict:
    """
    Settings-Hilfe (Markdown unter /api/docs/help):
    - Ohne aktiviertes LDAP/AD: admin oder viewer (wie andere Lese-Endpunkte).
    - Mit aktiviertem LDAP/AD: nur admin (Viewer hat keinen Settings-Zugang).
    """
    from core.ldap_auth import get_ldap_config

    token = None
    if access_token:
        token = access_token
    elif credentials:
        token = credentials.credentials

    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: Optional[str] = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication credentials",
            )

        user_role = payload.get("type")
        ldap_cfg = get_ldap_config()
        ldap_enabled = bool(ldap_cfg and ldap_cfg.get("enabled"))
        allowed_roles = ("admin",) if ldap_enabled else ("admin", "viewer")

        if user_role not in allowed_roles:
            detail = (
                "Access denied. Help documentation requires admin when LDAP/AD is enabled."
                if ldap_enabled
                else f"Access denied. Required role: {' or '.join(allowed_roles)}"
            )
            raise HTTPException(status_code=403, detail=detail)

        return payload
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
        )


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
    Migriert ADMIN_PASSWORD aus .env in local_users (User ``admin``) bzw. legacy admin_auth.
    Wird beim App-Start nach ensure_local_users_schema_and_bootstrap aufgerufen.
    """
    if not ADMIN_PASSWORD:
        logger.info("No ADMIN_PASSWORD in .env — using DB-based auth (local_users)")
        return

    pool = database_module.db_pool
    if pool is None:
        logger.warning("DB pool not ready for admin password migration")
        return

    db = pool.getconn()
    try:
        new_hash = get_password_hash(ADMIN_PASSWORD)
        cur = db.cursor()
        cur.execute(
            """
            SELECT id, force_change FROM local_users WHERE lower(username) = 'admin'
            """
        )
        lu = cur.fetchone()
        cur.close()

        if lu and lu[1]:
            cur = db.cursor()
            cur.execute(
                """
                UPDATE local_users SET password_hash = %s, force_change = FALSE, updated_at = NOW()
                WHERE id = %s
                """,
                (new_hash, lu[0]),
            )
            db.commit()
            cur.close()
            sync_admin_auth_from_local_admin()
            logger.info(
                "Migrated ADMIN_PASSWORD from .env to local_users (admin) "
                f"(length: {len(ADMIN_PASSWORD)} chars)"
            )
            logger.info("You can now remove ADMIN_PASSWORD from your .env file!")
            return

        cur = db.cursor()
        cur.execute("SELECT password_hash, force_change FROM admin_auth WHERE id = 1")
        row = cur.fetchone()
        cur.close()

        if lu is None and row and row[1]:
            cur = db.cursor()
            cur.execute(
                "UPDATE admin_auth SET password_hash = %s, force_change = FALSE, updated_at = NOW() WHERE id = 1",
                (new_hash,),
            )
            db.commit()
            cur.close()
            logger.info("Migrated ADMIN_PASSWORD from .env to admin_auth (no local_users admin yet)")
            return

        if lu is None and not row:
            cur = db.cursor()
            cur.execute(
                "INSERT INTO admin_auth (id, password_hash, force_change) VALUES (1, %s, FALSE)",
                (new_hash,),
            )
            db.commit()
            cur.close()
            logger.info("Created admin_auth from .env ADMIN_PASSWORD")
            return

        logger.info("Admin password already set in DB — ignoring .env ADMIN_PASSWORD")
    except Exception as e:
        logger.error(f"Error during admin password migration: {e}")
    finally:
        pool.putconn(db)
