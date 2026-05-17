# 🔐 Verschlüsselung & Security - Servicedock

## Übersicht

> **Hinweis:** Alle API-Aufrufe und OAuth-Redirects (z.B. Spotify) laufen im lokalen Netzwerk über die zentrale Nginx-Adresse `https://10.10.10.50`.

Servicedock verwendet **mehrschichtige Sicherheitsmaßnahmen** zum Schutz sensibler Daten. Dieses Dokument erklärt die verschiedenen Verschlüsselungsmechanismen und deren Einsatzzwecke.

**Security-Level:** 🟢 High  
**Standards:** AES-128-CBC + HMAC, bcrypt, JWT (HS256)  
**Library:** `cryptography`, `bcrypt`, `python-jose`

---

## 🔑 Die drei Security-Keys erklärt

Servicedock nutzt **drei verschiedene Secrets** für unterschiedliche Sicherheitsaufgaben:

### 1. **ENCRYPTION_KEY** - Datenverschlüsselung

```bash
# Generierung:
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

**Zweck:** Symmetrische Verschlüsselung sensibler API-Tokens in der Datenbank

**Verschlüsselt:**
- ✅ Proxmox API-Tokens
- ✅ Spotify Access & Refresh Tokens
- ✅ Alle sensiblen Credentials

**Algorithmus:** Fernet (AES-128-CBC + HMAC-SHA256)

**Automatische Verschlüsselung:** Ja, beim Speichern und Entschlüsseln beim Laden

---

### 2. **JWT_SECRET_KEY** - Token-Signierung

```bash
# Generierung:
openssl rand -hex 32
```

**Zweck:** Signierung von JSON Web Tokens für Authentifizierung

**Verwendet für:**
- ✅ Admin-Login Session-Tokens
- ✅ Access & Refresh Token Signierung
- ✅ API-Zugriffskontrolle

**Algorithmus:** HMAC-SHA256 (HS256)

**⚠️ Wichtig:** Dieser Key verschlüsselt KEINE Daten in der Datenbank! Er verhindert nur, dass jemand gefälschte Login-Tokens erstellt.

---

### 3. **ADMIN_PASSWORD** - Authentifizierung

```bash
# Manuell in .env setzen:
ADMIN_PASSWORD=dein_sicheres_passwort_hier
```

**Zweck:** Admin-Zugang zum Dashboard

**Sicherheit:** bcrypt Hash mit Salt (12 Runden)

**Hinweis:** Das Passwort wird niemals im Klartext gespeichert, nur der bcrypt-Hash.

---

## 🔒 Verschlüsselungs-Details (ENCRYPTION_KEY)

### Algorithmus

**Fernet** (Teil von `cryptography.fernet`)
- **Encryption**: AES-128 in CBC-Modus
- **Authentication**: HMAC (SHA-256) für Authentizität
- **Timestamps**: Integrierte Freshness-Prüfung
- **Key-Derivation**: PBKDF2 mit SHA-256

### Wie funktioniert es?

1. **Beim Speichern** (z.B. Proxmox Token):
   ```python
   from cryptography.fernet import Fernet
   
   # Cipher mit ENCRYPTION_KEY initialisieren
   cipher_suite = Fernet(ENCRYPTION_KEY.encode())
   
   # Token verschlüsseln
   encrypted_token = cipher_suite.encrypt(token_value.encode())
   
   # → In Datenbank speichern (base64-codiert)
   ```

2. **Beim Abrufen** (z.B. für Proxmox API-Call):
   ```python
   # Verschlüsselten Token aus DB laden
   encrypted_token = db_row['token_value']
   
   # Entschlüsseln
   decrypted_token = cipher_suite.decrypt(encrypted_token)
   
   # → Für Proxmox API verwenden
   ```

### Automatische Verschlüsselung

Die Verschlüsselung erfolgt **vollautomatisch** bei jedem Speichervorgang:

**Backend-Code (transparent):**
```python
# In: backend/routers/proxmox.py & backend/routers/spotify.py
from core.security import encrypt_value, decrypt_value

