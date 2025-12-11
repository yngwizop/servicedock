# 🚀 ServiceDock - GHCR Setup & Deployment Guide

Komplette Anleitung zum initialen Setup und Deployment deiner ServiceDock-App auf GitHub Container Registry (GHCR).

---

## 📋 Übersicht

Du hast deine App entwickelt und möchtest sie jetzt als Docker-Images auf GHCR veröffentlichen, damit andere sie einfach installieren können.

**Nach diesem Setup können Nutzer installieren mit:**
```bash
curl -o setup-servicedock.sh https://raw.githubusercontent.com/yngwizop/servicedock/main/setup-servicedock.sh
chmod +x setup-servicedock.sh
./setup-servicedock.sh
```

---

## ✅ Voraussetzungen

- ✅ GitHub Account (hast du: `yngwizop`)
- ✅ Repository auf GitHub: `github.com/yngwizop/servicedock`
- ✅ Docker & Docker Compose installiert
- ✅ Funktionierende ServiceDock-App lokal

---

## 🎯 Initial Setup (Einmalig)

### Schritt 1: GitHub Personal Access Token erstellen

1. **GitHub öffnen:** https://github.com/settings/tokens

2. **"Tokens (classic)"** → **"Generate new token (classic)"**

3. **Token konfigurieren:**
   - **Name:** `servicedock-ghcr-deploy`
   - **Expiration:** `No expiration` (oder 1 Jahr)
   - **Scopes:**
     - ✅ `repo` (Full control - wird automatisch ausgewählt)
     - ✅ `write:packages` (Upload packages)
     - ✅ `read:packages` (wird automatisch inkludiert)

4. **"Generate token"** klicken

