#!/bin/bash

# ========================================
# Web Dashboard - Security Setup Script
# ========================================
# Erstellt automatisch sichere Secrets für .env

set -e

echo "🔐 Web Dashboard - Security Setup"
echo "=================================="
echo ""

# Prüfe ob .env bereits existiert
if [ -f .env ]; then
    echo "⚠️  .env existiert bereits!"
    read -p "Überschreiben? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Abgebrochen"
        exit 1
    fi
fi

# Erstelle .env aus Template
if [ -f .env.template ]; then
    cp .env.template .env
    echo "✓ .env aus Template erstellt"
else
    echo "❌ .env.template nicht gefunden!"
    exit 1
fi

echo ""
echo "🔑 Generiere sichere Keys..."
echo ""

# Generiere ENCRYPTION_KEY
echo "Generiere ENCRYPTION_KEY..."
ENCRYPTION_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" 2>/dev/null)

if [ -z "$ENCRYPTION_KEY" ]; then
    echo "❌ Fehler: Python3 oder cryptography nicht installiert!"
    echo "   Installiere mit: pip3 install cryptography"
    exit 1
fi

# Generiere JWT_SECRET_KEY
echo "Generiere JWT_SECRET_KEY..."
JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null)

if [ -z "$JWT_SECRET_KEY" ]; then
    echo "❌ Fehler: Python3 nicht gefunden!"
    exit 1
fi

# Setze Keys in .env
sed -i "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$ENCRYPTION_KEY|" .env
sed -i "s|^JWT_SECRET_KEY=.*|JWT_SECRET_KEY=$JWT_SECRET_KEY|" .env

echo ""
echo "✅ Keys generiert und in .env gespeichert"
echo ""

# Interaktive Konfiguration
echo "📝 Weitere Konfiguration"
echo "========================"
echo ""

# Admin-Passwort
read -sp "Admin-Passwort eingeben (min. 8 Zeichen): " ADMIN_PASSWORD
echo
if [ ${#ADMIN_PASSWORD} -lt 8 ]; then
    echo "⚠️  Passwort zu kurz! Verwende mindestens 8 Zeichen."
    exit 1
fi
sed -i "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$ADMIN_PASSWORD|" .env

# Datenbank-Passwort
read -sp "Datenbank-Passwort eingeben: " DB_PASSWORD
echo
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$DB_PASSWORD|" .env

# Frontend-URL
echo ""
read -p "Frontend-URL (Enter für http://localhost:3000): " FRONTEND_URL
FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}
sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=$FRONTEND_URL|" .env

# Environment
echo ""
echo "Environment auswählen:"
echo "  1) development (empfohlen für lokale Tests)"
echo "  2) production"
read -p "Auswahl (1/2): " ENV_CHOICE

if [ "$ENV_CHOICE" = "2" ]; then
    sed -i "s|^ENVIRONMENT=.*|ENVIRONMENT=production|" .env
    echo "✓ Environment: production"
else
    sed -i "s|^ENVIRONMENT=.*|ENVIRONMENT=development|" .env
    echo "✓ Environment: development"
fi

echo ""
echo "=================================="
echo "✅ Setup abgeschlossen!"
echo "=================================="
echo ""
echo "📋 Generierte Secrets:"
echo "   - ENCRYPTION_KEY: ✓ (gesetzt)"
echo "   - JWT_SECRET_KEY: ✓ (gesetzt)"
echo "   - ADMIN_PASSWORD: ✓ (gesetzt)"
echo "   - DB_PASSWORD:    ✓ (gesetzt)"
echo ""
echo "⚠️  WICHTIG:"
echo "   - Speichere die .env Datei SICHER!"
echo "   - ENCRYPTION_KEY NIEMALS ändern!"
echo "   - .env NIEMALS in Git committen!"
echo ""
echo "🚀 Nächste Schritte:"
echo "   1. docker-compose build"
echo "   2. docker-compose up -d"
echo "   3. http://localhost:3000 im Browser öffnen"
echo ""
echo "📖 Dokumentation:"
echo "   - SECURITY_IMPLEMENTATION.md"
echo "   - README.md"
echo ""
