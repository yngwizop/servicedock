"""Integration health endpoints (Proxmox / Spotify / LDAP)."""
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, Request

import config.database
from core.limiter import limiter
from core.ldap_auth import test_ldap_connection
from core.logging import logger
from core.security import decrypt_value
from dependencies.auth import require_any_role
from routers.proxmox import get_proxmox_connection
from routers.spotify import get_valid_access_token, get_spotify_config

router = APIRouter()


def _status_payload(name: str, status: str, configured: bool, detail: str) -> Dict[str, Any]:
    return {
        "name": name,
        "status": status,
        "configured": configured,
        "detail": detail,
    }


def _check_proxmox(dashboard_id: int) -> Dict[str, Any]:
    conn = None
    cur = None
    try:
        conn = config.database.db_pool.getconn()
        cur = conn.cursor()
        cur.execute(
            "SELECT host FROM proxmox_config WHERE dashboard_id = %s;",
            (dashboard_id,),
        )
        row = cur.fetchone()
        if not row:
            return _status_payload("proxmox", "not_configured", False, "Not configured for this dashboard")

        proxmox, _node, is_cluster = get_proxmox_connection(dashboard_id)
        if not proxmox:
            return _status_payload("proxmox", "down", True, "Connection failed (token or host invalid)")

        try:
            proxmox.version.get()
            try:
                nodes = proxmox.nodes.get() or []
            except Exception:
                nodes = []
            if nodes:
                names = [n.get("node", "?") for n in nodes if isinstance(n, dict)]
                if is_cluster or len(names) > 1:
                    preview = ", ".join(names[:3])
                    if len(names) > 3:
                        preview += ", ..."
                    return _status_payload(
                        "proxmox",
                        "ok",
                        True,
                        f"Cluster connected ({len(names)} nodes: {preview})",
                    )
                return _status_payload("proxmox", "ok", True, f"Node connected ({names[0]})")
            return _status_payload("proxmox", "ok", True, f"Connected ({row[0]})")
        except Exception:
            return _status_payload("proxmox", "down", True, "Configured but API not reachable")
    except Exception as exc:
        logger.error(f"Proxmox health check failed: {exc}")
        return _status_payload("proxmox", "down", True, "Health check failed")
    finally:
        if cur is not None:
            cur.close()
        if conn is not None:
            config.database.db_pool.putconn(conn)


def _get_show_spotify_widget() -> bool:
    """Whether the Spotify header widget is enabled in appearance (default True)."""
    conn = None
    cur = None
    try:
        conn = config.database.db_pool.getconn()
        cur = conn.cursor()
        cur.execute("SELECT show_spotify FROM appearance WHERE id = 1;")
        row = cur.fetchone()
        if row is None or row[0] is None:
            return True
        return bool(row[0])
    except Exception as exc:
        logger.warning(f"Could not read show_spotify for health: {exc}")
        return True
    finally:
        if cur is not None:
            cur.close()
        if conn is not None:
            config.database.db_pool.putconn(conn)


def _check_spotify() -> Dict[str, Any]:
    try:
        cfg = get_spotify_config()
        if not cfg:
            return _status_payload("spotify", "not_configured", False, "Not configured")
        if not cfg.get("connected"):
            return _status_payload("spotify", "warning", True, "Configured but account not connected")

        token = get_valid_access_token()
        if token:
            return _status_payload("spotify", "ok", True, "Connected and token valid")
        return _status_payload("spotify", "down", True, "Connected but token refresh failed")
    except Exception as exc:
        logger.error(f"Spotify health check failed: {exc}")
        return _status_payload("spotify", "down", True, "Health check failed")


def _check_spotify_for_health() -> Dict[str, Any]:
    """Spotify integration check, respecting widget visibility (green + disabled when hidden)."""
    base = _check_spotify()
    if not _get_show_spotify_widget():
        return {
            **base,
            "status": "disabled",
            "detail": "Spotify widget hidden in appearance settings",
        }
    return base


def _check_ldap() -> Dict[str, Any]:
    conn = None
    cur = None
    try:
        conn = config.database.db_pool.getconn()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT enabled, host, port, use_ssl, use_starttls, base_dn,
                   user_search_base, bind_dn, bind_password, user_attribute,
                   domain, admin_group_dn, viewer_group_dn
            FROM ldap_config WHERE id = 1;
            """
        )
        row = cur.fetchone()
        if not row:
            return _status_payload("ldap", "not_configured", False, "Not configured")
        if not row[0]:
            return _status_payload("ldap", "warning", True, "Configured but disabled")

        cfg = {
            "enabled": row[0],
            "host": row[1],
            "port": row[2],
            "use_ssl": row[3],
            "use_starttls": row[4],
            "base_dn": row[5],
            "user_search_base": row[6],
            "bind_dn": row[7],
            "bind_password": decrypt_value(row[8]) if row[8] else "",
            "user_attribute": row[9] or "sAMAccountName",
            "domain": row[10],
            "admin_group_dn": row[11],
            "viewer_group_dn": row[12],
        }
        result = test_ldap_connection(cfg)
        if result.get("success"):
            return _status_payload("ldap", "ok", True, "LDAP bind test successful")
        return _status_payload("ldap", "down", True, result.get("message") or "LDAP connection failed")
    except Exception as exc:
        logger.error(f"LDAP health check failed: {exc}")
        return _status_payload("ldap", "down", True, "Health check failed")
    finally:
        if cur is not None:
            cur.close()
        if conn is not None:
            config.database.db_pool.putconn(conn)


@router.get("/api/integrations/health")
@limiter.limit("30/minute")
def get_integrations_health(
    request: Request,
    dashboard_id: int = 1,
    _token: dict = Depends(require_any_role("admin", "viewer")),
):
    checks = [
        _check_proxmox(dashboard_id),
        _check_spotify_for_health(),
        _check_ldap(),
    ]
    severity = {"ok": 0, "disabled": 0, "warning": 1, "not_configured": 1, "down": 2}
    overall = max(checks, key=lambda c: severity.get(c["status"], 2))["status"]
    return {
        "overall_status": overall,
        "dashboard_id": dashboard_id,
        "checks": checks,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
