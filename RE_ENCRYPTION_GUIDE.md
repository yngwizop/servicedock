# Token Re-Encryption Guide

## 🔐 Wann ist Re-Encryption notwendig?

Wenn du dein **ADMIN_PASSWORD** änderst, werden die verschlüsselten Proxmox-Tokens unbrauchbar, da der Encryption Key vom Passwort abgeleitet wird.

## ⚠️ Symptome nach Passwort-Änderung

- ❌ Proxmox Monitoring zeigt keine VMs/Container mehr
- ❌ Backend-Log: `Decryption error: InvalidToken`
- ❌ 401 Unauthorized bei Proxmox-Zugriff
- ❌ Dashboard lädt, aber Proxmox-Tab ist leer

## 🛠️ Lösung: Re-Encryption Script

### Voraussetzungen

- Du kennst das **alte** ADMIN_PASSWORD
- Du kennst das **neue** ADMIN_PASSWORD
- Backend-Container läuft

### Schritt-für-Schritt Anleitung

#### 1. Backup erstellen (WICHTIG!)

```bash
# Datenbank-Backup
docker compose exec db pg_dump -U user dashboard > backup_$(date +%Y%m%d_%H%M%S).sql

# Erfolgreich wenn:
# - Datei backup_*.sql wurde erstellt
# - Datei ist > 0 Bytes
ls -lh backup_*.sql
```

#### 2. Re-Encryption Script ausführen

```bash
# Script starten (interaktiv)
docker compose exec backend python3 /app/re_encrypt_tokens.py
```

**Das Script fragt nach:**

```
Altes ADMIN_PASSWORD: ************
Neues ADMIN_PASSWORD: ************
Neues ADMIN_PASSWORD bestätigen: ************
```

**Erwartete Ausgabe bei Erfolg:**

```
🔐 Token Re-Encryption Script
==================================================
📋 Config ID: 1
📦 Verschlüsselter Token (alt): gAAAAABpC5U8QaM4cN7HQclpfWN...
✅ Entschlüsselung mit altem Passwort erfolgreich
🔓 Token: 050722a3-7...a3-7fa25290
✅ Verschlüsselung mit neuem Passwort erfolgreich
🔒 Neuer Token: gAAAAABpC6X9RmB7dE9fGdKlmYO...
✅ Token erfolgreich re-encrypted!
✅ Verifikation erfolgreich!
🎉 Token kann jetzt mit neuem ADMIN_PASSWORD entschlüsselt werden
```

#### 3. docker-compose.yml anpassen

```yaml
services:
  backend:
    environment:
      - ADMIN_PASSWORD=dein-neues-passwort  # ← HIER ÄNDERN
```

**Oder via .env Datei:**

```bash
# .env
ADMIN_PASSWORD=dein-neues-passwort
```

#### 4. Backend neu starten

```bash
docker compose restart backend
```

#### 5. Testen

```bash
# Test 1: Proxmox Config abrufen
curl http://localhost:8000/api/proxmox/config

# Sollte zeigen:
# {
#   "configured": true,
#   "token_name": "lxc-creator@pve!***",
#   ...
# }

# Test 2: VMs abrufen
curl http://localhost:8000/api/proxmox/vms

# Sollte VMs/Container auflisten

# Test 3: Im Browser
# - Dashboard öffnen
# - Admin-Login
# - Proxmox Monitoring Tab → VMs sollten sichtbar sein
```

## 🐛 Troubleshooting

### Problem: "Entschlüsselung fehlgeschlagen"

**Fehler:**
```
❌ Entschlüsselung fehlgeschlagen: InvalidToken
💡 Tipp: Überprüfe ob das alte Passwort korrekt ist!
```

**Ursache:**
- Altes Passwort ist falsch
- Token wurde bereits re-encrypted
- Token wurde manuell geändert

**Lösung:**
1. Überprüfe das alte Passwort nochmal
2. Prüfe docker-compose.yml welches Passwort aktuell gesetzt ist
3. Falls unklar: Neuen Token in Proxmox erstellen und im Dashboard speichern

### Problem: "Datenbank nicht erreichbar"

**Fehler:**
```
❌ Datenbankfehler: could not connect to server
```

**Lösung:**
```bash
# Prüfe ob DB-Container läuft
docker compose ps

# Starte DB falls nötig
docker compose up -d db

# Warte 5 Sekunden und versuche es nochmal
```

### Problem: "Keine Proxmox-Konfiguration gefunden"

**Fehler:**
```
❌ Keine Proxmox-Konfiguration gefunden!
```

