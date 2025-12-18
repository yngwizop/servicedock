#!/bin/bash
# ServiceDock Automated Setup Script
# Lädt alle nötigen Dateien und richtet alles automatisch ein

set -e

echo "🚀 ServiceDock Setup wird gestartet..."
echo ""

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker ist nicht installiert!${NC}"
    echo "Installiere Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose ist nicht installiert!${NC}"
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 ist nicht installiert!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker und Python gefunden${NC}"
echo ""

# Arbeitsverzeichnis erstellen
INSTALL_DIR="servicedock"
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}⚠️  Verzeichnis $INSTALL_DIR existiert bereits${NC}"
    read -p "Möchtest du es überschreiben? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    rm -rf "$INSTALL_DIR"
fi

mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

echo "📁 Erstelle Verzeichnisstruktur..."

# Version festlegen
VERSION="v1.0.0"
GITHUB_REPO="yngwizop/servicedock"
RELEASE_URL="https://github.com/${GITHUB_REPO}/releases/download/${VERSION}"

# Check ob Images private oder public sind
echo "🔐 Prüfe GHCR Zugriff..."
if ! docker pull ghcr.io/yngwizop/servicedock-frontend:latest &>/dev/null; then
    echo -e "${YELLOW}⚠️  Images sind private - Docker Login erforderlich${NC}"
    echo "Erstelle einen GitHub Token mit 'read:packages' Scope:"
    echo "https://github.com/settings/tokens"
    echo ""
    read -p "GitHub Username (yngwizop): " GH_USER
    GH_USER=${GH_USER:-yngwizop}
    read -sp "GitHub Token: " GH_TOKEN
    echo ""
    echo "$GH_TOKEN" | docker login ghcr.io -u "$GH_USER" --password-stdin
    echo ""
fi

# Docker Compose herunterladen
echo "📦 Lade Docker Compose Konfiguration..."
curl -sS -L -o docker-compose.yml "${RELEASE_URL}/docker-compose.production.yml"

# .env Vorlage herunterladen (mit Fallback falls nicht verfügbar)
echo "🔧 Erstelle Environment Template..."
cat > .env.template << 'ENVTEMPLATE'
# ========================================
# ServiceDock - Environment Configuration
# ========================================
# WICHTIG: Kopiere diese Datei zu ".env" und passe die Werte an!

# ADMIN-ZUGANGSDATEN (PFLICHTFELD!)
ADMIN_PASSWORD=dein-sicheres-passwort-hier

# DATENBANK
POSTGRES_USER=servicedock
POSTGRES_PASSWORD=dein-db-passwort-hier
POSTGRES_DB=servicedock
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?sslmode=require

# VERSCHLÜSSELUNG (PFLICHTFELD!)
# Generieren: python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY=your-secure-encryption-key-here

# JWT AUTHENTIFIZIERUNG (PFLICHTFELD!)
# Generieren: openssl rand -hex 32
JWT_SECRET_KEY=your-jwt-secret-key-here

# FRONTEND-URL (für CORS)
FRONTEND_URL=https://192.168.178.11

# ENVIRONMENT
ENVIRONMENT=production

# TOKEN CONFIGURATION
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# RATE-LIMITING
MAX_FAILED_LOGIN_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=15
ENVTEMPLATE

# init.sql erstellen (vollständiges Schema)
echo "🗄️  Erstelle Datenbank Schema..."
cat > db-init.sql << 'INITSQL'
-- ServiceDock Database Schema

