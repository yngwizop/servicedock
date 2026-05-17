"""
LDAP/Active Directory Authentication Module
Handles LDAP bind, user search, and group membership verification
"""
import os
import ssl
import time
from typing import Optional, Dict, Any

from ldap3 import Server, Connection, ALL, SUBTREE, Tls
from ldap3.utils.conv import escape_filter_chars

from config.settings import ENVIRONMENT
from core.logging import logger
from core.security import decrypt_value
import config.database as database_module

# Cache für LDAP-Config (vermeidet DB-Query bei jedem Login)
_ldap_config_cache: Optional[Dict[str, Any]] = None
_ldap_config_cache_time: float = 0
CACHE_TTL_SECONDS = 60


def get_ldap_config(db=None) -> Optional[Dict[str, Any]]:
    """
    Liest LDAP-Config aus DB mit 60s Cache.
    Returns None wenn nicht konfiguriert oder disabled.
    """
    global _ldap_config_cache, _ldap_config_cache_time
    
    now = time.time()
    if _ldap_config_cache is not None and (now - _ldap_config_cache_time) < CACHE_TTL_SECONDS:
        return _ldap_config_cache
    
    close_db = False
    if db is None:
        pool = database_module.db_pool
        if pool is None:
            logger.error("DB pool not initialized for LDAP config")
            return None
        db = pool.getconn()
        close_db = True
    
    try:
        cursor = db.cursor()
        cursor.execute("""
            SELECT enabled, host, port, use_ssl, use_starttls, base_dn, 
                   user_search_base, bind_dn, bind_password, user_attribute,
                   domain, admin_group_dn, viewer_group_dn
            FROM ldap_config WHERE id = 1
        """)
        row = cursor.fetchone()
        cursor.close()
        
        if not row:
            _ldap_config_cache = None
            _ldap_config_cache_time = now
            return None
        
        config = {
            "enabled": row[0],
            "host": row[1],
            "port": row[2],
            "use_ssl": row[3],
            "use_starttls": row[4],
            "base_dn": row[5],
            "user_search_base": row[6],
            "bind_dn": row[7],
            "bind_password": row[8],  # Noch verschlüsselt
            "user_attribute": row[9] or "sAMAccountName",
            "domain": row[10],
            "admin_group_dn": row[11],
            "viewer_group_dn": row[12],
        }
        
        _ldap_config_cache = config
        _ldap_config_cache_time = now
        return config
    except Exception as e:
        logger.error(f"Fehler beim Laden der LDAP-Config: {e}")
        return None
    finally:
        if close_db and db:
            database_module.db_pool.putconn(db)


def invalidate_ldap_cache():
    """Cache invalidieren (nach Config-Änderung)"""
    global _ldap_config_cache, _ldap_config_cache_time
    _ldap_config_cache = None
    _ldap_config_cache_time = 0


def is_ldap_signin_enabled() -> bool:
    """
    True wenn in der DB LDAP/AD-Login aktiv ist.

    Immer direkt aus der DB (ohne den 60s-Config-Cache), damit Security-Gates
    z. B. für /api/users-Schreibzugriffe nicht auf veralteten enabled-Werten basieren.
    """
    pool = database_module.db_pool
    if pool is None:
        return False
    db = pool.getconn()
    try:
        cursor = db.cursor()
        cursor.execute("SELECT enabled FROM ldap_config WHERE id = 1")
        row = cursor.fetchone()
        cursor.close()
        if not row:
            return False
        return bool(row[0])
    except Exception as e:
        logger.error("is_ldap_signin_enabled: %s", e)
        return False
    finally:
        pool.putconn(db)


def _ldap_tls_config() -> Optional[Tls]:
    """
    TLS für LDAPS/StartTLS.
    Production: CERT_REQUIRED unless LDAP_TLS_INSECURE=true (homelab).
    Optional LDAP_CA_FILE für eigene CA.
    """
    insecure = os.getenv("LDAP_TLS_INSECURE", "").lower() == "true"
    if ENVIRONMENT == "production" and insecure:
        logger.warning(
            "LDAP_TLS_INSECURE=true in production — LDAP traffic is vulnerable to MITM"
        )
    ca_file = os.getenv("LDAP_CA_FILE", "").strip()
    if insecure:
        return Tls(validate=ssl.CERT_NONE)
    if ca_file:
        return Tls(validate=ssl.CERT_REQUIRED, ca_certs_file=ca_file)
    return Tls(validate=ssl.CERT_REQUIRED)


def _create_server(config: Dict[str, Any]) -> Server:
    """Erstellt einen ldap3 Server mit optionalem SSL/TLS"""
    tls_config = None
    if config["use_ssl"] or config["use_starttls"]:
        tls_config = _ldap_tls_config()

    return Server(
        config["host"],
        port=config["port"],
        use_ssl=config["use_ssl"],
        tls=tls_config,
        get_info=ALL,
        connect_timeout=5
    )


