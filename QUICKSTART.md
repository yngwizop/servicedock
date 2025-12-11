# 🚀 ServiceDock - Quickstart Guide

## Voraussetzungen
- Docker & Docker Compose installiert
- Python 3 (für Key-Generierung)

## Installation (5 Minuten)

### 1. Setup-Script herunterladen und ausführen
```bash
# Download Setup-Script
curl -o setup-servicedock.sh https://raw.githubusercontent.com/yngwizop/servicedock/main/setup-servicedock.sh
chmod +x setup-servicedock.sh

# Automatische Installation
./setup-servicedock.sh
```

**ODER Manuelle Installation:**

### 1. Arbeitsverzeichnis erstellen
```bash
mkdir servicedock && cd servicedock
```

### 2. Docker Compose File herunterladen
```bash
curl -o docker-compose.yml https://raw.githubusercontent.com/yngwizop/servicedock/main/docker-compose.production.yml
```

### 3. Environment File erstellen
```bash
curl -o .env.example https://raw.githubusercontent.com/yngwizop/servicedock/main/.env.example
cp .env.example .env
```

### 4. SSL-Zertifikate generieren

**PostgreSQL SSL:**
```bash
mkdir -p db-ssl
openssl req -new -x509 -days 365 -nodes -text \
  -out db-ssl/server.crt \
  -keyout db-ssl/server.key \
  -subj "/CN=postgres"
chmod 600 db-ssl/server.key
```

**Nginx SSL:**
```bash
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/server.key \
  -out ssl/server.crt \
  -subj "/C=DE/ST=State/L=City/O=Organization/CN=localhost"
```

### 5. init.sql herunterladen
```bash
curl -o db-init.sql https://raw.githubusercontent.com/yngwizop/servicedock/main/db/init.sql
```

### 6. Sicherheits-Keys generieren

**ENCRYPTION_KEY:**
```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

**JWT_SECRET_KEY:**
```bash
openssl rand -hex 32
```

### 7. .env Datei ausfüllen
Öffne `.env` und trage ein:
- `POSTGRES_PASSWORD` (z.B. starkes Passwort)
- `ADMIN_PASSWORD` (für Admin-Login)
- `ENCRYPTION_KEY` (aus Schritt 6)
- `JWT_SECRET_KEY` (aus Schritt 6)
- `FRONTEND_URL` (z.B. `https://10.10.10.50`)
- `DATABASE_URL` mit dem POSTGRES_PASSWORD

### 8. Starten
```bash
docker compose up -d
```

### 9. Zugriff
- Browser: `https://localhost` oder `https://YOUR_IP`
- Login: `admin` / dein ADMIN_PASSWORD

## 📦 Verzeichnisstruktur
```
servicedock/
├── docker-compose.yml    # Haupt-Config
├── .env                  # Deine Secrets
├── db-init.sql          # DB Schema
├── ssl/                 # Nginx SSL Certs
│   ├── server.crt
│   └── server.key
└── db-ssl/              # PostgreSQL SSL Certs
    ├── server.crt
    └── server.key
```

## 🔄 Updates
```bash
docker compose pull
docker compose up -d
```

## 🛑 Stoppen/Starten
```bash
# Stoppen
docker compose down

# Starten
docker compose up -d

# Logs anzeigen
docker compose logs -f
```

## 🗑️ Komplett Löschen (inkl. Daten!)
```bash
docker compose down -v
rm -rf servicedock/
```

## 📚 Vollständige Dokumentation
Siehe: https://github.com/yngwizop/servicedock
