#!/bin/bash

# Self-Signed SSL Certificate Generator für servicedock
# Erstellt ein lokales SSL-Zertifikat für HTTPS im Heimnetzwerk

set -e

echo "🔐 Erstelle Self-Signed SSL Zertifikat für servicedock..."
echo ""

# Hole die lokale IP-Adresse
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo "📡 Erkannte lokale IP: $LOCAL_IP"
echo ""

# Erstelle SSL-Verzeichnis falls nicht vorhanden
mkdir -p nginx/ssl

# Generiere Self-Signed Zertifikat
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/CN=$LOCAL_IP" \
  -addext "subjectAltName=IP:$LOCAL_IP,IP:127.0.0.1,DNS:localhost"

echo ""
echo "✅ Zertifikat erstellt!"
echo ""
echo "📋 Zertifikat-Details:"
echo "   Datei: nginx/ssl/cert.pem"
echo "   Key:   nginx/ssl/key.pem"
echo "   Gültig für: $LOCAL_IP, 127.0.0.1, localhost"
echo "   Gültigkeitsdauer: 365 Tage"
echo ""
echo "⚠️  WICHTIG:"
echo "   - Dies ist ein Self-Signed Zertifikat"
echo "   - Dein Browser wird eine Warnung anzeigen"
echo "   - Klicke auf 'Erweitert' → 'Trotzdem fortfahren'"
echo "   - Das ist normal und sicher für lokale Nutzung!"
echo ""
echo "🔒 Setze richtige Berechtigungen..."
chmod 644 nginx/ssl/cert.pem
chmod 600 nginx/ssl/key.pem

echo ""
echo "🎯 Nächste Schritte:"
echo "   1. Starte das Dashboard: docker compose up -d"
echo "   2. Öffne im Browser: https://$LOCAL_IP"
echo "   3. Akzeptiere die Zertifikats-Warnung"
echo ""
echo "🎵 Für Spotify OAuth:"
echo "   Füge in Spotify Developer Dashboard hinzu:"
echo "   https://$LOCAL_IP/api/spotify/callback"
echo ""
echo "✨ Fertig!"
