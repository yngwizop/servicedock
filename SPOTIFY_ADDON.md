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
     - ⚠️ **WICHTIG**: Verwende **nur** `http://127.0.0.1:8000/api/spotify/callback`
     - **NICHT** `http://localhost:8000` verwenden (funktioniert nicht mit Docker)
     - **NICHT** `http://192.168.x.x` oder andere lokale IPs verwenden
     - Spotify erlaubt HTTP nur für `127.0.0.1` und `localhost`, aber Docker leitet nur `127.0.0.1` korrekt weiter
     - Für Produktion: `https://deine-domain.com/api/spotify/callback` (muss HTTPS sein)
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
   ⚠️ **Wichtig**: 
   - Verwende **nur** `http://127.0.0.1:8000/api/spotify/callback`
   - **NICHT** `localhost:8000` (funktioniert nicht mit Docker)
   - Die URI muss **exakt** mit der in Spotify Developer Dashboard übereinstimmen
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
1. Verwende im Spotify Developer Dashboard **nur**: `http://127.0.0.1:8000/api/spotify/callback`
2. **NICHT** `localhost` verwenden (funktioniert nicht mit Docker)
3. In servicedock Settings die **exakt gleiche** URI eintragen

### OAuth-Fehler: "Redirect URI mismatch"

**Lösung**:
1. Überprüfe im Spotify Developer Dashboard → Settings
2. Redirect URI muss **exakt** sein: `http://127.0.0.1:8000/api/spotify/callback`
3. Kopiere die URI **exakt** in servicedock Settings → AddOns → Spotify

### Verbindung erneuern

Falls die Verbindung nicht funktioniert:

1. Settings → AddOns → Spotify
2. Klicke auf **"Spotify entfernen"**
3. Speichere neue Konfiguration
4. Klicke auf **"Mit Spotify verbinden"**

## � Produktions-Setup (Optional)

Für den Einsatz auf einem Server mit eigener Domain:

1. Bearbeite deine Spotify App im Developer Dashboard
2. Füge hinzu: `https://deine-domain.com/api/spotify/callback` (muss HTTPS sein)
3. In servicedock Settings die neue URI eintragen
4. Verbinde Spotify erneut

**Hinweis**: Du kannst beide URIs in Spotify eintragen (`127.0.0.1` für lokal + HTTPS für Produktion).

## 📝 Wichtige Hinweise

### Warum nur 127.0.0.1 und nicht localhost?

- Docker Port-Mapping bindet an alle Interfaces
- `127.0.0.1` ist die garantiert funktionierende Loopback-Adresse
- `localhost` kann bei Docker zu DNS-Problemen führen
- **Empfehlung**: Immer `127.0.0.1` für lokales Docker-Setup verwenden

## 💬 Support

Bei Problemen:

1. Prüfe die Troubleshooting-Section oben
2. Schaue in die Backend-Logs: `docker-compose logs backend`
3. Öffne die Browser-Console (F12) für Frontend-Fehler

---

**Viel Spaß mit deinem Now Playing Widget! 🎵**
