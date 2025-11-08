# 🔐 Token-Verschlüsselung - ServiceDock

## Übersicht

Alle sensiblen Proxmox API-Tokens werden **verschlüsselt** in der Datenbank gespeichert mit **Fernet (AES-128)** Verschlüsselung.

**Security-Level:** 🟢 High  
**Standard:** AES-128-CBC + HMAC  
**Library:** `cryptography` (Python)

---

## 🔑 Verschlüsselungs-Details

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

---

## 🔒 ENCRYPTION_KEY

Der `ENCRYPTION_KEY` ist **mandatory** und muss in der `.env` Datei gesetzt sein.

### Key generieren

```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

**Beispiel-Output:**
```
P0lkYiUSh6y-Qmsa9fQ6J9uzDZn3B1EHkRCMDSoXGL8=
```

**Format:**
- 44 Zeichen lang
- Base64-codiert
- URL-safe Characters
- Enthält zufällige Bytes

### In .env eintragen

```env
ENCRYPTION_KEY=P0lkYiUSh6y-Qmsa9fQ6J9uzDZn3B1EHkRCMDSoXGL8=
```

---

## ⚠️ WICHTIGE HINWEISE

### ❌ Key NIEMALS ändern!

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

- **Setup**: [INITIAL_SETUP.md](INITIAL_SETUP.md) - Ersteinrichtung mit Key-Generierung
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

---

**Made with 🔒 for Security**
