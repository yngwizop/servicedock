# 🏗️ ServiceDock Build & Publish Guide

Anleitung zum Bauen und Veröffentlichen der ServiceDock Images auf Docker Hub.

## Voraussetzungen

1. **Docker Hub Account**
   - Registrieren auf https://hub.docker.com
   - Username notieren (z.B. `yngwizop`)

2. **Docker Hub Login**
   ```bash
   docker login
   # Username: yngwizop
   # Password: [dein Token/Passwort]
   ```

## 🔨 Images bauen und veröffentlichen

### Schritt 1: Images lokal bauen

```bash
cd /home/noah/servicedock

# Backend Image bauen
docker build -t yngwizop/servicedock-backend:latest ./backend

# Frontend Image bauen
docker build -t yngwizop/servicedock-frontend:latest ./frontend

# Nginx Image bauen (Custom mit Config)
docker build -t yngwizop/servicedock-nginx:latest ./nginx
```

### Schritt 2: Images taggen (Optional: Versionierung)

```bash
# Version 1.0.0 taggen
docker tag yngwizop/servicedock-backend:latest yngwizop/servicedock-backend:1.0.0
docker tag yngwizop/servicedock-frontend:latest yngwizop/servicedock-frontend:1.0.0
docker tag yngwizop/servicedock-nginx:latest yngwizop/servicedock-nginx:1.0.0
```

### Schritt 3: Images zu Docker Hub pushen

```bash
# Backend pushen
docker push yngwizop/servicedock-backend:latest
docker push yngwizop/servicedock-backend:1.0.0

# Frontend pushen
docker push yngwizop/servicedock-frontend:latest
docker push yngwizop/servicedock-frontend:1.0.0

# Nginx pushen
docker push yngwizop/servicedock-nginx:latest
docker push yngwizop/servicedock-nginx:1.0.0
```

## 📦 Nginx Custom Image erstellen

Da Nginx die Config-Datei benötigt, erstelle ein Custom Image:

**Erstelle `nginx/Dockerfile`:**

```dockerfile
FROM nginx:alpine

# Kopiere Custom Nginx Config
COPY nginx.conf /etc/nginx/nginx.conf

# Health Check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider --no-check-certificate https://127.0.0.1/ || exit 1

EXPOSE 80 443
```

Dann bauen:
```bash
docker build -t yngwizop/servicedock-nginx:latest ./nginx
docker push yngwizop/servicedock-nginx:latest
```

## 🚀 Veröffentlichen auf GitHub

### 1. Repository Setup

```bash
cd /home/noah/servicedock

# Git initialisieren (falls noch nicht geschehen)
git init
git add docker-compose.production.yml .env.example setup-servicedock.sh QUICKSTART.md db/init.sql
git commit -m "Release v1.0.0"

# Remote hinzufügen
git remote add origin https://github.com/yngwizop/servicedock.git
git push -u origin main
```

### 2. Release erstellen

Auf GitHub:
1. Gehe zu **Releases** → **Create a new release**
2. Tag: `v1.0.0`
3. Title: `ServiceDock v1.0.0 - Initial Release`
4. Beschreibung:
   ```markdown
   ## 🚀 Installation
   
   ```bash
   curl -o setup-servicedock.sh https://raw.githubusercontent.com/yngwizop/servicedock/main/setup-servicedock.sh
   chmod +x setup-servicedock.sh
   ./setup-servicedock.sh
   ```
   
   ## 📦 Docker Hub Images
   - `yngwizop/servicedock-backend:1.0.0`
   - `yngwizop/servicedock-frontend:1.0.0`
   - `yngwizop/servicedock-nginx:1.0.0`
   
   ## ✨ Features
   - Dashboard für Services & Shortcuts
   - Proxmox VM Management
   - Spotify Integration
   - Dark/Light Mode
   - Rate Limiting & Security
   ```

## 📋 Minimale User-Installation

Nutzer brauchen nur noch:

```bash
# 1. Setup-Script laden und ausführen
curl -o setup-servicedock.sh https://raw.githubusercontent.com/yngwizop/servicedock/main/setup-servicedock.sh
chmod +x setup-servicedock.sh
./setup-servicedock.sh

# FERTIG! 🎉
```

