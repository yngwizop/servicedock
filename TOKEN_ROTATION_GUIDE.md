# Proxmox API Token Rotation Guide

Dieses Dokument beschreibt den kompletten Prozess der Proxmox API Token-Erneuerung und -Überprüfung.

## 📋 Inhaltsverzeichnis

1. [Warum Token rotieren?](#warum-token-rotieren)
2. [Wann rotieren?](#wann-rotieren)
3. [Schritt-für-Schritt Anleitung](#schritt-für-schritt-anleitung)
4. [Backend-Überprüfung](#backend-überprüfung)
5. [Troubleshooting](#troubleshooting)

---

## 🔐 Warum Token rotieren?

**Sicherheits-Best-Practice:**
- Token sollten regelmäßig erneuert werden (empfohlen: alle **60 Tage**)
- Reduziert das Risiko bei Kompromittierung
- Entspricht modernen Security-Standards

**Änderung:** Vorher waren 90 Tage empfohlen, jetzt **60 Tage** für erhöhte Sicherheit.

**Wann sollte sofort rotiert werden:**
- ⚠️ Token wurde versehentlich exponiert (z.B. in Logs, Git)
- ⚠️ Sicherheitsvorfall im Netzwerk
- ⚠️ Verdacht auf unbefugten Zugriff
- ⚠️ Nach Mitarbeiter-Wechsel (wenn Token geteilt wurde)

---

## 📅 Wann rotieren?

### Automatische Warnung

Das Dashboard zeigt eine **rote Warnung** im Security-Tab, wenn der Token älter als **60 Tage** ist:

```
┌─────────────────────────────────┐
│ 🔴 Token Rotation          ⚠️   │
│                                 │
│ Token Alter: 65 Tage            │
│ Erstellt am: 01.09.2025, 14:30  │
│                                 │
│ ⚠️ Rotation empfohlen (>60 Tage)│
└─────────────────────────────────┘
```

### Manuell prüfen

```bash
# Token-Alter prüfen
curl -s http://localhost:8000/api/admin/proxmox/token-info | jq .

# Ausgabe:
{
  "configured": true,
  "token_name": "lxc-creator@pve!dashboard",
  "created_at": "2025-09-01T14:30:00",
  "last_rotated": null,
  "age_days": 65,
  "rotation_recommended": true  # <- Rotation nötig!
}
```

---

## 📝 Schritt-für-Schritt Anleitung

### Schritt 1: Neuen Token in Proxmox erstellen

1. **Proxmox Web-UI öffnen**
   ```
   https://192.168.178.45:8006
   ```

2. **Navigiere zu API Tokens**
   ```
   Datacenter → Permissions → API Tokens
   ```

3. **Neuen Token erstellen**
   - Klicke auf **"Add"**
   - **User**: `lxc-creator@pve` (oder dein bestehender User)
   - **Token ID**: `dashboard-2025-11` (mit Datum für bessere Übersicht)
   - **Privilege Separation**: ☐ **NICHT** angehakt (Token soll gleiche Rechte wie User haben)
   - Klicke auf **"Add"**

4. **Token-Secret kopieren**
   ```
   ⚠️ WICHTIG: Das Secret wird nur 1x angezeigt!
   
   Token: lxc-creator@pve!dashboard-2025-11
   Secret: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   
   → Secret SOFORT kopieren und sicher speichern!
   ```

5. **Screenshot als Backup** (optional aber empfohlen)

---

### Schritt 2: Token im Dashboard aktualisieren

#### Option A: Via Web-UI (Empfohlen)

1. **Dashboard öffnen**
   ```
   http://192.168.178.83:3000
   ```

2. **Als Admin einloggen**
   - Klicke auf das Schloss-Icon (unten rechts)
   - Gib dein Admin-Passwort ein

3. **Settings öffnen**
   - Klicke auf das Zahnrad-Icon (unten rechts)

4. **Proxmox-Tab auswählen**
   - Klicke auf "Proxmox" in der Tab-Navigation

5. **Token aktualisieren**
   ```
   Host:        192.168.178.45  (unverändert)
   Port:        8006             (unverändert)
   Token Name:  lxc-creator@pve!dashboard-2025-11  ← NEU!
   Token Value: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  ← NEU!
   Verify SSL:  ☐ (unverändert)
   Node:        Proxmox1         (optional)
   ```

   **⚠️ Wichtig:** 
   - Das Token Value-Feld ist leer (aus Sicherheitsgründen)
   - Du **MUSST** den neuen Token-Wert eingeben
   - Nach dem Speichern verschwindet der Token-Wert wieder (normal!)

6. **Speichern**
   - Klicke auf **"Proxmox-Konfiguration speichern"**
   - Warte auf Bestätigung: "✅ Gespeichert!"
   - `token_created_at` wird automatisch auf NOW() gesetzt

#### Option B: Via API (für Automatisierung)

```bash
curl -X POST http://localhost:8000/api/admin/proxmox/rotate-token \
  -H "Content-Type: application/json" \
  -d '{
    "new_token_value": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "new_token_name": "lxc-creator@pve!dashboard-2025-11"
  }'

# Erwartete Antwort:
{
  "success": true,
  "message": "Token erfolgreich rotiert",
  "old_age_days": 65,
  "new_created_at": "2025-11-05T18:45:00"
}
```

---

### Schritt 3: Verbindung testen

1. **Proxmox Monitoring Tab öffnen**
   - Wechsle zum Tab "Proxmox Monitoring"
   - Dashboard sollte alle VMs/Container anzeigen

2. **Manuell testen (optional)**
   ```bash
   # VMs abrufen
   curl -s http://localhost:8000/api/proxmox/vms | jq '.resources | length'
   
   # Erwartete Ausgabe: Anzahl der VMs (z.B. 38)
   ```

3. **Bei Fehlern:**
   ```bash
   # Backend-Logs prüfen
   docker compose logs backend --tail 50
   
   # Häufige Fehler:
   # - "401 Unauthorized" → Token falsch/ungültig
   # - "Connection refused" → Host/Port falsch
   # - "SSL Error" → verify_ssl Einstellung prüfen
   ```

---

### Schritt 4: Alten Token in Proxmox löschen

**⚠️ WICHTIG: Erst löschen NACHDEM neuer Token funktioniert!**

1. **Proxmox Web-UI**
   ```
   Datacenter → Permissions → API Tokens
   ```

2. **Alten Token finden**
   - Suche nach: `lxc-creator@pve!dashboard` (alter Token)

3. **Token löschen**
   - Token auswählen
   - Klicke auf **"Remove"**
   - Bestätige mit **"Yes"**

4. **Verifizieren**
   - Alter Token sollte nicht mehr in der Liste sein
   - Dashboard sollte weiterhin funktionieren

---

## 🔍 Backend-Überprüfung

### 1. Token-Verschlüsselung prüfen

**Prüfe ob Token in Datenbank verschlüsselt ist:**

```bash
docker compose exec -T db psql -U user -d dashboard -c \
  "SELECT id, token_name, LEFT(token_value, 50) as token_preview, LENGTH(token_value) as token_length FROM proxmox_config;"
```

**Erwartete Ausgabe:**
```
 id |        token_name              |                   token_preview                    | token_length 
----+--------------------------------+----------------------------------------------------+--------------
  1 | lxc-creator@pve!dashboard-2025 | gAAAAABpC5U8QaM4cN7HQclpfWN4AZdkdcZHnbxSKNZZVCjx8r |          140
```

**✅ Token ist verschlüsselt wenn:**
- Token beginnt mit `gAAAAAB` (Fernet-Header)
- Token-Länge ist ~140 Zeichen (verschlüsselt)
- **NICHT** das Original-Secret sichtbar ist

**❌ Token ist NICHT verschlüsselt wenn:**
- Token sieht aus wie UUID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- Token-Länge ist ~36 Zeichen
- → **PROBLEM: Encryption nicht aktiv!**

---

### 2. Vollständigen Token anzeigen (zu Debug-Zwecken)

```bash
docker compose exec -T db psql -U user -d dashboard -c \
  "SELECT token_value FROM proxmox_config WHERE id = 1;"
```

**Erwartete Ausgabe:**
```
gAAAAABpC5U8QaM4cN7HQclpfWN4AZdkdcZHnbxSKNZZVCjx8r-V-xvLJASx-ZZumkkAf1xWOCCiy93SCRBYZ3S6pOu7SzfHyu1fAWN0dt6wH0auFRbQzhBA11swHQSUpklgy5UX6swq
```

**Fernet-Token Anatomie:**
```
gAAAAAB pC5U8 QaM4cN7HQclpfWN...
│       │      │
│       │      └─ Encrypted Data (AES-128) + HMAC (SHA-256)
│       └──────── Timestamp (wann verschlüsselt)
└──────────────── Fernet Version Byte (0x80)
```

---

### 3. Encryption-Key prüfen

**Zeige den verwendeten Verschlüsselungsschlüssel:**

```bash
docker compose exec backend python3 -c "
import os
import hashlib
import base64

password = os.getenv('ADMIN_PASSWORD', 'admin')
key_bytes = password.encode('utf-8')
hash_digest = hashlib.sha256(key_bytes).digest()
encryption_key = base64.urlsafe_b64encode(hash_digest)

print('Encryption Key (first 20 chars):', encryption_key[:20].decode())
print('Derived from: ADMIN_PASSWORD environment variable')
print('Algorithm: SHA-256 → Base64 (Fernet-kompatibel)')
"
```

**Erwartete Ausgabe:**
```
Encryption Key (first 20 chars): 7NcYcNGWMxapfjrDQIyY
Derived from: ADMIN_PASSWORD environment variable
Algorithm: SHA-256 → Base64 (Fernet-kompatibel)
```

**Wichtig:**
- Encryption-Key wird aus `ADMIN_PASSWORD` abgeleitet
- Bei Passwort-Änderung müssen Tokens neu verschlüsselt werden!
- Key ist 44 Zeichen lang (Base64-encoded 32-Byte-Key)

---

### 4. Token-Entschlüsselung testen (Debug)

**⚠️ NUR zu Debug-Zwecken! Nicht in Produktion ausführen!**

```bash
docker compose exec backend python3 -c "
import os
import hashlib
import base64
from cryptography.fernet import Fernet
import psycopg2

# Get Encryption Key
password = os.getenv('ADMIN_PASSWORD', 'admin')
key_bytes = password.encode('utf-8')
hash_digest = hashlib.sha256(key_bytes).digest()
encryption_key = base64.urlsafe_b64encode(hash_digest)

# Get encrypted token from DB
conn = psycopg2.connect(
    host='db',
    database='dashboard',
    user='user',
    password='password'
)
cur = conn.cursor()
cur.execute('SELECT token_value FROM proxmox_config WHERE id = 1;')
encrypted_token = cur.fetchone()[0]

# Decrypt
cipher = Fernet(encryption_key)
decrypted = cipher.decrypt(encrypted_token.encode()).decode()

print('Decrypted Token (first 20 chars):', decrypted[:20])
print('Decrypted Token (last 10 chars):', decrypted[-10:])
print('Full length:', len(decrypted), 'characters')
print('Format looks like UUID:', '-' in decrypted and len(decrypted) == 36)
"
```

**Erwartete Ausgabe:**
```
Decrypted Token (first 20 chars): xxxxxxxx-xxxx-xxxx-x
Decrypted Token (last 10 chars): xxxxxxxxxx
Full length: 36 characters
Format looks like UUID: True
```

**✅ Entschlüsselung erfolgreich wenn:**
- Token hat UUID-Format (36 Zeichen mit Bindestrichen)
- Keine Fehler bei `cipher.decrypt()`

**❌ Fehler bei Entschlüsselung:**
```
cryptography.fernet.InvalidToken
→ Falscher Encryption-Key oder korrupte Daten
```

---

### 5. Token-Rotation-Historie prüfen

```bash
docker compose exec -T db psql -U user -d dashboard -c \
  "SELECT 
    token_name,
    token_created_at,
    token_last_rotated,
    EXTRACT(DAY FROM (NOW() - token_created_at)) as age_days
  FROM proxmox_config WHERE id = 1;"
```

**Erwartete Ausgabe:**
```
        token_name              |     token_created_at     | token_last_rotated | age_days 
--------------------------------+--------------------------+--------------------+----------
 lxc-creator@pve!dashboard-2025 | 2025-11-05 18:45:00      | NULL               |        0
```

**Nach Rotation:**
```
        token_name              |     token_created_at     |   token_last_rotated    | age_days 
--------------------------------+--------------------------+-------------------------+----------
 lxc-creator@pve!dashboard-2025 | 2025-11-05 18:45:00      | 2025-11-05 18:45:00     |        0
```

---

### 6. Audit-Log der Rotation prüfen

```bash
curl -s "http://localhost:8000/api/admin/audit-logs?limit=5" | jq '.logs[] | select(.action | contains("TOKEN"))'
```

**Erwartete Ausgabe:**
```json
{
  "id": 45,
  "timestamp": "2025-11-05T18:45:00",
  "user_type": "admin",
  "ip_address": "192.168.178.83",
  "action": "ROTATE_TOKEN",
  "resource_type": "proxmox_token",
  "status": "success",
  "details": {
    "old_token_age_days": 65,
    "new_token_name": "lxc-creator@pve!dashboard-2025-11"
  }
}
```

---

## 🔧 Troubleshooting

### Problem 1: "Token ist nicht verschlüsselt"

**Symptom:**
```sql
token_value: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  (Klartext!)
```

**Ursache:**
- Encryption wurde vor Token-Speicherung deaktiviert
- Alter Token vor Encryption-Feature

**Lösung:**
```bash
# Token manuell verschlüsseln
docker compose exec backend python3 /app/migrate_encrypt_tokens.py
```

---

### Problem 2: "InvalidToken beim Entschlüsseln"

**Symptom:**
```
cryptography.fernet.InvalidToken: 
```

**Ursache:**
- `ADMIN_PASSWORD` wurde geändert
- Token mit anderem Key verschlüsselt

**Lösung:**
```bash
# 1. Alten Token in Proxmox löschen
# 2. Neuen Token erstellen
# 3. Im Dashboard speichern (wird mit aktuellem Key verschlüsselt)
```

---

### Problem 3: "401 Unauthorized" bei Proxmox-Zugriff

**Symptom:**
```json
{
  "error": "401 Unauthorized"
}
```

**Ursache:**
- Token wurde in Proxmox gelöscht/deaktiviert
- Token-Name falsch formatiert
- User hat keine Berechtigung

**Lösung:**
```bash
# 1. Token-Format prüfen
curl -s http://localhost:8000/api/proxmox/config | jq .token_name
# Muss sein: "user@realm!tokenid"

# 2. Token in Proxmox prüfen
# Datacenter → Permissions → API Tokens
# → Token muss existieren und aktiv sein

# 3. User-Berechtigungen prüfen
# Datacenter → Permissions → Users
# → User braucht mind. VM.Monitor, VM.PowerMgmt
```

---

### Problem 4: Token-Alter wird nicht aktualisiert

**Symptom:**
```json
{
  "age_days": 65,  // Alt!
  "rotation_recommended": true
}
```

**Ursache:**
- `token_created_at` wurde nicht aktualisiert
- Token-Wert wurde nicht neu eingegeben (Frontend sendet leeren String)

**Lösung:**
```bash
# Option 1: Im Dashboard neu eingeben
# 1. Settings → Proxmox Tab
# 2. Token Value NEU EINGEBEN (wichtig!)
# 3. Speichern

# Option 2: Manuell in DB aktualisieren
docker compose exec -T db psql -U user -d dashboard -c \
  "UPDATE proxmox_config 
   SET token_created_at = NOW(), 
       token_last_rotated = NOW() 
   WHERE id = 1;"

# Option 3: Prüfe ob token_value gesendet wurde
docker compose logs backend | grep "token_value received"
# Sollte zeigen: "YES (length: 36)"
```

**Wichtig:** Der Token-Wert wird aus Sicherheitsgründen NICHT im Frontend angezeigt. Du musst ihn bei jeder Rotation neu eingeben!

---

### Problem 5: "Dashboard zeigt keine VMs mehr"

**Symptom:**
- Proxmox Monitoring Tab ist leer
- Fehler: "Failed to fetch Proxmox data"

**Diagnose:**
```bash
# 1. Backend-Logs prüfen
docker compose logs backend --tail 50 | grep -i proxmox

# 2. Proxmox-Config prüfen
curl -s http://localhost:8000/api/proxmox/config | jq .

# 3. Manuelle API-Anfrage
curl -s http://localhost:8000/api/proxmox/vms | jq .
```

**Häufige Ursachen:**
- Token wurde in Proxmox gelöscht (alten vergessen)
- Host/Port falsch
- Netzwerk-Problem zwischen Dashboard und Proxmox
- Proxmox-Server offline

---

## 📊 Checkliste nach Rotation

- [ ] Neuer Token in Proxmox erstellt
- [ ] Token im Dashboard gespeichert
- [ ] Token in Datenbank verschlüsselt (`gAAAAAB...`)
- [ ] Token-Alter zurückgesetzt (0 Tage)
- [ ] Proxmox Monitoring zeigt alle VMs
- [ ] Start/Stop/Reboot funktioniert
- [ ] Alter Token in Proxmox gelöscht
- [ ] Audit-Log zeigt Rotation-Eintrag
- [ ] Security-Dashboard zeigt grünen Status

---

## 🔐 Best Practices

### Sicherheit

1. **Token niemals teilen**
   - Jeder Admin sollte eigenen Token haben
   - Format: `admin-name@pve!dashboard-YYYY-MM`

2. **Token-Secrets sicher speichern**
   - Passwort-Manager (z.B. Bitwarden, KeePass)
   - NICHT in Git committen
   - NICHT in Logs ausgeben

3. **Regelmäßige Rotation**
   - Alle 60 Tage (oder bei Warnung im Dashboard)
   - Nach Sicherheitsvorfällen sofort

4. **Backup des Encryption-Keys**
   - `ADMIN_PASSWORD` sicher speichern
   - Bei Verlust: Alle Tokens neu erstellen nötig

### Dokumentation

1. **Token-Namen mit Datum**
   ```
   dashboard-2025-11
   dashboard-2025-12
   dashboard-2026-01
   ```

2. **Rotations-Log führen**
   ```
   05.11.2025 - Token rotiert (Alt: 65 Tage)
   04.01.2026 - Token rotiert (Alt: 60 Tage)
   ```

3. **Screenshots bei Token-Erstellung**
   - Als Backup falls Secret verloren geht

---

## 📚 Weiterführende Dokumentation

- [SECURITY_FEATURES.md](SECURITY_FEATURES.md) - Übersicht aller Security-Features
- [ENCRYPTION.md](ENCRYPTION.md) - Details zur Verschlüsselung
- [PROXMOX_SETUP.md](PROXMOX_SETUP.md) - Proxmox Integration Setup

---

## 🆘 Support

Bei Problemen:
1. Backend-Logs prüfen: `docker compose logs backend --tail 100`
2. Datenbank prüfen: Siehe [Backend-Überprüfung](#backend-überprüfung)
3. Token neu erstellen: [Schritt-für-Schritt Anleitung](#schritt-für-schritt-anleitung)

**Notfall-Lösung:**
```bash
# Alles zurücksetzen
docker compose exec -T db psql -U user -d dashboard -c \
  "DELETE FROM proxmox_config WHERE id = 1;"

# Neuen Token erstellen und im Dashboard speichern
```
