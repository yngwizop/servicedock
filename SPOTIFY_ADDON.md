# Spotify AddOn Setup Guide

## 🎵 Übersicht

Das Spotify AddOn integriert ein "Now Playing" Widget in dein servicedock Dashboard. Es zeigt in Echtzeit den aktuell abgespielten Song mit Album-Cover, Künstler und Fortschrittsbalken an.

### Features

- Echtzeit-Anzeige des aktuell spielenden Songs
- Album-Cover mit Song-Informationen (Titel, Künstler, Album)
- Fortschrittsbalken mit Zeitanzeige
- Sicherer OAuth 2.0 Flow mit verschlüsselten Tokens
- Automatisches Token-Refresh im Hintergrund

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
   - **Für HTTP (lokal)**: `http://127.0.0.1:8000/api/spotify/callback`
   - **Für HTTPS (im lokalen Netz)**: `https://10.10.10.50/api/spotify/callback`
   - **Für HTTPS (mit Domain)**: `https://deine-domain.com/api/spotify/callback`
   - ⚠️ **Spotify erlaubt HTTP nur für 127.0.0.1 und localhost!**
   - **Website**: Optional (kann leer bleiben)
   - **Which API/SDKs are you planning to use?**: Wähle **Web API**
5. Akzeptiere die Terms of Service
6. Klicke auf **Save**

**Wichtig**: Für lokale Nutzung trage nur `http://127.0.0.1:8000/api/spotify/callback` ein.

### Schritt 2: Client Credentials kopieren

1. Im Dashboard deiner App, klicke auf **Settings**
2. Kopiere die **Client ID** (sichtbar)
3. Klicke auf **View client secret** und kopiere das **Client Secret**
4. **WICHTIG**: Teile das Client Secret niemals öffentlich!

### Schritt 3: servicedock konfigurieren

1. Öffne dein servicedock Dashboard über `http://127.0.0.1:3000`
2. Logge dich als **Admin** ein
3. Klicke auf das **Einstellungen-Symbol** (⚙️) oben rechts
4. Wechsle zum Tab **"AddOns"**
5. Finde die **Spotify-Kachel**
6. Fülle das Formular aus:
   - **Client ID**: Deine Client ID aus Spotify Dashboard
   - **Client Secret**: Dein Client Secret aus Spotify Dashboard
   - **Redirect URI**: `https://10.10.10.50/api/spotify/callback` (wird automatisch ausgefüllt, wenn du im Netzwerk zugreifst)
7. Klicke auf **"Konfiguration speichern"**

**Wichtig**: Für den Zugriff im lokalen Netzwerk **musst** du das Dashboard über `https://10.10.10.50` öffnen, damit der OAuth-Flow mit Spotify funktioniert!

### Schritt 4: Spotify-Account verbinden

1. Nach dem Speichern erscheint ein Button **"Mit Spotify verbinden"**
2. Klicke darauf - es öffnet sich ein neues Fenster/Tab
3. Du wirst zu Spotify weitergeleitet
4. Logge dich ein (falls nötig) und klicke auf **"Zustimmen"**
5. Nach erfolgreicher Verbindung erscheint eine Erfolgsseite
6. Das Fenster schließt sich automatisch nach 3 Sekunden (oder schließe es manuell)
7. Gehe zurück zum Dashboard - Status zeigt **"✓ Verbunden"**

**Hinweis**: Die Verbindung funktioniert auch wenn VS Code geschlossen ist - du kannst das Callback-Fenster einfach schließen nach der Erfolgsmeldung.

### Schritt 5: Widget nutzen

1. Das Widget erscheint automatisch auf dem Dashboard (rechts neben der Tab-Navigation)
2. Die Anzeige aktualisiert sich alle 5 Sekunden automatisch
3. Wenn keine Musik läuft, zeigt es "Keine Musik wird abgespielt" an

## 🔒 Sicherheit & Rate Limiting

### Token-Verschlüsselung

Alle sensiblen Daten werden verschlüsselt in der Datenbank gespeichert:
- Client Secret (Fernet AES-128 Verschlüsselung)
- Access Token (automatisch refreshed)
- Refresh Token

### Token-Management

- Access Tokens laufen nach 1 Stunde ab
- Automatisches Refresh 5 Minuten vor Ablauf
- Keine manuelle Intervention nötig

### Rate Limiting

Zum Schutz vor API-Missbrauch gelten folgende Limits:
- **Now Playing Endpunkt**: Max. 30 Requests/Minute
- **Admin-Endpunkte** (Install/Uninstall): Max. 5 Requests/Minute