**Ursache:**
- Proxmox wurde noch nie konfiguriert
- Datenbank-Tabelle fehlt

**Lösung:**
```bash
# Proxmox-Config in Dashboard einrichten
# Settings → Proxmox Tab → Konfiguration speichern
```

## 🔄 Alternative: Neuer Token

Falls Re-Encryption nicht funktioniert, kannst du einfach einen **neuen Token** erstellen:

### Schritt 1: Neuen Token in Proxmox erstellen

1. Proxmox Web-UI öffnen: `https://192.168.178.45:8006`
2. **Datacenter** → **Permissions** → **API Tokens**
3. **Add** klicken
4. User: `lxc-creator@pve` (oder dein User)
5. Token ID: `dashboard-2025-11` (z.B. mit Datum)
6. **Generate** klicken
7. **Token Secret kopieren** (wird nur 1x angezeigt!)

### Schritt 2: Im Dashboard speichern

1. Dashboard öffnen: `http://localhost:3000`
2. **Admin-Login** (mit neuem Passwort)
3. **Settings** öffnen (⚙️ Icon)
4. **Proxmox** Tab auswählen
5. **Token Name** eingeben: `lxc-creator@pve!dashboard-2025-11`
6. **Token Value** eingeben: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
7. **Speichern** klicken

Der neue Token wird automatisch mit dem **neuen ADMIN_PASSWORD** verschlüsselt!

### Schritt 3: Alten Token in Proxmox löschen

1. Proxmox: **Datacenter** → **Permissions** → **API Tokens**
2. Alten Token auswählen
3. **Remove** klicken

## 📊 Verifikation

Nach erfolgreicher Re-Encryption oder Token-Neuerstellung:

```bash
# 1. Prüfe Verschlüsselung in DB
docker compose exec -T db psql -U user -d dashboard -c \
  "SELECT LEFT(token_value, 20) as prefix, LENGTH(token_value) as length FROM proxmox_config WHERE id = 1;"

# Sollte zeigen:
#      prefix      | length
# ------------------+--------
#  gAAAAABpC6X9RmB7 |    140

# 2. Prüfe Backend-Logs
docker compose logs backend --tail 30

# Sollte KEINE "Decryption error" zeigen

# 3. Teste Proxmox API
curl http://localhost:8000/api/proxmox/vms

# Sollte VMs/Container zurückgeben
```

## ⚙️ Automatisierung (Optional)

Für regelmäßige Passwort-Rotationen kannst du ein Wrapper-Script erstellen:

```bash
#!/bin/bash
# change_admin_password.sh

OLD_PASSWORD="$1"
NEW_PASSWORD="$2"

echo "1. Re-Encryption..."
echo -e "$OLD_PASSWORD\n$NEW_PASSWORD\n$NEW_PASSWORD" | \
  docker compose exec -T backend python3 /app/re_encrypt_tokens.py

echo "2. Update docker-compose.yml..."
sed -i "s/ADMIN_PASSWORD=.*/ADMIN_PASSWORD=$NEW_PASSWORD/" docker-compose.yml

echo "3. Restart backend..."
docker compose restart backend

echo "✅ Passwort erfolgreich geändert!"
```

**Verwendung:**
```bash
chmod +x change_admin_password.sh
./change_admin_password.sh "altes-passwort" "neues-passwort"
```

## 🔒 Sicherheits-Best-Practices

1. **Backup vor Re-Encryption**
   - Immer DB-Backup erstellen
   - Backup an sicherem Ort speichern

2. **Passwort-Komplexität**
   - Min. 12 Zeichen
   - Groß-/Kleinbuchstaben, Zahlen, Sonderzeichen
   - Keine Wörter aus Wörterbuch

3. **Passwort-Rotation**
   - Empfohlen: Alle 90 Tage
   - Bei Sicherheitsvorfall: Sofort

4. **Token-Rotation**
   - Empfohlen: Alle 60 Tage
   - Nach Re-Encryption: Token-Alter prüfen

5. **Logs überwachen**
   - Regelmäßig Backend-Logs prüfen
   - Auf "Decryption error" achten

## 📚 Weiterführende Links

- [TOKEN_ROTATION_GUIDE.md](TOKEN_ROTATION_GUIDE.md) - Token-Rotation
- [SECURITY_FEATURES.md](SECURITY_FEATURES.md) - Alle Security-Features
- [Fernet Encryption](https://cryptography.io/en/latest/fernet/) - Technische Details

---

**Made with 🔐 for secure homelab setups**
