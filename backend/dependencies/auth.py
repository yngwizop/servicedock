"""Authentication dependencies and helpers"""
import ipaddress
import os
from typing import Optional
from fastapi import HTTPException, Depends, Request, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from config.settings import SECRET_KEY, ALGORITHM
from core.security import get_password_hash, verify_password
from core.logging import logger
from core.audit import log_audit
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


def _proxy_is_trusted(proxy_ip: str) -> bool:
    """Exact match or CIDR (e.g. 172.16.0.0/12 for Docker bridge)."""
    if not proxy_ip or not TRUSTED_PROXIES:
        return False
    if proxy_ip in TRUSTED_PROXIES:
        return True
    try:
        addr = ipaddress.ip_address(proxy_ip)
    except ValueError:
        return False
    for entry in TRUSTED_PROXIES:
        if "/" not in entry:
            continue
        try:
            if addr in ipaddress.ip_network(entry, strict=False):
                return True
        except ValueError:
            continue
    return False


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


_FORCE_CHANGE_ALLOWED_PATHS = frozenset({
    "/api/auth/me",
    "/api/auth/password",
})


def _enforce_password_changed(payload: dict, request: Optional[Request] = None) -> None:
    """
    Block API access for local users with force_change=TRUE until password is updated.
    AD/LDAP users are exempt.
    """
    if request is not None and request.url.path in _FORCE_CHANGE_ALLOWED_PATHS:
        return
    if (payload.get("auth_method") or "local") == "ad":
        return
    username = payload.get("sub")
    if not username:
        return
    if not get_force_change_for_username(username):
        return
    ip = get_client_ip(request) if request is not None else "unknown"
    log_audit(
        action="FORCE_CHANGE_BYPASS_ATTEMPT",
        status="denied",
        user_type=payload.get("type", "unknown"),
        ip_address=ip,
        details={"username": username},
    )
    raise HTTPException(
        status_code=403,
        detail="Password change required before accessing this resource.",
    )


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
        request: Request,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
        access_token: Optional[str] = Cookie(None),
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

            _enforce_password_changed(payload, request)
            
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
        request: Request,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
        access_token: Optional[str] = Cookie(None),
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

            _enforce_password_changed(payload, request)
            
            return payload
            
        except JWTError:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication credentials"
            )
    
    return role_checker


def require_help_docs_access(
    request: Request,
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

        _enforce_password_changed(payload, request)
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
        if not TRUSTED_PROXIES:
            logger.warning(
                "TRUST_FORWARDED_HEADERS=true but TRUSTED_PROXIES is empty — "
                "ignoring X-Forwarded-For; using direct client IP"
            )
        else:
            forwarded = request.headers.get("X-Forwarded-For")
            if forwarded:
                client_ip = forwarded.split(",")[0].strip()
                if request.client:
                    proxy_ip = request.client.host
                    if not _proxy_is_trusted(proxy_ip):
                        logger.warning(
                            "Untrusted proxy %s sent X-Forwarded-For: %s",
                            proxy_ip,
                            client_ip,
                        )
                        return proxy_ip
                return client_ip
    
    # Fallback: Direkte Client-IP (ohne Proxy)
    if request.client:
        return request.client.host
    
    return "unknown"
