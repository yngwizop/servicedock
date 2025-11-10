# HTTPS Setup für servicedock

## 🔒 Übersicht

Dein Dashboard läuft jetzt mit HTTPS über einen Nginx Reverse Proxy!

### Was wurde eingerichtet:

- ✅ **Nginx Reverse Proxy** als Docker Container
- ✅ **Self-Signed SSL-Zertifikat** für lokale Nutzung
- ✅ **HTTP → HTTPS Redirect** (automatisch)
- ✅ **Moderne SSL-Konfiguration** (TLS 1.2/1.3)
- ✅ **Security Headers** (HSTS, X-Frame-Options, etc.)

## 🌐 Zugriff

### HTTPS (empfohlen):
```
https://192.168.178.83
```

### HTTP (redirectet automatisch zu HTTPS):
```
http://192.168.178.83
```

## 🎵 Spotify OAuth Setup

### 1. Spotify Developer Dashboard

Füge in deiner Spotify App hinzu:
```
https://192.168.178.83/api/spotify/callback
```

### 2. servicedock Dashboard

1. Öffne: `https://192.168.178.83`
2. Akzeptiere die Zertifikats-Warnung (siehe unten)
3. Settings → AddOns → Spotify
4. Die Redirect URI wird automatisch korrekt angezeigt
5. "Mit Spotify verbinden" klicken
6. Fertig! 🎉

## ⚠️ Browser-Warnung

Da es sich um ein Self-Signed Zertifikat handelt, zeigt dein Browser eine Warnung:

### Chrome/Edge:
1. Klicke auf "Erweitert"
2. Klicke auf "Weiter zu 192.168.178.83 (unsicher)"

### Firefox:
1. Klicke auf "Erweitert"
2. Klicke auf "Risiko akzeptieren und fortfahren"

### Safari:
1. Klicke auf "Details"
2. Klicke auf "Diese Website besuchen"

**Das ist völlig normal und sicher für lokale Nutzung!**

## 🔄 Zertifikat neu generieren

Falls du die IP-Adresse änderst oder ein neues Zertifikat brauchst:

```bash
cd /home/webdashboard
./generate-ssl.sh
docker compose restart nginx
```

## 🔧 Konfiguration

### Nginx Config:
```
nginx/nginx.conf
```

### SSL Zertifikate:
```
nginx/ssl/cert.pem  (öffentliches Zertifikat)
nginx/ssl/key.pem   (privater Schlüssel)
```

### Docker Compose:
Das `docker-compose.yml` wurde erweitert um den `nginx` Service.

## 📱 Von anderen Geräten zugreifen

Du kannst jetzt von **allen Geräten** im Netzwerk zugreifen:

- ✅ PC: `https://192.168.178.83`
- ✅ Laptop: `https://192.168.178.83`
- ✅ Handy: `https://192.168.178.83`
- ✅ Tablet: `https://192.168.178.83`

**Wichtig**: Auf jedem Gerät musst du die Zertifikats-Warnung akzeptieren.

## 🚀 Container Management

### Alles starten:
```bash
docker compose up -d
```

### Alles stoppen:
```bash
docker compose down
```

### Nur Nginx neu starten:
```bash
docker compose restart nginx
```

### Logs anschauen:
```bash
docker compose logs nginx
docker compose logs -f nginx  # Live-Logs
```

## 🔐 Sicherheit

### Was ist geschützt:
- ✅ Verschlüsselte Verbindung (HTTPS)
- ✅ Security Headers aktiv
- ✅ Nur im lokalen Netzwerk erreichbar

### Was du beachten solltest:
- ⚠️ Das Zertifikat ist Self-Signed (Browser-Warnung ist normal)
- ⚠️ Nicht von außen (Internet) erreichbar (gut so!)
- ⚠️ Starke Passwörter verwenden!

## 🎯 Ports

- **Port 80** (HTTP): Redirectet automatisch zu HTTPS
- **Port 443** (HTTPS): Hauptzugriff
- **Port 3000/8000**: Nicht mehr direkt erreichbar (läuft über Nginx)

## 💡 Tipps

### Zertifikats-Warnung nervig?

Option 1: **mkcert verwenden** (keine Warnung)
- Erstellt eine lokale CA
- Browser vertraut dem Zertifikat
- Setup-Anleitung: [siehe mkcert Dokumentation]

Option 2: **Warnung akzeptieren und weitermachen** 😎
- Für persönliche Nutzung völlig ok
- Musst es nur einmal pro Browser akzeptieren

### Von unterwegs zugreifen?

Du brauchst:
1. Port-Forwarding im Router (443 → 192.168.178.83:443)
2. DynDNS (z.B. DuckDNS) für feste URL
3. Zertifikat für deine DynDNS-Domain

Für rein lokale Nutzung: **Nicht nötig!**

## 📚 Weitere Informationen

- Nginx Dokumentation: https://nginx.org/en/docs/
- Docker Compose: https://docs.docker.com/compose/
- Let's Encrypt (für echte Zertifikate): https://letsencrypt.org/

---

**Status**: ✅ HTTPS ist aktiv und funktioniert!
**Zugriff**: `https://192.168.178.83`