# Beim Speichern - automatisch verschlüsselt:
encrypted_token = encrypt_value(config.token_value)
db.execute("INSERT INTO proxmox_config (token_value) VALUES (%s)", (encrypted_token,))

# Beim Laden - automatisch entschlüsselt:
encrypted_from_db = db_row['token_value']
plain_token = decrypt_value(encrypted_from_db)
# → Jetzt nutzbar für API-Calls
```

**In der Datenbank gespeichert:**
```sql
-- Proxmox Token (verschlüsselt mit Fernet):
id |             token_value              
----+------------------------------------------
  1 | gAAAAABpMHRLPfRQN6AQtfRoNt6YtfGdKN8BrgT2...

-- Spotify Token (verschlüsselt mit Fernet):
id |            access_token             
----+------------------------------------------
  1 | gAAAAABpP9IdtdOn7AEvSGJwG1hPGzy1lRgt8TAn...
```

✅ **Das Präfix `gAAAAAB` beweist erfolgreiche Fernet-Verschlüsselung**

---

## 🔐 Security-Workflow Übersicht

### Bei API-Token-Speicherung (Proxmox/Spotify)

1. **Frontend:** User gibt Token ein
2. **Backend:** `encrypt_value(token)` verschlüsselt mit `ENCRYPTION_KEY`
3. **PostgreSQL:** Speichert verschlüsselten String (`gAAAAAB...`)
4. **Niemand** kann den Token ohne `ENCRYPTION_KEY` entschlüsseln

### Bei Admin-Login

1. **Frontend:** User gibt Passwort ein
2. **Backend:** Vergleicht mit bcrypt-Hash
3. **JWT:** Erstellt signiertes Token mit `JWT_SECRET_KEY`
4. **Session:** Token wird für API-Zugriffe verwendet

### Bei Proxmox API-Aufruf

1. **Backend:** Lädt verschlüsselten Token aus DB
2. **Decrypt:** `decrypt_value()` entschlüsselt mit `ENCRYPTION_KEY`
3. **API-Call:** Nutzt entschlüsselten Token für Proxmox API
4. **Token** wird niemals im Klartext gespeichert oder geloggt

---

## 🔑 Key-Management Best Practices

### ENCRYPTION_KEY generieren

```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

**Beispiel-Output:**
```
vLK8fF_7xGqY9JZ2WvN5hB3mT4nP6dC8kE1sR0aQ=
```

**Format:**
- 44 Zeichen lang
- Base64-codiert
- URL-safe Characters

### JWT_SECRET_KEY generieren

```bash
openssl rand -hex 32
```

**Beispiel-Output:**
```
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

---

## 📊 Security-Übersicht

| Key | Zweck | Algorithmus | Verschlüsselt | Rotation |
|-----|-------|-------------|---------------|----------|
| `ENCRYPTION_KEY` | **Daten in DB** | Fernet (AES-128-CBC) | Proxmox/Spotify Tokens | Bei Kompromittierung |
| `JWT_SECRET_KEY` | **Token-Signierung** | HMAC-SHA256 | Login-Sessions | Alle 90 Tage |
| `ADMIN_PASSWORD` | **Login** | bcrypt (12 Rounds) | Admin-Zugang | Bei Bedarf |

---

## ✅ Verschlüsselungs-Verifizierung

### Prüfe ob Tokens verschlüsselt sind

```bash
# Proxmox Token prüfen:
docker compose exec db psql -U user -d dashboard -c \
  "SELECT id, substring(token_value, 1, 40) as encrypted_token FROM proxmox_config;"

# Spotify Token prüfen:
docker compose exec db psql -U user -d dashboard -c \
  "SELECT id, substring(access_token, 1, 40) as encrypted_spotify FROM spotify_config;"