CREATE TABLE IF NOT EXISTS shortcuts (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT,
    position INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    icon TEXT,
    position INT DEFAULT 0,
    is_favorite BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS appearance (
    id INT PRIMARY KEY DEFAULT 1,
    bg_color VARCHAR(20) DEFAULT '#4e575f',
    bg_image_url TEXT,
    bg_opacity NUMERIC(3, 2) DEFAULT 1.0,
    shortcut_cols INT DEFAULT 6,
    service_cols INT DEFAULT 6,
    text_color_light VARCHAR(20) DEFAULT '#1f2937',
    text_color_dark VARCHAR(20) DEFAULT '#e5e7eb',
    clock_format VARCHAR(3) DEFAULT '24h',
    weather_city VARCHAR(100) DEFAULT 'Berlin',
    weather_fields JSONB DEFAULT '["temperature", "humidity"]',
    show_spotify BOOLEAN DEFAULT TRUE,
    show_weather BOOLEAN DEFAULT TRUE,
    show_clock BOOLEAN DEFAULT TRUE,
    CONSTRAINT appearance_single_row CHECK (id = 1),
    CONSTRAINT appearance_opacity_range CHECK (bg_opacity >= 0 AND bg_opacity <= 1),
    CONSTRAINT appearance_clock_format_valid CHECK (clock_format IN ('12h', '24h')),
    CONSTRAINT appearance_cols_range CHECK (shortcut_cols >= 1 AND shortcut_cols <= 12 AND service_cols >= 1 AND service_cols <= 12)
);

CREATE INDEX IF NOT EXISTS idx_services_position ON services(position);
CREATE INDEX IF NOT EXISTS idx_shortcuts_position ON shortcuts(position);

CREATE TABLE IF NOT EXISTS proxmox_config (
    id SERIAL PRIMARY KEY,
    host VARCHAR(255) NOT NULL,
    port INT DEFAULT 8006,
    token_name VARCHAR(255) NOT NULL,
    token_value TEXT NOT NULL,
    verify_ssl BOOLEAN DEFAULT FALSE,
    node VARCHAR(100),
    token_created_at TIMESTAMP DEFAULT NOW(),
    token_last_rotated TIMESTAMP,
    dashboard_id INT DEFAULT 1,
    UNIQUE(dashboard_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    user_type VARCHAR(50),
    ip_address VARCHAR(45),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    status VARCHAR(20),
    details TEXT,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_ip ON audit_log(ip_address);

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

CREATE TABLE IF NOT EXISTS dashboards (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'dashboard',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE services ADD COLUMN IF NOT EXISTS dashboard_id INT DEFAULT 1 REFERENCES dashboards(id) ON DELETE CASCADE;
ALTER TABLE shortcuts ADD COLUMN IF NOT EXISTS dashboard_id INT DEFAULT 1 REFERENCES dashboards(id) ON DELETE CASCADE;
ALTER TABLE proxmox_config ADD COLUMN IF NOT EXISTS dashboard_id INT DEFAULT 1 REFERENCES dashboards(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_services_dashboard ON services(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_shortcuts_dashboard ON shortcuts(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_proxmox_dashboard ON proxmox_config(dashboard_id);

INSERT INTO dashboards (id, name, description, type, is_active)
VALUES (1, 'Main Dashboard', 'Default Dashboard', 'dashboard', TRUE)
ON CONFLICT (id) DO NOTHING;

SELECT setval('dashboards_id_seq', (SELECT COALESCE(MAX(id), 1) FROM dashboards), true);

INSERT INTO appearance (id, bg_color, bg_image_url, bg_opacity, shortcut_cols, service_cols, text_color_light, text_color_dark, clock_format, weather_city, weather_fields, show_spotify, show_weather, show_clock)
VALUES (1, '#4e575f', NULL, 1.0, 6, 6, '#1f2937', '#e5e7eb', '24h', 'Berlin', '["temperature", "humidity"]'::jsonb, TRUE, TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO services (name, description, url, icon, position) VALUES
('Mein Mail', 'Postfach checken', 'https://mail.google.com', '✉️', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO shortcuts (name, url, icon, position) VALUES
('Google', 'https://google.com', 'https://cdn.jsdelivr.net/gh/selfhst/icons/svg/google.svg', 1)
ON CONFLICT (id) DO NOTHING;
INITSQL

# SSL Verzeichnisse erstellen
mkdir -p ssl db-ssl

# PostgreSQL SSL generieren
echo "🔐 Generiere PostgreSQL SSL-Zertifikate..."
openssl req -new -x509 -days 365 -nodes -text \
  -out db-ssl/server.crt \
  -keyout db-ssl/server.key \
  -subj "/CN=postgres" 2>/dev/null
chmod 600 db-ssl/server.key

# Nginx SSL generieren
echo "🔐 Generiere Nginx SSL-Zertifikate..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/server.key \
  -out ssl/server.crt \
  -subj "/C=DE/ST=State/L=City/O=ServiceDock/CN=localhost" 2>/dev/null

# Keys generieren
echo "🔑 Generiere Sicherheits-Keys..."
ENCRYPTION_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
JWT_SECRET_KEY=$(openssl rand -hex 32)

# Passwörter abfragen
echo ""
echo -e "${YELLOW}Bitte gib die folgenden Passwörter ein:${NC}"
echo ""

read -sp "Admin-Passwort (für Login): " ADMIN_PASSWORD
echo ""

read -sp "Datenbank-Passwort: " DB_PASSWORD
echo ""
echo ""

# IP-Adresse ermitteln
IP_ADDRESS=$(hostname -I | awk '{print $1}')
echo -e "${YELLOW}Erkannte IP-Adresse: $IP_ADDRESS${NC}"
read -p "Möchtest du eine andere IP/Domain nutzen? (Enter für $IP_ADDRESS): " CUSTOM_IP
FRONTEND_URL=${CUSTOM_IP:-https://$IP_ADDRESS}

# .env erstellen
echo "📝 Erstelle .env Datei..."
cat > .env <<EOF
# ServiceDock Environment Configuration
# Generiert am $(date)

# Database Configuration
DATABASE_URL=postgresql://servicedock:${DB_PASSWORD}@db:5432/servicedock?sslmode=require
POSTGRES_USER=servicedock
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=servicedock

# Admin Configuration
ADMIN_PASSWORD=${ADMIN_PASSWORD}

# Encryption & Security Keys
ENCRYPTION_KEY=${ENCRYPTION_KEY}
JWT_SECRET_KEY=${JWT_SECRET_KEY}

# Frontend URL
FRONTEND_URL=${FRONTEND_URL}

# Environment
ENVIRONMENT=production

# Token Configuration
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Security Configuration
MAX_FAILED_LOGIN_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=15
EOF

chmod 600 .env

echo ""
echo -e "${GREEN}✅ Setup abgeschlossen!${NC}"
echo ""
echo "📦 Docker Images werden heruntergeladen und gestartet..."
echo ""

# Docker Images pullen und starten
docker compose pull
docker compose up -d

echo ""
echo -e "${GREEN}🎉 ServiceDock läuft!${NC}"
echo ""
echo "🌐 Zugriff:"
echo "   Browser: ${FRONTEND_URL}"
echo "   Login: admin / [dein Passwort]"
echo ""
echo "📊 Status prüfen:"
echo "   docker compose logs -f"
echo ""
echo "🛑 Stoppen:"
echo "   docker compose down"
echo ""
echo "📚 Vollständige Dokumentation:"
echo "   https://github.com/yngwizop/servicedock"
echo ""