5. **Token kopieren** (sieht aus wie `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
   
   ⚠️ **WICHTIG:** Sofort kopieren und sicher speichern! Wird nur einmal angezeigt.

---

### Schritt 2: Bei GHCR einloggen (auf deiner VM)

```bash
# In dein Projekt-Verzeichnis wechseln
cd /home/noah/servicedock

# Token als Umgebungsvariable setzen
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Bei GitHub Container Registry einloggen
echo $GITHUB_TOKEN | docker login ghcr.io -u yngwizop --password-stdin
```

✅ **Erfolg:** `Login Succeeded`

**Token dauerhaft speichern (optional):**
```bash
# In ~/.bashrc hinzufügen
echo 'export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx' >> ~/.bashrc
source ~/.bashrc
```

---

### Schritt 3: Images bauen und zu GHCR pushen

```bash
cd /home/noah/servicedock

# Backend Image bauen
docker build -t ghcr.io/yngwizop/servicedock-backend:latest ./backend

# Frontend Image bauen
docker build -t ghcr.io/yngwizop/servicedock-frontend:latest ./frontend

# Nginx Image bauen
docker build -t ghcr.io/yngwizop/servicedock-nginx:latest ./nginx

# Alle Images zu GHCR pushen
docker push ghcr.io/yngwizop/servicedock-backend:latest
docker push ghcr.io/yngwizop/servicedock-frontend:latest
docker push ghcr.io/yngwizop/servicedock-nginx:latest
```

⏱️ **Dauer:** 5-10 Minuten (je nach Upload-Geschwindigkeit)

---

### Schritt 4: Images auf GitHub konfigurieren

#### A. Packages mit Repository verknüpfen

1. **GitHub öffnen:** https://github.com/yngwizop?tab=packages

2. **Für jedes Package einzeln** (backend, frontend, nginx):
   - Package anklicken
   - Rechts: **"Package settings"**
   - **"Connect repository"** → `yngwizop/servicedock` auswählen
   - **"Connect"**

#### B. Visibility einstellen

**Option 1: Private (nur für dich/autorisierte Nutzer)**
- Im Package: **"Change visibility"** → **"Private"**
- ⚠️ Nutzer brauchen Login mit Token

**Option 2: Public (einfachste Installation für alle)**
- Im Package: **"Change visibility"** → **"Public"**
- ✅ Jeder kann ohne Login pullen
- ✅ Empfohlen für Open-Source-Projekte

---

### Schritt 5: Repository-Dateien vorbereiten

Stelle sicher, dass diese Dateien im Repository sind:

```bash
cd /home/noah/servicedock

# Dateien prüfen
ls -la docker-compose.production.yml  # ✅ Mit GHCR-Image-Namen
ls -la setup-servicedock.sh           # ✅ Auto-Setup-Script
ls -la QUICKSTART.md                  # ✅ Nutzer-Anleitung
ls -la db/init.sql                    # ✅ DB-Schema
```

**Falls noch nicht committed:**
```bash
git add docker-compose.production.yml setup-servicedock.sh QUICKSTART.md GHCR_SETUP.md
git commit -m "Add GHCR deployment files"
git push origin test
```

---

### Schritt 6: Branch zu main mergen (für Production)

```bash
# Von test zu main mergen
git checkout main
git merge test
git push origin main
```

**Oder auf GitHub:**
1. Pull Request von `test` → `main` erstellen
2. Mergen

---

## 🧪 Schritt 7: Installation testen

### Test in separatem Verzeichnis

```bash
# Neues Test-Verzeichnis
cd ~
mkdir servicedock-installation-test
cd servicedock-installation-test

# Setup-Script laden
curl -o setup-servicedock.sh https://raw.githubusercontent.com/yngwizop/servicedock/main/setup-servicedock.sh
chmod +x setup-servicedock.sh

# Ausführen
./setup-servicedock.sh
```

**Falls Images private sind:**
```bash
# Vorher einloggen
echo $GITHUB_TOKEN | docker login ghcr.io -u yngwizop --password-stdin

# Dann Setup ausführen
./setup-servicedock.sh
```

✅ **Erfolg:** ServiceDock läuft auf https://localhost

---

## 🔄 Updates veröffentlichen (später)

### Neue Version bauen und pushen

```bash
cd /home/noah/servicedock

# Änderungen machen, dann:
git add .
git commit -m "Update: [beschreibung]"
git push

# Version setzen (z.B. 1.1.0)
VERSION=1.1.0

# Images mit Version-Tag bauen
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

### Nutzer aktualisieren dann mit:

```bash
cd servicedock
docker compose pull
docker compose up -d
```

---

## 📊 Zusammenfassung: Was haben wir erreicht?

### Vorher (Development):
```
servicedock/
├── backend/          ← Source-Code sichtbar
├── frontend/         ← Source-Code sichtbar
├── nginx/            ← Config sichtbar
├── db/
├── docker-compose.yml
└── viele README-Dateien
```

**Nutzer-Installation:** Komplett klonen, alles lokal bauen (20+ Minuten)

### Nachher (Production):
```
servicedock/
├── docker-compose.yml    ← Nur Config
├── .env                  ← Auto-generiert
├── db-init.sql          ← Auto-downloaded
├── ssl/                 ← Auto-generiert
└── db-ssl/              ← Auto-generiert
```

**Nutzer-Installation:** 
```bash
./setup-servicedock.sh    # 5 Minuten, fertig!
```

✅ **Kein Source-Code sichtbar**  
✅ **Fertige Images von GHCR**  
✅ **Automatische Installation**  
✅ **Professionelles Setup**

---

## 🔧 Troubleshooting

### "unauthorized: unauthenticated" beim Push
```bash
# Token abgelaufen oder falsch
docker logout ghcr.io
echo $GITHUB_TOKEN | docker login ghcr.io -u yngwizop --password-stdin
```

### "denied: permission_denied"
- Token hat falsche Scopes
- Neuen Token mit `write:packages` erstellen

### Images werden auf GitHub nicht angezeigt
- Warte 1-2 Minuten nach Push
- Browser-Cache leeren (Strg+F5)

### Build dauert zu lange
```bash
# Docker BuildKit nutzen (schneller)
export DOCKER_BUILDKIT=1
docker build ...
```

### Image-Größe reduzieren
```bash
# Multi-stage Builds bereits implementiert ✅
# Weitere Optimierung: .dockerignore Files prüfen
```

---

## 💡 Best Practices

### Token-Sicherheit
- ❌ **Nie** in Code committen
- ❌ **Nie** öffentlich teilen
- ✅ Als Environment Variable speichern
- ✅ Regelmäßig rotieren (alle 6-12 Monate)

### Versionierung
```bash
# Semantic Versioning nutzen
v1.0.0  # Major.Minor.Patch
v1.1.0  # Feature
v1.1.1  # Bugfix
v2.0.0  # Breaking Change
```

### Image-Tags
- `latest` - Immer neueste Version (entwicklung)
- `1.0.0` - Fixe Version (production)
- `1.0` - Minor-Version-Tracking
- `1` - Major-Version-Tracking

### Automatisierung (Optional)
Erstelle `.github/workflows/build-and-push.yml` für automatisches Bauen bei Git-Push.

---

## ✅ Fertig!

Deine ServiceDock-App ist jetzt production-ready auf GHCR! 🎉

**Nutzer installieren mit einem Befehl:**
```bash
curl -sSL https://raw.githubusercontent.com/yngwizop/servicedock/main/setup-servicedock.sh | bash
```

**Deine Images:**
- https://github.com/yngwizop/servicedock/pkgs/container/servicedock-backend
- https://github.com/yngwizop/servicedock/pkgs/container/servicedock-frontend
- https://github.com/yngwizop/servicedock/pkgs/container/servicedock-nginx

---

## 📚 Weitere Ressourcen

- [QUICKSTART.md](QUICKSTART.md) - Nutzer-Installationsanleitung
- [BUILD_AND_PUBLISH.md](BUILD_AND_PUBLISH.md) - Detaillierte Build-Anleitung
- [GitHub GHCR Docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
