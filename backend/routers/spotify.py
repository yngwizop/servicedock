"""
Spotify AddOn Router
OAuth2 Flow, Token Management, Now Playing API
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import HTMLResponse
from datetime import datetime, timedelta, timezone
from typing import Optional
import secrets
import requests
import threading
from urllib.parse import urlencode

import config.database
from models.spotify import (
    SpotifyInstallRequest,
    SpotifyAuthCallbackRequest,
    SpotifyConfigResponse,
    SpotifyAuthUrlResponse,
    SpotifyNowPlayingResponse,
    SpotifyTrack,
    SpotifyPlaybackControlResponse,
    SpotifyErrorResponse
)
from core.security import encrypt_value, decrypt_value
from core.logging import logger
from core.audit import log_audit
from core.limiter import limiter
from core.oauth_state_store import put_state, pop_state
from core.spotify_oauth_i18n import normalize_locale, render_spotify_callback_success_html
from dependencies.auth import require_role, get_client_ip
from config.database import get_db

router = APIRouter()

# Spotify API Endpoints
SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1"

# Required Scopes for Now Playing + Playback Control
SPOTIFY_SCOPES = [
    "user-read-currently-playing",
    "user-read-playback-state",
    "user-modify-playback-state"
]

# OAuth state is stored in Redis (or in-memory fallback) via core.oauth_state_store

# ✅ Thread Lock für Token Refresh (verhindert Race Conditions)
_spotify_refresh_lock = threading.Lock()


def get_spotify_config():
    """
    Holt Spotify-Konfiguration aus DB und entschlüsselt Secrets.
    Returns: dict mit config oder None
    """
    if config.database.db_pool is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    conn = None
    try:
        conn = config.database.db_pool.getconn()
        cur = conn.cursor()
        cur.execute("""
            SELECT client_id, client_secret, redirect_uri, access_token, 
                   refresh_token, token_expires_at, scope, connected
            FROM spotify_config WHERE id = 1;
        """)
        row = cur.fetchone()
        cur.close()
        
        if not row:
            return None
        
        client_id, client_secret_enc, redirect_uri, access_token_enc, \
        refresh_token_enc, token_expires_at, scope, connected = row
        
        # Entschlüsseln
        client_secret = decrypt_value(client_secret_enc) if client_secret_enc else None
        access_token = decrypt_value(access_token_enc) if access_token_enc else None
        refresh_token = decrypt_value(refresh_token_enc) if refresh_token_enc else None
        
        return {
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_expires_at": token_expires_at,
            "scope": scope,
            "connected": connected
        }
    finally:
        if conn is not None:
            config.database.db_pool.putconn(conn)


def refresh_access_token(spotify_config: dict) -> Optional[str]:
    """
    Erneuert Access Token mit Refresh Token.
    Thread-safe mit Lock gegen Race Conditions.
    Returns: Neuer Access Token oder None
    """
    with _spotify_refresh_lock:  # ✅ Thread-safe
        if not spotify_config.get("refresh_token"):
            return None
        
        # ✅ Double-checked Locking: Re-check ob Token noch gültig
        # (anderer Thread könnte bereits refreshed haben)
        current_config = get_spotify_config()
        if current_config and current_config["token_expires_at"]:
            expires_at = current_config["token_expires_at"]
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) + timedelta(minutes=5) < expires_at:
                logger.info("Token already refreshed by another thread")
                return current_config["access_token"]
        
        try:
            response = requests.post(
                SPOTIFY_TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": spotify_config["refresh_token"]
                },
                auth=(spotify_config["client_id"], spotify_config["client_secret"]),
                timeout=10
            )
            
            if response.status_code != 200:
                logger.error(f"Spotify token refresh failed: {response.status_code}")
                return None
            
            data = response.json()
            new_access_token = data.get("access_token")
            expires_in = data.get("expires_in", 3600)
            
            # Token in DB aktualisieren
            if new_access_token:
                conn = None
                cur = None
                try:
                    conn = config.database.db_pool.getconn()
                    cur = conn.cursor()
                    
                    encrypted_token = encrypt_value(new_access_token)
                    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
                    
                    cur.execute("""
                        UPDATE spotify_config 
                        SET access_token = %s, token_expires_at = %s, updated_at = NOW()
                        WHERE id = 1;
                    """, (encrypted_token, expires_at))
                    
                    conn.commit()
                    cur.close()
                    cur = None
                    
                    logger.info("Spotify access token refreshed successfully")
                    return new_access_token
                finally:
                    if cur is not None:
                        try:
                            cur.close()
                        except:
                            pass
                    if conn is not None:
                        config.database.db_pool.putconn(conn)
            
            return None
        except Exception as e:
            logger.error(f"Error refreshing Spotify token: {str(e)}")
            return None


def get_valid_access_token() -> Optional[str]:
    """
    Holt gültigen Access Token (refresht automatisch wenn nötig).
    Returns: Access Token oder None
    """
    spotify_config = get_spotify_config()
    
    if not spotify_config or not spotify_config["connected"]:
        return None
    
    # Check ob Token noch gültig ist
    if spotify_config["token_expires_at"]:
        # Token 5 Minuten vor Ablauf erneuern
        expires_soon = datetime.now(timezone.utc) + timedelta(minutes=5)
        token_expires = spotify_config["token_expires_at"]
        if token_expires.tzinfo is None:
            token_expires = token_expires.replace(tzinfo=timezone.utc)
        if token_expires <= expires_soon:
            logger.info("Spotify token expires soon, refreshing...")
            return refresh_access_token(spotify_config)
    
    return spotify_config["access_token"]


# ========================
# API Endpoints
# ========================

@router.post("/api/spotify/install")
@limiter.limit("5/hour")  # Strict limit for install operations
async def install_spotify(
    request: Request,
    payload: SpotifyInstallRequest,
    token: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """
    Admin installiert Spotify AddOn mit Client Credentials.
    Client Secret wird verschlüsselt gespeichert.
    """
    try:
        # Verschlüssele Client Secret
        encrypted_secret = encrypt_value(payload.client_secret)
        
        cur = db.cursor()
        
        # Check ob bereits konfiguriert
        cur.execute("SELECT id FROM spotify_config WHERE id = 1;")
        exists = cur.fetchone()
        
        if exists:
            # Update existierende Config
            cur.execute("""
                UPDATE spotify_config 
                SET client_id = %s, client_secret = %s, redirect_uri = %s, 
                    connected = FALSE, updated_at = NOW()
                WHERE id = 1;
            """, (payload.client_id, encrypted_secret, payload.redirect_uri))
        else:
            # Insert neue Config
            cur.execute("""
                INSERT INTO spotify_config (id, client_id, client_secret, redirect_uri, scope, connected)
                VALUES (1, %s, %s, %s, %s, FALSE);
            """, (payload.client_id, encrypted_secret, payload.redirect_uri, " ".join(SPOTIFY_SCOPES)))
        
        db.commit()
        cur.close()
        
        # Audit Log
        ip = get_client_ip(request)
        log_audit(
            user_type="admin",
            ip_address=ip,
            action="SPOTIFY_INSTALL",
            resource_type="addon",
            resource_id="spotify",
            status="success",
            details=f"Client ID: {payload.client_id[:10]}..."
        )
        
        logger.info(f"Spotify AddOn installed by admin from {ip}")
        
        return {
            "success": True,
            "message": "Spotify AddOn konfiguriert. Bitte verbinden Sie Ihr Spotify-Konto.",
            "configured": True
        }
    
    except Exception as e:
        logger.error(f"Error installing Spotify: {str(e)}")
        raise HTTPException(status_code=500, detail="Installation fehlgeschlagen")


@router.get("/api/spotify/status", response_model=SpotifyConfigResponse)
@limiter.limit("30/minute")
async def get_spotify_status(
    request: Request,
    token: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """
    Gibt Spotify Status zurück (ohne Secrets!).
    """
    cur = db.cursor()
    cur.execute("""
        SELECT client_id, redirect_uri, token_expires_at, connected, updated_at
        FROM spotify_config WHERE id = 1;
    """)
    row = cur.fetchone()
    cur.close()
    
    if not row:
        return SpotifyConfigResponse(
            configured=False,
            connected=False,
            client_id=None,
            redirect_uri=None,
            token_expires_at=None,
            updated_at=None,
        )
    
    client_id, redirect_uri, token_expires_at, connected, updated_at = row
    
    return SpotifyConfigResponse(
        configured=True,
        connected=connected,
        client_id=client_id,
        redirect_uri=redirect_uri,
        token_expires_at=token_expires_at,
        updated_at=updated_at,
    )


@router.get("/api/spotify/auth-url", response_model=SpotifyAuthUrlResponse)
@limiter.limit("10/minute")
async def get_auth_url(
    request: Request,
    locale: Optional[str] = None,
    token: dict = Depends(require_role("admin")),
):
    """
    Generiert Spotify Authorization URL für OAuth Flow.
    Admin wird auf diese URL weitergeleitet.
    """
    spotify_config = get_spotify_config()
    
    if not spotify_config:
        raise HTTPException(
            status_code=400,
            detail="Spotify nicht konfiguriert. Bitte zuerst installieren."
        )
    
    # Generate CSRF State Token
    state = secrets.token_urlsafe(32)

    lang = normalize_locale(locale or request.headers.get("accept-language"))
    # Speichere State mit redirect_uri + UI-Sprache für Callback-HTML (TTL 10 Minuten)
    put_state(
        "spotify",
        state,
        {"redirect_uri": spotify_config["redirect_uri"], "locale": lang},
        ttl_seconds=600,
    )
    logger.info(f"[SPOTIFY OAUTH] Auth-Request: redirect_uri={spotify_config['redirect_uri']}")
    
    # Build Authorization URL
    params = {
        "client_id": spotify_config["client_id"],
        "response_type": "code",
        "redirect_uri": spotify_config["redirect_uri"],
        "scope": " ".join(SPOTIFY_SCOPES),
        "state": state,
        "show_dialog": "false"
    }
    
    auth_url = f"{SPOTIFY_AUTH_URL}?{urlencode(params)}"
    
    logger.info(f"Generated Spotify auth URL for admin from {get_client_ip(request)}")
    
    return SpotifyAuthUrlResponse(auth_url=auth_url, state=state)


@router.get("/api/spotify/callback")
@limiter.limit("10/minute")
async def spotify_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None
):
    """
    OAuth Callback Endpoint.
    Spotify redirected hierher nach User Authorization.
    """
    # Error Handling
    if error:
        logger.warning(f"Spotify OAuth error: {error}")
        raise HTTPException(status_code=400, detail="Spotify Autorisierung fehlgeschlagen")
    
    if not code or not state:
        raise HTTPException(status_code=400, detail="Code oder State fehlt")
    
    # CSRF Protection: Verify State
    state_data = pop_state("spotify", state)
    if not state_data:
        raise HTTPException(status_code=400, detail="Ungültiger State Token (CSRF)")
    
    # Hole die beim Auth-Request verwendete redirect_uri
    used_redirect_uri = state_data["redirect_uri"] if isinstance(state_data, dict) else spotify_config["redirect_uri"]
    logger.info(f"[SPOTIFY OAUTH] Callback: used_redirect_uri={used_redirect_uri}")
    
    spotify_config = get_spotify_config()
    if not spotify_config:
        raise HTTPException(status_code=500, detail="Spotify Konfiguration nicht gefunden")
    
    # Exchange Code for Access Token
    try:
        response = requests.post(
            SPOTIFY_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": used_redirect_uri  # Verwende die GLEICHE URI wie beim Auth-Request!
            },
            auth=(spotify_config["client_id"], spotify_config["client_secret"]),
            timeout=10
        )
        
        if response.status_code != 200:
            logger.error(f"Spotify token exchange failed: {response.status_code}")
            raise HTTPException(
                status_code=400,
                detail="Token-Austausch fehlgeschlagen. Bitte erneut versuchen."
            )
        
        data = response.json()
        access_token = data.get("access_token")
        refresh_token = data.get("refresh_token")
        expires_in = data.get("expires_in", 3600)
        
        if not access_token or not refresh_token:
            raise HTTPException(status_code=400, detail="Keine Tokens erhalten")
        
        # Encrypt und speichere Tokens
        encrypted_access = encrypt_value(access_token)
        encrypted_refresh = encrypt_value(refresh_token)
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        
        conn = None
        try:
            conn = config.database.db_pool.getconn()
            cur = conn.cursor()
            
            cur.execute("""
                UPDATE spotify_config 
                SET access_token = %s, refresh_token = %s, token_expires_at = %s,
                    connected = TRUE, updated_at = NOW()
                WHERE id = 1;
            """, (encrypted_access, encrypted_refresh, expires_at))
            
            conn.commit()
            cur.close()
            
            # Audit Log
            ip = get_client_ip(request)
            log_audit(
                user_type="admin",
                ip_address=ip,
                action="SPOTIFY_CONNECT",
                resource_type="addon",
                resource_id="spotify",
                status="success",
                details="OAuth flow completed"
            )
            
            logger.info(f"Spotify successfully connected from {ip}")
            
            callback_locale = (
                state_data.get("locale") if isinstance(state_data, dict) else None
            )
            html_content = render_spotify_callback_success_html(callback_locale)
            return HTMLResponse(content=html_content, status_code=200)
        
        finally:
            if conn is not None:
                config.database.db_pool.putconn(conn)
    
    except requests.RequestException as e:
        logger.error(f"Spotify API request failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Verbindung zu Spotify fehlgeschlagen")
    except Exception as e:
        logger.error(f"Spotify callback error: {str(e)}")
        raise HTTPException(status_code=500, detail="Ein Fehler ist aufgetreten")


@router.get("/api/spotify/now-playing", response_model=SpotifyNowPlayingResponse)
@limiter.limit("30/minute")
async def get_now_playing(request: Request, _admin = Depends(require_role("admin"))):
    """
    Gibt aktuell abgespielten Song zurück.
    Nur für authentifizierte Benutzer.
    """
    access_token = get_valid_access_token()
    
    if not access_token:
        # Nicht konfiguriert oder nicht verbunden
        return SpotifyNowPlayingResponse(
            is_playing=False,
            track=None
        )
    
    try:
        response = requests.get(
            f"{SPOTIFY_API_BASE_URL}/me/player/currently-playing",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=5
        )
        
        # 204 = Nichts spielt gerade
        if response.status_code == 204:
            return SpotifyNowPlayingResponse(is_playing=False, track=None)
        
        # 401 = Token ungültig
        if response.status_code == 401:
            logger.warning("Spotify token invalid, attempting refresh...")
            spotify_config = get_spotify_config()
            new_token = refresh_access_token(spotify_config)
            if new_token:
                # Retry mit neuem Token
                response = requests.get(
                    f"{SPOTIFY_API_BASE_URL}/me/player/currently-playing",
                    headers={"Authorization": f"Bearer {new_token}"},
                    timeout=5
                )
        
        if response.status_code != 200:
            logger.error(f"Spotify API error: {response.status_code}")
            return SpotifyNowPlayingResponse(is_playing=False, track=None)
        
        data = response.json()
        
        if not data or not data.get("item"):
            return SpotifyNowPlayingResponse(is_playing=False, track=None)
        
        item = data["item"]
        is_playing = data.get("is_playing", False)
        progress_ms = data.get("progress_ms", 0)
        
        # Build Track Info
        track = SpotifyTrack(
            name=item.get("name", "Unknown"),
            artist=item["artists"][0]["name"] if item.get("artists") else "Unknown",
            artists=[artist["name"] for artist in item.get("artists", [])],
            album=item.get("album", {}).get("name", "Unknown"),
            album_image=item.get("album", {}).get("images", [{}])[0].get("url") if item.get("album", {}).get("images") else None,
            duration_ms=item.get("duration_ms", 0),
            progress_ms=progress_ms,
            uri=item.get("uri", ""),
            external_url=item.get("external_urls", {}).get("spotify")
        )
        
        progress_percent = (progress_ms / item.get("duration_ms", 1)) * 100 if item.get("duration_ms") else 0
        
        return SpotifyNowPlayingResponse(
            is_playing=is_playing,
            track=track,
            device_name=data.get("device", {}).get("name"),
            shuffle_state=data.get("shuffle_state", False),
            repeat_state=data.get("repeat_state", "off"),
            progress_percent=round(progress_percent, 2)
        )
    
    except requests.RequestException as e:
        logger.error(f"Spotify API request failed: {str(e)}")
        return SpotifyNowPlayingResponse(is_playing=False, track=None)
    except Exception as e:
        logger.error(f"Error fetching now playing: {str(e)}")
        return SpotifyNowPlayingResponse(is_playing=False, track=None)


@router.delete("/api/spotify/uninstall")
@limiter.limit("5/minute")
async def uninstall_spotify(
    request: Request,
    token: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """
    Entfernt Spotify AddOn komplett (löscht Config und Tokens).
    """
    try:
        cur = db.cursor()
        cur.execute("DELETE FROM spotify_config WHERE id = 1;")
        db.commit()
        cur.close()
        
        # Audit Log
        ip = get_client_ip(request)
        log_audit(
            user_type="admin",
            ip_address=ip,
            action="SPOTIFY_UNINSTALL",
            resource_type="addon",
            resource_id="spotify",
            status="success"
        )
        
        logger.info(f"Spotify AddOn uninstalled by admin from {ip}")
        
        return {
            "success": True,
            "message": "Spotify AddOn erfolgreich entfernt"
        }
    
    except Exception as e:
        logger.error(f"Error uninstalling Spotify: {str(e)}")
        raise HTTPException(status_code=500, detail="Deinstallation fehlgeschlagen")
