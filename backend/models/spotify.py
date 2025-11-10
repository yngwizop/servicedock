"""
Spotify Integration Models
Models für Spotify OAuth, Configuration und Now Playing Data
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ========================
# Request Models (Input)
# ========================

class SpotifyInstallRequest(BaseModel):
    """Admin installiert Spotify AddOn mit Client Credentials"""
    client_id: str = Field(..., min_length=1, description="Spotify Client ID")
    client_secret: str = Field(..., min_length=1, description="Spotify Client Secret")
    redirect_uri: str = Field(..., min_length=1, description="OAuth Redirect URI")


class SpotifyAuthCallbackRequest(BaseModel):
    """Callback nach OAuth Authorization"""
    code: str = Field(..., description="Authorization Code von Spotify")
    state: Optional[str] = Field(None, description="State für CSRF Protection")


# ========================
# Response Models (Output)
# ========================

class SpotifyConfigResponse(BaseModel):
    """Spotify Konfigurationsstatus (ohne Secrets!)"""
    configured: bool = Field(..., description="Ist Spotify konfiguriert?")
    connected: bool = Field(..., description="Ist OAuth Flow abgeschlossen?")
    client_id: Optional[str] = Field(None, description="Client ID (sichtbar)")
    redirect_uri: Optional[str] = Field(None, description="Redirect URI")
    token_expires_at: Optional[datetime] = Field(None, description="Token Ablaufzeit")
    
    class Config:
        from_attributes = True


class SpotifyAuthUrlResponse(BaseModel):
    """Auth URL für OAuth Flow"""
    auth_url: str = Field(..., description="Spotify Authorization URL")
    state: str = Field(..., description="CSRF State Token")


class SpotifyTrack(BaseModel):
    """Informationen über einen Song"""
    name: str = Field(..., description="Song Titel")
    artist: str = Field(..., description="Künstler (Hauptinterpret)")
    artists: list[str] = Field(default_factory=list, description="Alle Künstler")
    album: str = Field(..., description="Album Name")
    album_image: Optional[str] = Field(None, description="Album Cover URL (640x640)")
    duration_ms: int = Field(..., description="Song Länge in Millisekunden")
    progress_ms: Optional[int] = Field(None, description="Aktueller Fortschritt")
    uri: str = Field(..., description="Spotify URI")
    external_url: Optional[str] = Field(None, description="Link zum Song")


class SpotifyNowPlayingResponse(BaseModel):
    """Aktueller Wiedergabe-Status"""
    is_playing: bool = Field(..., description="Wird gerade abgespielt?")
    track: Optional[SpotifyTrack] = Field(None, description="Song Informationen")
    device_name: Optional[str] = Field(None, description="Wiedergabegerät")
    shuffle_state: bool = Field(False, description="Shuffle aktiviert?")
    repeat_state: str = Field("off", description="Repeat Mode: off, context, track")
    progress_percent: Optional[float] = Field(None, description="Fortschritt in Prozent")
    
    class Config:
        from_attributes = True


class SpotifyPlaybackControlResponse(BaseModel):
    """Response nach Playback Control Action"""
    success: bool = Field(..., description="Aktion erfolgreich?")
    message: str = Field(..., description="Status Nachricht")
    action: str = Field(..., description="Ausgeführte Aktion (play, pause, next, previous)")


class SpotifyDevicesResponse(BaseModel):
    """Verfügbare Spotify Geräte"""
    devices: list[dict] = Field(default_factory=list, description="Liste der Geräte")


# ========================
# Database Models
# ========================

class SpotifyConfigDB(BaseModel):
    """Datenbank Model für Spotify Config (intern)"""
    id: int = 1
    client_id: str
    client_secret: str  # Encrypted
    redirect_uri: str
    access_token: Optional[str] = None  # Encrypted
    refresh_token: Optional[str] = None  # Encrypted
    token_expires_at: Optional[datetime] = None
    scope: Optional[str] = None
    connected: bool = False
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ========================
# Error Models
# ========================

class SpotifyErrorResponse(BaseModel):
    """Fehler Response"""
    error: str = Field(..., description="Fehler Typ")
    message: str = Field(..., description="Fehler Beschreibung")
    detail: Optional[str] = Field(None, description="Zusätzliche Details")