### Berechtigungen

Das AddOn benötigt folgende Spotify-Scopes:
- `user-read-currently-playing` - Aktuell spielenden Song lesen
- `user-read-playback-state` - Wiedergabe-Status lesen

## 🐛 Troubleshooting

### Widget zeigt nichts an

**Lösung**:
- Prüfe in Settings → AddOns ob Spotify als "✓ Verbunden" angezeigt wird
- Falls nicht verbunden: Klicke auf "Mit Spotify verbinden"
- Aktualisiere die Seite (Strg+F5)

### Widget zeigt "Keine Musik wird abgespielt"

**Lösung**:
- Spiele einen Song in Spotify ab
- Das Widget aktualisiert sich automatisch nach 5 Sekunden

### OAuth-Fehler: "INVALID_CLIENT: Insecure redirect URI"

**Lösung**:
1. Spotify erlaubt HTTP nur für `127.0.0.1` und `localhost`
2. Für andere IPs (z.B. `192.168.x.x`) **musst du HTTPS verwenden**
3. Entweder:
   - Greife auf das Dashboard über `http://127.0.0.1:3000` zu (nur lokal)
   - Oder richte HTTPS mit einem Reverse Proxy ein (Nginx, Traefik, etc.)

### OAuth-Fehler: "Redirect URI mismatch"

**Lösung**:
1. Überprüfe im Spotify Developer Dashboard → Settings
2. Redirect URI muss **exakt** übereinstimmen mit der in servicedock Settings
3. Kopiere die URI aus servicedock Settings (AddOns Tab) und füge sie in Spotify ein
4. **Wichtig**: Achte auf http vs https, Port, und trailing slash!

### Verbindung erneuern

Falls die Verbindung nicht funktioniert:

1. Settings → AddOns → Spotify
2. Klicke auf **"Spotify entfernen"**
3. Speichere neue Konfiguration
4. Klicke auf **"Mit Spotify verbinden"**

## � Produktions-Setup (Optional)

Für den Einsatz auf einem Server mit eigener Domain:

1. Richte HTTPS mit einem gültigen SSL-Zertifikat ein (z.B. mit Let's Encrypt)
2. Bearbeite deine Spotify App im Developer Dashboard
3. Füge hinzu: `https://deine-domain.com/api/spotify/callback`
4. In servicedock Settings wird die URI automatisch angepasst
5. Verbinde Spotify erneut

**Hinweis**: Du kannst mehrere Redirect URIs in Spotify eintragen - eine für lokal (`http://127.0.0.1:8000/...`) und eine für Produktion (`https://...`).

## 📝 Wichtige Hinweise

### Zugriff und Spotify OAuth

**Spotify-Einschränkung**: HTTP ist nur für `127.0.0.1` und `localhost` erlaubt!

**So funktioniert es:**

1. **Lokal auf dem Server-PC**: 
   - Zugriff über: `http://127.0.0.1:3000`
   - Spotify OAuth funktioniert ✅

2. **Von einem anderen Gerät im Netzwerk**:
    - Problem: Du greifst über `http://192.168.x.x:3000` zu
    - Spotify OAuth funktioniert **NICHT** ❌ (HTTP nicht erlaubt für IPs)
    - **Lösung**: 
       - Option A: Nutze SSH Port-Forwarding zum Server und greife über `127.0.0.1` zu
       - Option B: Greife über `https://10.10.10.50` zu (empfohlen, mit Nginx/HTTPS-Proxy)

3. **Mit Domain und HTTPS**:
   - Zugriff über: `https://deine-domain.com`
   - Spotify OAuth funktioniert ✅
   - Redirect URI: `https://deine-domain.com/api/spotify/callback`

### SSH Port-Forwarding (für Netzwerk-Zugriff ohne HTTPS)

Wenn du von einem anderen PC im Netzwerk zugreifen möchtest:

```bash
# Auf deinem Client-PC (z.B. Laptop)
ssh -L 3000:localhost:3000 -L 8000:localhost:8000 user@192.168.x.x

# Dann im Browser öffnen:
http://127.0.0.1:3000
```

So wird der Traffic durch den SSH-Tunnel geleitet und Spotify sieht `127.0.0.1`!

## 💬 Support

Bei Problemen:

1. Prüfe die Troubleshooting-Section oben
2. Schaue in die Backend-Logs: `docker-compose logs backend`
3. Öffne die Browser-Console (F12) für Frontend-Fehler

---

**Viel Spaß mit deinem Now Playing Widget! 🎵**