```

**Erwartetes Ergebnis:**
```
 id |             encrypted_token              
----+------------------------------------------
  1 | gAAAAABpMHRLPfRQN6AQtfRoNt6YtfGdKN8BrgT2
```

✅ **Wenn der Token mit `gAAAAAB` beginnt, ist die Fernet-Verschlüsselung aktiv!**

❌ **Wenn der Token lesbar ist (z.B. beginnt mit "PVEAPIToken="), ist KEINE Verschlüsselung aktiv!**

---

## 🔐 Implementierung im Code

### Verschlüsselung (backend/core/security.py)

```python
from cryptography.fernet import Fernet
import base64
import hashlib

def get_encryption_key():
    """Lädt ENCRYPTION_KEY und erstellt Fernet-Cipher"""
    key_bytes = ENCRYPTION_KEY.encode()
    hash_digest = hashlib.sha256(key_bytes).digest()
    fernet_key = base64.urlsafe_b64encode(hash_digest)
    return Fernet(fernet_key)

cipher_suite = get_encryption_key()

def encrypt_value(plain_text: str) -> str:
    """Verschlüsselt einen String mit Fernet"""
    encrypted = cipher_suite.encrypt(plain_text.encode())
    return encrypted.decode()

def decrypt_value(encrypted_text: str) -> str:
    """Entschlüsselt einen Fernet-String"""
    decrypted = cipher_suite.decrypt(encrypted_text.encode())
    return decrypted.decode()
```

### Verwendung in Routers

**Proxmox Token speichern:**
```python
# backend/routers/proxmox.py
encrypted_token = encrypt_value(config.token_value)
cur.execute("UPDATE proxmox_config SET token_value=%s WHERE id=1", (encrypted_token,))
```

**Spotify Token speichern:**
```python
# backend/routers/spotify.py
encrypted_access = encrypt_value(access_token)
encrypted_refresh = encrypt_value(refresh_token)
cur.execute(
    "INSERT INTO spotify_config (access_token, refresh_token) VALUES (%s, %s)",
    (encrypted_access, encrypted_refresh)
)
```

**Token entschlüsseln für API-Nutzung:**
```python
# Token aus DB laden
encrypted_token = db_row['token_value']

# Entschlüsseln
api_token = decrypt_value(encrypted_token)

# Für Proxmox API verwenden
headers = {"Authorization": f"PVEAPIToken={api_token}"}
```

---

## In .env eintragen

```env
ENCRYPTION_KEY=vLK8fF_7xGqY9JZ2WvN5hB3mT4nP6dC8kE1sR0aQ=
JWT_SECRET_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
ADMIN_PASSWORD=dein_sicheres_passwort
```

---

## ⚠️ WICHTIGE HINWEISE

### ❌ ENCRYPTION_KEY NIEMALS ändern!

**Warum?**
- Alle verschlüsselten Tokens werden unbrauchbar
- Proxmox-Zugangsdaten müssen neu eingegeben werden
- Keine automatische Migration möglich (außer mit Re-Encryption Script)

**Was passiert bei Key-Änderung?**
```
❌ InvalidToken Exception beim Entschlüsseln
❌ Backend kann nicht auf Proxmox zugreifen
❌ Dashboard zeigt "Proxmox nicht konfiguriert"
```

### ✅ Key sicher aufbewahren

**Best Practices:**
- 💾 Backup des Keys an sicherem Ort (z.B. Password-Manager, KeePass)
- 🚫 Nicht in Git committen (`.gitignore` prüfen!)
- 🚫 Nicht per E-Mail/Chat/Slack teilen
- 🔒 `.env` Datei mit `chmod 600` schützen
- 📝 Dokumentiere wo das Backup liegt (für Disaster-Recovery)

### 🔄 Falls Key verloren/geändert

Wenn der `ENCRYPTION_KEY` geändert wurde oder verloren ging, hast du **zwei Optionen**:

#### Option 1: Proxmox-Token neu eingeben (Einfach)

1. Dashboard öffnen und als Admin einloggen
2. **Settings → Proxmox Configuration**
3. Host, Token-Name und Token-Value neu eintragen
4. **Speichern** → Token wird mit neuem Key verschlüsselt

#### Option 2: Re-Encryption Script nutzen (Advanced)

Falls du das **alte Passwort** noch kennst:

```bash
# Re-Encryption Script ausführen
docker compose exec backend python3 /app/re_encrypt_tokens.py
```

**Das Script:**
- ✅ Entschlüsselt Tokens mit altem Key
- ✅ Verschlüsselt Tokens mit neuem Key
- ✅ Aktualisiert Datenbank automatisch
- ✅ Verifiziert Erfolg

Siehe **[RE_ENCRYPTION_GUIDE.md](RE_ENCRYPTION_GUIDE.md)** für Details.

---

## 🛡️ Sicherheitsvorteile

### ✅ Schutz bei DB-Zugriff

**Szenario:** Angreifer erhält Zugriff auf PostgreSQL-Datenbank

- ❌ **Ohne Encryption**: Proxmox-Token im Klartext sichtbar → Voller Zugriff auf Proxmox
- ✅ **Mit Encryption**: Nur verschlüsselte Tokens sichtbar → Ohne `ENCRYPTION_KEY` wertlos

```sql
-- Was ein Angreifer sieht:
SELECT token_value FROM proxmox_config;