## 🔄 Updates veröffentlichen

### Neue Version bauen

```bash
# Version erhöhen (z.B. v1.1.0)
VERSION=1.1.0

docker build -t yngwizop/servicedock-backend:latest -t yngwizop/servicedock-backend:$VERSION ./backend
docker build -t yngwizop/servicedock-frontend:latest -t yngwizop/servicedock-frontend:$VERSION ./frontend
docker build -t yngwizop/servicedock-nginx:latest -t yngwizop/servicedock-nginx:$VERSION ./nginx

docker push yngwizop/servicedock-backend:latest
docker push yngwizop/servicedock-backend:$VERSION
docker push yngwizop/servicedock-frontend:latest
docker push yngwizop/servicedock-frontend:$VERSION
docker push yngwizop/servicedock-nginx:latest
docker push yngwizop/servicedock-nginx:$VERSION
```

### User Update

Nutzer aktualisieren mit:
```bash
cd servicedock
docker compose pull
docker compose up -d
```

## 📁 Was Nutzer sehen

```
servicedock/
├── docker-compose.yml    # Auto-downloaded
├── .env                  # Auto-generated
├── db-init.sql          # Auto-downloaded
├── ssl/                 # Auto-generated
│   ├── server.crt
│   └── server.key
└── db-ssl/              # Auto-generated
    ├── server.crt
    └── server.key
```

Keine Source-Code-Ordner (`frontend/`, `backend/`, READMEs etc.) mehr sichtbar! ✅

## 🎯 Alternative: GitHub Container Registry (GHCR)

**Empfohlen für private Images!** Unbegrenzt kostenlos.

### Vorteile:
- ✅ Unbegrenzt private Images (kostenlos)
- ✅ Bessere GitHub Integration
- ✅ Fine-grained Access Tokens
- ✅ Keine Pull-Limits

### 1. GitHub Personal Access Token erstellen

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. **Generate new token (classic)**
3. Scopes wählen:
   - ✅ `write:packages` (Upload)
   - ✅ `read:packages` (Download)
   - ✅ `delete:packages` (Optional)
4. Token kopieren (z.B. `ghp_xxxxxxxxxxxx`)

### 2. Login bei GHCR

```bash
# Token als Variable speichern (temporär)
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# Bei GHCR einloggen
echo $GITHUB_TOKEN | docker login ghcr.io -u yngwizop --password-stdin
```

### 3. Images bauen und pushen

```bash
# Bauen mit GHCR Prefix
docker build -t ghcr.io/yngwizop/servicedock-backend:latest ./backend
docker build -t ghcr.io/yngwizop/servicedock-frontend:latest ./frontend
docker build -t ghcr.io/yngwizop/servicedock-nginx:latest ./nginx

# Pushen
docker push ghcr.io/yngwizop/servicedock-backend:latest
docker push ghcr.io/yngwizop/servicedock-frontend:latest
docker push ghcr.io/yngwizop/servicedock-nginx:latest
```

### 4. Images auf privat stellen

1. Gehe zu GitHub → **Packages** (bei deinem Profil)
2. Wähle dein Image (z.B. `servicedock-backend`)
3. **Package settings** → **Change visibility** → **Private**

### 5. docker-compose.production.yml anpassen

```yaml
services:
  nginx:
    image: ghcr.io/yngwizop/servicedock-nginx:latest
    # ...
  
  frontend:
    image: ghcr.io/yngwizop/servicedock-frontend:latest
    # ...
  
  backend:
    image: ghcr.io/yngwizop/servicedock-backend:latest
    # ...
```

### 6. Nutzer-Installation mit privatem GHCR

Nutzer brauchen Zugriff:

**Option A: Token teilen (nicht empfohlen)**
```bash
echo YOUR_TOKEN | docker login ghcr.io -u yngwizop --password-stdin
```

**Option B: Public machen für einfache Installation**
- GitHub → Package → **Change visibility** → **Public**
- Dann brauchen Nutzer kein Login

**Option C: Selektiver Zugriff**
- Erstelle einen Read-Only Token nur für Package-Download
- Teile diesen Token mit vertrauenswürdigen Nutzern
