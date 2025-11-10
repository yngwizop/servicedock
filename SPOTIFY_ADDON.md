# Spotify AddOn Setup Guide

## 🎵 Übersicht

Das Spotify AddOn integriert ein "Now Playing" Widget in dein servicedock Dashboard. Es zeigt in Echtzeit den aktuell abgespielten Song mit Album-Cover, Künstler und Fortschrittsbalken an.

## ✨ Features

- **Echtzeit-Anzeige** des aktuell spielenden Songs
- **Album-Cover** in hoher Qualität
- **Song-Informationen**: Titel, Künstler, Album
- **Fortschrittsbalken** mit Zeitanzeige
- **Geräte-Info**: Zeigt an, auf welchem Gerät die Musik läuft
- **Sicherer OAuth 2.0 Flow** mit verschlüsselten Tokens
- **Automatisches Token-Refresh** im Hintergrund
- **Admin-only Konfiguration** über SettingsPanel
- **Rate Limiting** zum Schutz der API

## 📋 Voraussetzungen

1. **Spotify Account** (Free oder Premium)
2. **Spotify Developer Account** (kostenlos)
3. **servicedock Dashboard** mit Admin-Zugriff

## 🚀 Setup-Anleitung

### Schritt 1: Spotify Developer App erstellen

1. Gehe zu [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Logge dich mit deinem Spotify-Account ein
3. Klicke auf **"Create app"**
4. Fülle das Formular aus:
   - **App name**: `servicedock` (oder ein beliebiger Name)
   - **App description**: `Now Playing Widget für mein Dashboard`
   - **Redirect URIs**: 
     - Für lokales Setup: `http://127.0.0.1:8000/api/spotify/callback`
     - Für Produktion: `https://deine-domain.com/api/spotify/callback`
   - **Website**: Optional (kann leer bleiben)
   - **Which API/SDKs are you planning to use?**: Wähle **Web API**
5. Akzeptiere die Terms of Service
6. Klicke auf **Save**

### Schritt 2: Client Credentials kopieren

1. Im Dashboard deiner App, klicke auf **Settings**
2. Kopiere die **Client ID** (sichtbar)
3. Klicke auf **View client secret** und kopiere das **Client Secret**
4. **WICHTIG**: Teile das Client Secret niemals öffentlich!

### Schritt 3: servicedock konfigurieren

1. Öffne dein servicedock Dashboard
2. Logge dich als **Admin** ein
3. Klicke auf das **Einstellungen-Symbol** (⚙️) oben rechts
4. Wechsle zum Tab **"AddOns"**
5. Finde die **Spotify-Kachel**
6. Fülle das Formular aus:
   ```
   Client ID:        [Deine Client ID]
   Client Secret:    [Dein Client Secret]
   Redirect URI:     http://127.0.0.1:8000/api/spotify/callback
   ```
7. Klicke auf **"Konfiguration speichern"**

### Schritt 4: Spotify-Account verbinden

1. Nach dem Speichern erscheint ein Button **"Mit Spotify verbinden"**
2. Klicke darauf - es öffnet sich ein neues Fenster
3. Du wirst zu Spotify weitergeleitet
4. Logge dich ein (falls nötig) und klicke auf **"Zustimmen"**
5. Du wirst zurück zu servicedock geleitet
6. Das Fenster schließt sich automatisch
7. Status ändert sich zu **"✓ Verbunden"**

### Schritt 5: Widget nutzen

1. Gehe zum Tab **"🎵 Now Playing"** im Dashboard
2. Das Widget zeigt nun deinen aktuell spielenden Song an
3. Die Anzeige aktualisiert sich alle 5 Sekunden automatisch

## 🔧 Produktions-Setup

Für den Einsatz auf einem Server mit eigener Domain:

### Backend-URL anpassen

1. Bearbeite die Spotify Developer App:
   - Füge hinzu: `https://deine-domain.com/api/spotify/callback`
2. In servicedock Settings (AddOns Tab):
   - Ändere die Redirect URI auf: `https://deine-domain.com/api/spotify/callback`
3. Speichere die Konfiguration neu
4. Verbinde Spotify erneut

### Reverse Proxy (Nginx Beispiel)

```nginx
# In deiner Nginx Config
location /api/spotify/ {
    proxy_pass http://localhost:8000/api/spotify/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## 🔒 Sicherheit

### Was wird gespeichert?

- **Client Secret**: Verschlüsselt in der Datenbank (Fernet encryption)
- **Access Token**: Verschlüsselt in der Datenbank
- **Refresh Token**: Verschlüsselt in der Datenbank
- **Client ID**: Unverschlüsselt (ist public)
- **Redirect URI**: Unverschlüsselt

### Berechtigungen (Scopes)

Das AddOn benötigt folgende Spotify-Berechtigungen:
- `user-read-currently-playing`: Liest aktuell spielenden Song
- `user-read-playback-state`: Liest Wiedergabe-Status (Gerät, Shuffle, etc.)
- `user-modify-playback-state`: Für zukünftige Play/Pause Controls

### Token-Refresh

- Access Tokens laufen nach 1 Stunde ab
- Das Backend refresht Tokens automatisch 5 Minuten vor Ablauf
- Keine manuelle Intervention nötig

### Rate Limiting

- `/api/spotify/now-playing`: Max. 30 Requests/Minute
- `/api/spotify/install`: Max. 5 Requests/Minute
- Schutz vor API-Missbrauch

## 🐛 Troubleshooting

### Widget zeigt "Keine Wiedergabe aktiv"

**Lösung**:
- Spiele einen Song auf Spotify ab
- Das Widget aktualisiert sich nach 5 Sekunden automatisch

### "Fehler beim Laden"

**Mögliche Ursachen**:
1. **Backend nicht erreichbar**: Prüfe ob Backend läuft (`http://127.0.0.1:8000`)
2. **Nicht verbunden**: Gehe zu Settings → AddOns → "Mit Spotify verbinden"
3. **Token abgelaufen**: Backend refresht automatisch, warte 1 Minute

### "Rate limit erreicht"

**Lösung**:
- Warte 1 Minute
- Das Widget pollt alle 5 Sekunden, bei vielen offenen Tabs kann das Limit erreicht werden
- Schließe unnötige Tabs

### OAuth-Fehler: "redirect_uri mismatch"

**Lösung**:
1. Gehe zu [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Öffne deine App → Settings
3. Prüfe, ob die Redirect URI **exakt** übereinstimmt:
   - Mit oder ohne Trailing Slash?
   - HTTP vs HTTPS?
   - Localhost vs 127.0.0.1?
4. Füge alle benötigten Varianten hinzu (mehrere möglich)

### "Client authentication failed"

**Lösung**:
- Client Secret falsch eingegeben
- Gehe zu Settings → AddOns
- Lösche die Config und richte sie neu ein

## 📊 API-Endpunkte (für Entwickler)

### Admin-Endpunkte (Auth required)

```bash
# Spotify installieren/konfigurieren
POST /api/spotify/install
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "client_id": "your_client_id",
  "client_secret": "your_client_secret",
  "redirect_uri": "http://127.0.0.1:8000/api/spotify/callback"
}

# Status abrufen
GET /api/spotify/status
Authorization: Bearer <admin_token>

# Auth URL generieren
GET /api/spotify/auth-url
Authorization: Bearer <admin_token>

# Spotify deinstallieren
DELETE /api/spotify/uninstall
Authorization: Bearer <admin_token>
```

### Öffentliche Endpunkte

```bash
# Now Playing abrufen (kein Auth nötig)
GET /api/spotify/now-playing

Response:
{
  "is_playing": true,
  "track": {
    "name": "Song Title",
    "artist": "Artist Name",
    "album": "Album Name",
    "album_image": "https://...",
    "duration_ms": 240000,
    "progress_ms": 120000
  },
  "device_name": "DESKTOP-PC",
  "progress_percent": 50.0
}

# OAuth Callback (wird von Spotify aufgerufen)
GET /api/spotify/callback?code=...&state=...
```

## 🔄 Token-Rotation

### Manuelles Neu-Verbinden

Falls du dein Spotify-Konto wechseln oder die Verbindung erneuern möchtest:

1. Settings → AddOns → Spotify
2. Klicke auf **"Spotify entfernen"** (unten)
3. Bestätige die Löschung
4. Konfiguriere Spotify neu (Client ID/Secret bleiben erhalten)
5. Klicke auf **"Mit Spotify verbinden"**

### Bei Sicherheitsbedenken

```bash
# Rotiere das Client Secret im Spotify Developer Dashboard
1. Gehe zu Spotify Developer Dashboard
2. Öffne deine App → Settings
3. Klicke auf "Rotate client secret"
4. Kopiere das neue Secret
5. In servicedock: Settings → AddOns → Spotify entfernen
6. Neue Konfiguration mit neuem Secret speichern
7. Neu verbinden
```

## 📝 Datenbank-Migration

Falls du servicedock bereits installiert hast und das AddOn nachträglich hinzufügst:

```sql
-- Führe diese SQL aus, um die Spotify-Tabelle zu erstellen
CREATE TABLE IF NOT EXISTS spotify_config (
    id INT PRIMARY KEY DEFAULT 1,
    client_id VARCHAR(255) NOT NULL,
    client_secret TEXT NOT NULL,
    redirect_uri VARCHAR(500) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    scope TEXT,
    connected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT spotify_single_row CHECK (id = 1)
);

CREATE INDEX IF NOT EXISTS idx_spotify_connected ON spotify_config(connected);
```

Oder nutze Docker:
```bash
# Neustart mit init.sql (löscht ALLE Daten!)
docker-compose down -v
docker-compose up -d

# Oder nur Backend neu starten (Daten bleiben erhalten)
docker-compose restart backend
```

## 🎨 Anpassungen

### Polling-Intervall ändern

In `frontend/src/components/SpotifyCard.jsx`:

```javascript
// Aktuell: 5 Sekunden
const interval = setInterval(fetchNowPlaying, 5000);

// Ändern auf z.B. 10 Sekunden
const interval = setInterval(fetchNowPlaying, 10000);
```

### Widget-Position ändern

Das Widget erscheint im "🎵 Now Playing" Tab. Um es stattdessen auf dem Services-Tab anzuzeigen:

In `frontend/src/App.jsx`:

```jsx
{activeTab === "services" && (
  <>
    {/* Bestehender Content */}
    <ServiceGrid ... />
    <ShortcutGrid ... />
    
    {/* NEU: Spotify Widget am Ende */}
    <div className="mt-8">
      <SpotifyCard />
    </div>
  </>
)}
```

## 🌟 Zukünftige Features

Geplante Erweiterungen (PRs willkommen!):

- [ ] **Playback Controls**: Play/Pause/Skip direkt im Widget
- [ ] **Lautstärke-Kontrolle**
- [ ] **Playlist-Anzeige**
- [ ] **Kürzlich gehört**
- [ ] **Gerät wechseln**
- [ ] **Song zu Playlist hinzufügen**
- [ ] **Lyrics-Anzeige** (via Genius API)

## 📚 Links

- [Spotify Web API Dokumentation](https://developer.spotify.com/documentation/web-api)
- [OAuth 2.0 Authorization Code Flow](https://developer.spotify.com/documentation/web-api/tutorials/code-flow)
- [servicedock GitHub Repository](https://github.com/yngwizop/servicedock)

## 💬 Support

Bei Fragen oder Problemen:

1. Prüfe dieses Dokument und die Troubleshooting-Section
2. Schaue in die Backend-Logs: `docker-compose logs backend`
3. Schaue in die Browser-Console (F12)
4. Öffne ein Issue im GitHub Repository

## 📄 Lizenz

Das Spotify AddOn ist Teil von servicedock und steht unter der gleichen Lizenz.

---

**Viel Spaß mit deinem Now Playing Widget! 🎵**