-- Verschlüsselt:
gAAAAABpC5U8QaM4cN7HQclpfWNqYjT9...  ← Unbrauchbar ohne Key

-- Unverschlüsselt (unsicher!):
050722a3-7fa2-4c89-9b1a-7fa25290...  ← Sofort verwendbar!
```

### ✅ Schutz bei Backup-Leaks

**Szenario:** DB-Backup landet auf öffentlichem Server/USB-Stick

- ❌ **Ohne Encryption**: Alle Tokens im Backup lesbar
- ✅ **Mit Encryption**: Backup enthält nur verschlüsselte Daten

### ✅ Compliance & Best Practices

- ✅ Erfüllt OWASP-Empfehlungen für Credential-Storage
- ✅ Verhindert Plaintext-Storage sensibler Daten
- ✅ Separierung von Key und Daten (Key in `.env`, Daten in DB)
- ✅ DSGVO-konform (Sensible Daten verschlüsselt)

---

## 🔍 Verifizierung

### Verschlüsselung prüfen

```bash
# Zeige den gespeicherten Token (sollte verschlüsselt sein)
docker compose exec db psql -U dashboard_user -d dashboard -c \
  "SELECT id, substring(token_value, 1, 30) as encrypted_token FROM proxmox_config;"
```

**Erwartete Ausgabe:**
```
 id |       encrypted_token       
----+-----------------------------
  1 | gAAAAABpC5U8QaM4cN7HQclpfWN...
```

**Interpretation:**
- ✅ **Verschlüsselt**: Beginnt mit `gAAAAAB...` (Fernet Signature)
- ❌ **Unverschlüsselt**: UUID-Format `xxxxxxxx-xxxx-xxxx-xxxx-...`

### Migration-Script für alte Tokens

Falls du Tokens **vor** der Verschlüsselung gespeichert hast:

```bash
# Im Backend-Container ausführen
docker compose exec backend python3 /app/migrate_encrypt_tokens.py
```

**Das Script:**
- ✅ Erkennt bereits verschlüsselte Tokens (überspringt sie)
- ✅ Verschlüsselt nur Klartext-Tokens
- ✅ Zeigt Progress-Report
- ✅ Keine Daten gehen verloren

**Beispiel-Output:**
```
🔐 Proxmox Token Verschlüsselung - Migration Script
==================================================
📦 Token gefunden (ID: 1)
📋 Aktueller Wert: 050722a3-7fa2-4c89-9b1a-7fa25290...
✅ Token ist im Klartext → Wird verschlüsselt
🔒 Verschlüsselter Wert: gAAAAABpC5U8QaM...
💾 Token erfolgreich in DB gespeichert
✅ Migration abgeschlossen!
```

### Backend-Logs prüfen

```bash
# Beim Backend-Start
docker compose logs backend | grep -i encryption

