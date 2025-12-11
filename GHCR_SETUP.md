# 🚀 GitHub Container Registry (GHCR) - Setup Guide

Komplette Anleitung zum Veröffentlichen deiner ServiceDock Images auf GHCR.

## ✅ Voraussetzungen

- GitHub Account (hast du bereits)
- Docker installiert und läuft
- Repository auf GitHub: `github.com/yngwizop/servicedock`

---

## 📝 Schritt 1: GitHub Personal Access Token erstellen

1. **Gehe zu GitHub:**
   - https://github.com/settings/tokens

2. **"Tokens (classic)"** → **"Generate new token (classic)"**

3. **Token-Name:** `servicedock-ghcr` (oder wie du möchtest)

4. **Scopes auswählen:**
   - ✅ `write:packages` - Upload von Packages
   - ✅ `read:packages` - Download von Packages
   - ✅ `delete:packages` - Löschen (optional)
   - ✅ `repo` - Voller Zugriff auf Repositories (für private Repos)

5. **"Generate token"** klicken

6. **Token kopieren** (sieht aus wie `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
   
   ⚠️ **WICHTIG:** Token sofort kopieren! Wird nur einmal angezeigt!

---

## 🔐 Schritt 2: Bei GHCR einloggen

```bash
# In Terminal (auf deiner VM)
cd /home/noah/servicedock

# Token als Variable setzen (ersetze ghp_xxx mit deinem Token)
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Bei GHCR einloggen
echo $GITHUB_TOKEN | docker login ghcr.io -u yngwizop --password-stdin
```

✅ Erfolg: `Login Succeeded`

---

## 🔨 Schritt 3: Images bauen

```bash
cd /home/noah/servicedock

# Backend Image bauen
docker build -t ghcr.io/yngwizop/servicedock-backend:latest ./backend

# Frontend Image bauen
docker build -t ghcr.io/yngwizop/servicedock-frontend:latest ./frontend

# Nginx Image bauen
docker build -t ghcr.io/yngwizop/servicedock-nginx:latest ./nginx
```

---

## 📤 Schritt 4: Images zu GHCR pushen

```bash
# Backend pushen
docker push ghcr.io/yngwizop/servicedock-backend:latest

# Frontend pushen
docker push ghcr.io/yngwizop/servicedock-frontend:latest

# Nginx pushen
docker push ghcr.io/yngwizop/servicedock-nginx:latest
```

⏱️ Dauert ein paar Minuten (je nach Upload-Geschwindigkeit)

---

## 🔒 Schritt 5: Images konfigurieren (auf GitHub)

### Packages sichtbar machen

1. **Gehe zu deinem GitHub-Profil:**
   - https://github.com/yngwizop

2. **"Packages"** Tab oben

3. **Jedes Image einzeln konfigurieren:**

#### Für jedes Image (backend, frontend, nginx):

**A. Mit Repository verknüpfen:**
   - Package öffnen → **"Package settings"** (rechts)
   - Scroll runter zu **"Danger Zone"**
   - **"Connect repository"** → `yngwizop/servicedock` auswählen

**B. Visibility einstellen:**
   
   **Option 1: Public (empfohlen für einfache Installation)**
   - **"Change visibility"** → **"Public"**
   - ✅ Jeder kann pullen (ohne Login)
   - ✅ Nutzer brauchen keine Credentials
   
   **Option 2: Private (nur für dich/eingeladene Nutzer)**
   - **"Change visibility"** → **"Private"**
   - ⚠️ Nutzer brauchen Login mit Token

---

## 🧪 Schritt 6: Testen

```bash
# Alte Images löschen (zum Testen)
docker rmi ghcr.io/yngwizop/servicedock-backend:latest
docker rmi ghcr.io/yngwizop/servicedock-frontend:latest
docker rmi ghcr.io/yngwizop/servicedock-nginx:latest

# Von GHCR pullen
docker pull ghcr.io/yngwizop/servicedock-backend:latest
docker pull ghcr.io/yngwizop/servicedock-frontend:latest
docker pull ghcr.io/yngwizop/servicedock-nginx:latest
```

✅ Sollte ohne Fehler durchlaufen!

---

## 🚀 Schritt 7: Production-Setup testen

```bash
# In neuem Verzeichnis testen
cd ~
mkdir servicedock-test
cd servicedock-test

# Production Files herunterladen
curl -o docker-compose.yml https://raw.githubusercontent.com/yngwizop/servicedock/test/docker-compose.production.yml
curl -o setup-servicedock.sh https://raw.githubusercontent.com/yngwizop/servicedock/test/setup-servicedock.sh

# Setup ausführen
chmod +x setup-servicedock.sh
./setup-servicedock.sh
```

---

## 🔄 Schritt 8: Updates veröffentlichen

### Neue Version bauen und pushen

```bash
cd /home/noah/servicedock

# Version ändern (z.B. v1.1.0)
VERSION=1.1.0

# Bauen mit Version-Tag + latest
docker build -t ghcr.io/yngwizop/servicedock-backend:latest \
             -t ghcr.io/yngwizop/servicedock-backend:$VERSION ./backend

docker build -t ghcr.io/yngwizop/servicedock-frontend:latest \
             -t ghcr.io/yngwizop/servicedock-frontend:$VERSION ./frontend

docker build -t ghcr.io/yngwizop/servicedock-nginx:latest \
             -t ghcr.io/yngwizop/servicedock-nginx:$VERSION ./nginx

# Beide Tags pushen (latest + version)
docker push ghcr.io/yngwizop/servicedock-backend:latest
docker push ghcr.io/yngwizop/servicedock-backend:$VERSION

docker push ghcr.io/yngwizop/servicedock-frontend:latest
docker push ghcr.io/yngwizop/servicedock-frontend:$VERSION

docker push ghcr.io/yngwizop/servicedock-nginx:latest
docker push ghcr.io/yngwizop/servicedock-nginx:$VERSION
```

### Nutzer aktualisieren:
```bash
docker compose pull
docker compose up -d
```

---

## 📊 Deine Images auf GitHub

Nach dem Push findest du sie hier:
- https://github.com/yngwizop?tab=packages
- Direkt: `ghcr.io/yngwizop/servicedock-backend:latest`

---

## 🔧 Troubleshooting

### "unauthorized: unauthenticated"
→ Token abgelaufen oder falsch eingeloggt
```bash
docker logout ghcr.io
echo $GITHUB_TOKEN | docker login ghcr.io -u yngwizop --password-stdin
```

### "denied: permission_denied"
→ Token hat nicht die richtigen Scopes
→ Neues Token mit `write:packages` und `read:packages` erstellen

### Images werden nicht angezeigt
→ Warte 1-2 Minuten nach dem Push
→ Hard-Refresh auf GitHub (Strg+F5)

### Private Images für andere freigeben
1. GitHub → Package → **"Package settings"**
2. **"Manage Actions access"**
3. User/Team hinzufügen mit **"Read"** Rolle

---

## 💡 Pro-Tipps

### Token sicher speichern
```bash
# In ~/.bashrc oder ~/.zshrc
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# Dann in neuer Shell:
echo $GITHUB_TOKEN | docker login ghcr.io -u yngwizop --password-stdin
```

### Automatisches Login
```bash
# Token in Docker credentials speichern
docker login ghcr.io -u yngwizop -p $GITHUB_TOKEN
# Bleibt gespeichert in ~/.docker/config.json
```

### Multi-Arch Builds (Optional)
```bash
# Für ARM + x86 (Raspberry Pi + normale PCs)
docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/yngwizop/servicedock-backend:latest \
  --push ./backend
```

---

## ✅ Fertig!

Deine Images sind jetzt auf GHCR verfügbar! 🎉

**Nutzer installieren mit:**
```bash
curl -o setup-servicedock.sh https://raw.githubusercontent.com/yngwizop/servicedock/main/setup-servicedock.sh
chmod +x setup-servicedock.sh
./setup-servicedock.sh
```