def ldap_authenticate(username: str, password: str) -> Optional[Dict[str, Any]]:
    """
    Authentifiziert einen User gegen AD via LDAP.
    
    Flow:
    1. Bind als Service-Account (oder anonymous)
    2. Suche User nach sAMAccountName
    3. Re-Bind mit User-Credentials
    4. Prüfe Gruppenmitgliedschaft
    
    Returns:
        Dict mit {username, display_name, email, role} oder None bei Fehler
    """
    config = get_ldap_config()
    if not config or not config["enabled"]:
        return None
    
    # Domain-Suffix abschneiden falls User "user@domain" eingibt
    if "@" in username:
        username = username.split("@")[0]
    
    try:
        server = _create_server(config)
        
        # --- Schritt 1: Service-Account Bind für User-Suche ---
        bind_dn = config.get("bind_dn")
        bind_password = None
        if config.get("bind_password"):
            bind_password = decrypt_value(config["bind_password"])
        
        if bind_dn and bind_password:
            search_conn = Connection(server, user=bind_dn, password=bind_password, auto_bind=True)
        else:
            # Anonymous Bind (falls erlaubt)
            search_conn = Connection(server, auto_bind=True)
        
        # --- Schritt 2: User suchen ---
        user_search_base = config.get("user_search_base")
        base_dn = config["base_dn"]
        
        # Wenn user_search_base relativ ist (z.B. "CN=Users"), mit base_dn kombinieren
        if user_search_base:
            if base_dn.upper() not in user_search_base.upper():
                search_base = f"{user_search_base},{base_dn}"
            else:
                search_base = user_search_base
        else:
            search_base = base_dn
        user_attr = config.get("user_attribute", "sAMAccountName")
        safe_username = escape_filter_chars(username)
        search_filter = f"({user_attr}={safe_username})"
        
        search_conn.search(
            search_base=search_base,
            search_filter=search_filter,
            search_scope=SUBTREE,
            attributes=[user_attr, "cn", "displayName", "mail", "memberOf", "distinguishedName"]
        )
        
        if not search_conn.entries:
            logger.info(f"LDAP: User '{username}' nicht gefunden")
            search_conn.unbind()
            return None
        
        user_entry = search_conn.entries[0]
        user_dn = str(user_entry.entry_dn)
        display_name = str(user_entry.displayName) if user_entry.displayName else str(user_entry.cn)
        email = str(user_entry.mail) if user_entry.mail else None
        member_of = [str(g) for g in user_entry.memberOf] if user_entry.memberOf else []
        
        search_conn.unbind()
        
        # --- Schritt 3: User-Bind (Passwort prüfen) ---
        # Bevorzugt UPN-Bind (user@domain), Fallback auf DN-Bind
        domain = config.get("domain")
        if domain:
            user_bind_dn = f"{username}@{domain}"
        else:
            user_bind_dn = user_dn
        
        try:
            user_conn = Connection(server, user=user_bind_dn, password=password, auto_bind=True)
            user_conn.unbind()
        except Exception as e:
            logger.info(f"LDAP: Bind fehlgeschlagen für '{username}': {e}")
            return None
        
        # --- Schritt 4: Gruppen-Check ---
        role = _determine_role(config, member_of)
        if not role:
            logger.info(f"LDAP: User '{username}' ist in keiner Servicedock-Gruppe")
            return None
        
        logger.info(f"LDAP: User '{username}' authentifiziert als '{role}'")
        return {
            "username": username,
            "display_name": display_name,
            "email": email,
            "role": role,
        }
        
    except Exception as e:
        logger.error(f"LDAP Authentifizierung fehlgeschlagen: {e}")
        return None


def _determine_role(config: Dict[str, Any], member_of: list) -> Optional[str]:
    """
    Bestimmt die Rolle basierend auf Gruppenmitgliedschaft.
    Admin-Gruppe hat Vorrang vor Viewer-Gruppe.
    """
    admin_group = config.get("admin_group_dn", "").lower()
    viewer_group = config.get("viewer_group_dn", "").lower()
    
    member_of_lower = [g.lower() for g in member_of]
    
    if admin_group and admin_group in member_of_lower:
        return "admin"
    
    if viewer_group and viewer_group in member_of_lower:
        return "viewer"
    
    return None


def test_ldap_connection(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Testet die LDAP-Verbindung mit den gegebenen Einstellungen.
    Returns Dict mit success, message, und optionalen Details.
    """
    try:
        # Server erstellen
        tls_config = None
        if config.get("use_ssl") or config.get("use_starttls"):
            tls_config = _ldap_tls_config()

        server = Server(
            config["host"],
            port=config.get("port", 389),
            use_ssl=config.get("use_ssl", False),
            tls=tls_config,
            get_info=ALL,
            connect_timeout=5
        )
        
        # Bind testen
        bind_dn = config.get("bind_dn")
        bind_password = config.get("bind_password")
        
        if bind_dn and bind_password:
            conn = Connection(server, user=bind_dn, password=bind_password, auto_bind=True)
        else:
            conn = Connection(server, auto_bind=True)
        
        # Base DN prüfen
        base_dn = config.get("base_dn", "")
        search_base = config.get("user_search_base") or base_dn
        conn.search(
            search_base=search_base,
            search_filter="(objectClass=person)",
            search_scope=SUBTREE,
            attributes=["cn"],
            size_limit=5
        )
        user_count = len(conn.entries)
        
        # Gruppen prüfen
        groups_found = []
        for group_key in ["admin_group_dn", "viewer_group_dn"]:
            group_dn = config.get(group_key)
            if group_dn:
                safe_group_dn = escape_filter_chars(group_dn)
                conn.search(
                    search_base=base_dn,
                    search_filter=f"(distinguishedName={safe_group_dn})",
                    search_scope=SUBTREE,
                    attributes=["cn", "member"]
                )
                if conn.entries:
                    members = conn.entries[0].member if conn.entries[0].member else []
                    groups_found.append({
                        "dn": group_dn,
                        "name": str(conn.entries[0].cn),
                        "members": len(members)
                    })
        
        server_info = str(server.info.other.get("dnsHostName", ["Unknown"])[0]) if server.info and server.info.other else "Unknown"
        conn.unbind()
        
        return {
            "success": True,
            "message": "LDAP-Verbindung erfolgreich",
            "server": server_info,
            "users_found": user_count,
            "groups": groups_found,
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"LDAP-Verbindung fehlgeschlagen: {str(e)}",
        }