# Erwartete Ausgabe:
# "Proxmox token successfully decrypted" → Encryption funktioniert
```

---

## 📚 Weiterführende Dokumentation

- **Setup**: [QUICKSTART.md](QUICKSTART.md) - Ersteinrichtung mit Key-Generierung
- **Re-Encryption**: [RE_ENCRYPTION_GUIDE.md](RE_ENCRYPTION_GUIDE.md) - Key-Wechsel durchführen
- **Token-Rotation**: [TOKEN_ROTATION_GUIDE.md](TOKEN_ROTATION_GUIDE.md) - Proxmox Tokens erneuern
- **Proxmox**: [PROXMOX_SETUP.md](PROXMOX_SETUP.md) - Proxmox Integration einrichten

---

## 🔧 Technische Details

### Datenbank-Schema

```sql
CREATE TABLE proxmox_config (
    id INT PRIMARY KEY DEFAULT 1,
    host VARCHAR(255) NOT NULL,
    port INT DEFAULT 8006,
    token_name VARCHAR(255) NOT NULL,
    token_value TEXT NOT NULL,           -- ← Verschlüsselt!
    verify_ssl BOOLEAN DEFAULT FALSE,
    node VARCHAR(100),
    token_created_at TIMESTAMP DEFAULT NOW(),
    token_last_rotated TIMESTAMP
);
```

### Code-Beispiel (Backend)

```python
from cryptography.fernet import Fernet
from config.settings import ENCRYPTION_KEY

# Cipher initialisieren (beim Start)
cipher_suite = Fernet(ENCRYPTION_KEY.encode())

# Token verschlüsseln (beim Speichern)
def encrypt_token(plain_token: str) -> bytes:
    return cipher_suite.encrypt(plain_token.encode())

# Token entschlüsseln (beim Abrufen)
def decrypt_token(encrypted_token: bytes) -> str:
    return cipher_suite.decrypt(encrypted_token).decode()
```

---

## ❓ FAQ

**Q: Kann ich den Key später ändern?**  
A: Ja, aber nur mit Re-Encryption Script. Siehe [RE_ENCRYPTION_GUIDE.md](RE_ENCRYPTION_GUIDE.md)

**Q: Was passiert bei Key-Verlust?**  
A: Tokens müssen im Dashboard neu eingegeben werden. Backup wichtig!

**Q: Ist AES-128 sicher genug?**  
A: Ja, AES-128 ist für die meisten Anwendungen ausreichend. Fernet nutzt zusätzlich HMAC.

**Q: Werden auch andere Credentials verschlüsselt?**  
A: Aktuell nur Proxmox-Tokens. Admin-Passwort wird mit bcrypt gehasht (nicht verschlüsselt).

**Q: Kann ich einen anderen Algorithmus nutzen?**  
A: Fernet ist fest codiert. Für andere Algorithmen wäre Code-Anpassung nötig.

**Q: Wie kann ich mir den vollständigen Fernet Key von Spotify/Proxmo anzeigen lassen?**
A: Den vollständigen Fernet Key kann man mit folgendem Befehl ausgeben lassen:

```
docker compose exec db psql -U postgres_user -d postgres_db -c "SELECT id, length(access_token) as token_length, access_token FROM spotify_config LIMIT 1;"
```
dabei einfach spotify_config durch proxmox_config ersetzen, für das jeweilige Szenario

---

**Made with 🔒 for Security**
