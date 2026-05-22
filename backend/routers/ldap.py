"""
LDAP/Active Directory Configuration Router
CRUD for LDAP settings + connection test
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from starlette.concurrency import run_in_threadpool

from models.ldap import (
    LdapConfigRequest,
    LdapConfigResponse,
    LdapTestRequest,
    LdapTestResponse
)
from core.security import encrypt_value, decrypt_value
from core.logging import logger
from core.audit import log_audit
from core.limiter import limiter
from core.ldap_auth import test_ldap_connection, invalidate_ldap_cache
from dependencies.auth import require_role, get_client_ip
from config.database import get_db

router = APIRouter()


@router.get("/api/ldap/config", response_model=LdapConfigResponse)
async def get_ldap_config(
    request: Request,
    token: dict = Depends(require_role("admin")),
    db=Depends(get_db)
):
    """Liest aktuelle LDAP-Konfiguration (ohne Bind-Passwort)"""
    def _query():
        cursor = db.cursor()
        cursor.execute("""
            SELECT enabled, host, port, use_ssl, use_starttls, base_dn,
                   user_search_base, bind_dn, bind_password, user_attribute,
                   domain, admin_group_dn, viewer_group_dn, updated_at
            FROM ldap_config WHERE id = 1
        """)
        row = cursor.fetchone()
        cursor.close()
        return row
    
    row = await run_in_threadpool(_query)
    
    if not row:
        return LdapConfigResponse()
    
    return LdapConfigResponse(
        enabled=row[0],
        host=row[1],
        port=row[2],
        use_ssl=row[3],
        use_starttls=row[4],
        base_dn=row[5],
        user_search_base=row[6],
        bind_dn=row[7],
        has_bind_password=bool(row[8]),
        user_attribute=row[9] or "sAMAccountName",
        domain=row[10],
        admin_group_dn=row[11],
        viewer_group_dn=row[12],
        updated_at=row[13],
    )


@router.put("/api/ldap/config", response_model=LdapConfigResponse)
@limiter.limit("10/minute")
async def save_ldap_config(
    request: Request,
    config: LdapConfigRequest,
    token: dict = Depends(require_role("admin")),
    db=Depends(get_db)
):
    """Speichert LDAP-Konfiguration"""
    client_ip = get_client_ip(request)
    
    # Bind-Passwort verschlüsseln
    encrypted_password = None
    if config.bind_password:
        encrypted_password = encrypt_value(config.bind_password)
    
    def _upsert():
        cursor = db.cursor()
        # Prüfe ob Config existiert
        cursor.execute("SELECT bind_password FROM ldap_config WHERE id = 1")
        existing = cursor.fetchone()
        
        # Wenn kein neues Passwort gesendet, behalte das alte
        final_password = encrypted_password
        if not config.bind_password and existing:
            final_password = existing[0]
        
        if existing:
            cursor.execute("""
                UPDATE ldap_config SET
                    enabled = %s, host = %s, port = %s, use_ssl = %s, use_starttls = %s,
                    base_dn = %s, user_search_base = %s, bind_dn = %s, bind_password = %s,
                    user_attribute = %s, domain = %s, admin_group_dn = %s, viewer_group_dn = %s,
                    updated_at = NOW()
                WHERE id = 1
            """, (
                config.enabled, config.host, config.port, config.use_ssl, config.use_starttls,
                config.base_dn, config.user_search_base, config.bind_dn, final_password,
                config.user_attribute, config.domain, config.admin_group_dn, config.viewer_group_dn
            ))
        else:
            cursor.execute("""
                INSERT INTO ldap_config (id, enabled, host, port, use_ssl, use_starttls,
                    base_dn, user_search_base, bind_dn, bind_password, user_attribute,
                    domain, admin_group_dn, viewer_group_dn)
                VALUES (1, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                config.enabled, config.host, config.port, config.use_ssl, config.use_starttls,
                config.base_dn, config.user_search_base, config.bind_dn, final_password,
                config.user_attribute, config.domain, config.admin_group_dn, config.viewer_group_dn
            ))
        
        db.commit()
        cursor.close()
        return final_password
    
    final_password = await run_in_threadpool(_upsert)

    def _fetch_updated_at():
        c = db.cursor()
        c.execute("SELECT updated_at FROM ldap_config WHERE id = 1")
        r = c.fetchone()
        c.close()
        return r[0] if r else None

    ldap_updated_at = await run_in_threadpool(_fetch_updated_at)
    
    # Cache invalidieren
    invalidate_ldap_cache()
    
    log_audit(
        action="LDAP_CONFIG_SAVED",
        status="success",
        user_type="admin",
        ip_address=client_ip,
        details={"host": config.host, "enabled": config.enabled}
    )
    
    logger.info(f"LDAP config saved: {config.host} (enabled={config.enabled})")
    
    return LdapConfigResponse(
        enabled=config.enabled,
        host=config.host,
        port=config.port,
        use_ssl=config.use_ssl,
        use_starttls=config.use_starttls,
        base_dn=config.base_dn,
        user_search_base=config.user_search_base,
        bind_dn=config.bind_dn,
        has_bind_password=bool(final_password),
        user_attribute=config.user_attribute,
        domain=config.domain,
        admin_group_dn=config.admin_group_dn,
        viewer_group_dn=config.viewer_group_dn,
        updated_at=ldap_updated_at,
    )


@router.post("/api/ldap/test", response_model=LdapTestResponse)
@limiter.limit("5/minute")
async def test_ldap(
    request: Request,
    test_config: LdapTestRequest,
    token: dict = Depends(require_role("admin")),
):
    """Testet LDAP-Verbindung mit den angegebenen Einstellungen"""
    client_ip = get_client_ip(request)
    
    # Wenn kein Passwort im Test-Request, versuche gespeichertes zu verwenden
    config_dict = test_config.dict()
    if not config_dict.get("bind_password"):
        from core.ldap_auth import get_ldap_config
        saved_config = get_ldap_config()
        if saved_config and saved_config.get("bind_password"):
            config_dict["bind_password"] = decrypt_value(saved_config["bind_password"])
    
    result = await run_in_threadpool(test_ldap_connection, config_dict)
    
    log_audit(
        action="LDAP_CONNECTION_TEST",
        status="success" if result["success"] else "failed",
        user_type="admin",
        ip_address=client_ip,
        details={"host": test_config.host, "result": result["message"]}
    )
    
    return LdapTestResponse(**result)


@router.delete("/api/ldap/config")
@limiter.limit("5/minute")
async def delete_ldap_config(
    request: Request,
    token: dict = Depends(require_role("admin")),
    db=Depends(get_db)
):
    """Löscht LDAP-Konfiguration (Deinstallation)"""
    client_ip = get_client_ip(request)
    
    def _delete():
        cursor = db.cursor()
        cursor.execute("DELETE FROM ldap_config WHERE id = 1")
        db.commit()
        cursor.close()
    
    await run_in_threadpool(_delete)
    
    # Cache invalidieren
    invalidate_ldap_cache()
    
    log_audit(
        action="LDAP_CONFIG_DELETED",
        status="success",
        user_type="admin",
        ip_address=client_ip,
        details={"reason": "uninstall"}
    )
    
    logger.info("LDAP config removed (uninstalled)")
    
    return {"message": "LDAP configuration removed"}
