# 🔐 Proxmox Token Verschlüsselung# 🔐 Proxmox Token Verschlüsselung



## Übersicht## Übersicht



Die Proxmox API-Tokens werden **verschlüsselt** in der Datenbank gespeichert mit Fernet (AES-128) Verschlüsselung.Die Proxmox API-Tokens werden **verschlüsselt** in der Datenbank gespeichert mit Fernet (AES-128) Verschlüsselung.



## 🔑 Verschlüsselungs-Details## 🔑 Verschlüsselungs-Details



### Algorithmus### Algorithmus

- **Fernet** (Teil von `cryptography`)- **Fernet** (Teil von `cryptography`)

- Basiert auf AES-128 in CBC-Modus- Basiert auf AES-128 in CBC-Modus

- HMAC für Authentizität- HMAC für Authentizität

- Timestamps für Freshness- Timestamps für Freshness



### Funktionsweise### Funktionsweise



1. **Speichern**:1. **Speichern**:

   ```python   ```python

   encrypted_token = cipher_suite.encrypt(token_value.encode())   encrypted_token = cipher_suite.encrypt(token_value.encode())

   # → In DB speichern   # → In DB speichern

   ```   ```



2. **Abrufen**:2. **Abrufen**:

   ```python   ```python

   decrypted_token = cipher_suite.decrypt(encrypted_value)   decrypted_token = cipher_suite.decrypt(encrypted_value)

   # → Für Proxmox API verwenden   # → Für Proxmox API verwenden

   ```   ```



## 🔒 ENCRYPTION_KEY## 🔒 ENCRYPTION_KEY



Der ENCRYPTION_KEY ist **mandatory** und muss in der `.env` gesetzt sein.Der ENCRYPTION_KEY ist **mandatory** und muss in der `.env` gesetzt sein.



### Key generieren### Key generieren



```bash```bash

python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

``````



**Beispiel-Output:****Beispiel-Output:**

``````

P0lkYiUSh6y-Qmsa9fQ6J9uzDZn3B1EHkRCMDSoXGL8=P0lkYiUSh6y-Qmsa9fQ6J9uzDZn3B1EHkRCMDSoXGL8=

``````



### In .env eintragen### In .env eintragen



```env```env

ENCRYPTION_KEY=P0lkYiUSh6y-Qmsa9fQ6J9uzDZn3B1EHkRCMDSoXGL8=ENCRYPTION_KEY=P0lkYiUSh6y-Qmsa9fQ6J9uzDZn3B1EHkRCMDSoXGL8=

``````



## ⚠️ WICHTIGE HINWEISE## ⚠️ WICHTIGE HINWEISE



### ❌ Key NIEMALS ändern!### ❌ Key NIEMALS ändern!

- Alle verschlüsselten Tokens werden unbrauchbar- Alle verschlüsselten Tokens werden unbrauchbar

- Proxmox-Zugangsdaten müssen neu eingegeben werden- Proxmox-Zugangsdaten müssen neu eingegeben werden

- Keine automatische Migration möglich- Keine automatische Migration möglich



### ✅ Key sicher aufbewahren### ✅ Key sicher aufbewahren

- Backup des Keys an sicherem Ort (z.B. Password-Manager)- Backup des Keys an sicherem Ort (z.B. Password-Manager)

- Nicht in Git committen (`.gitignore` prüfen!)- Nicht in Git committen (`.gitignore` prüfen!)

- Nicht per E-Mail/Chat teilen- Nicht per E-Mail/Chat teilen



### 🔄 Falls Key verloren/geändert### 🔄 Falls Key verloren/geändert

Wenn der ENCRYPTION_KEY geändert wurde oder verloren ging:Wenn der ENCRYPTION_KEY geändert wurde oder verloren ging:



1. **Lösung:** Proxmox-Credentials im Dashboard neu eingeben1. **Lösung:** Proxmox-Credentials im Dashboard neu eingeben

   - Settings → Proxmox Configuration   - Settings → Proxmox Configuration

   - Host, Token-Name und Token-Value neu eintragen   - Host, Token-Name und Token-Value neu eintragen

   - Speichern → Token wird mit neuem Key verschlüsselt   - Speichern → Token wird mit neuem Key verschlüsselt



2. **Alternative:** Re-Encryption Script nutzen (siehe `RE_ENCRYPTION_GUIDE.md`)2. **Alternative:** Re-Encryption Script nutzen (siehe `RE_ENCRYPTION_GUIDE.md`)



## 🛡️ Sicherheitsvorteile## 🛡️ Sicherheitsvorteile



✅ **Schutz bei DB-Zugriff**✅ **Schutz bei DB-Zugriff**

- Angreifer mit DB-Zugriff sehen nur verschlüsselte Tokens- Angreifer mit DB-Zugriff sehen nur verschlüsselte Tokens

- Ohne ENCRYPTION_KEY sind Tokens wertlos- Ohne ENCRYPTION_KEY sind Tokens wertlos



✅ **Schutz bei Backup-Leaks**✅ **Schutz bei Backup-Leaks**

- DB-Backups enthalten nur verschlüsselte Daten- DB-Backups enthalten nur verschlüsselte Daten

- Keine Klartext-Credentials in Backups- Keine Klartext-Credentials in Backups



✅ **Compliance**✅ **Compliance**

- Erfüllt Best Practices für Credential-Storage- Erfüllt Best Practices für Credential-Storage

- Verhindert Plaintext-Storage sensibler Daten- Verhindert Plaintext-Storage sensibler Daten



## 🔍 Verifizierung## 📚 Weiterführende Dokumentation



### Verschlüsselung prüfen- **Setup:** `INITIAL_SETUP.md` - Ersteinrichtung mit Key-Generierung

- **Re-Encryption:** `RE_ENCRYPTION_GUIDE.md` - Key-Wechsel durchführen

```bash- **Token-Rotation:** `TOKEN_ROTATION_GUIDE.md` - Proxmox Tokens erneuern

# Zeige den gespeicherten Token (sollte verschlüsselt sein)

docker compose exec db psql -U user -d dashboard -c "SELECT id, substring(token_value, 1, 20) as encrypted_token FROM proxmox_config;"```bash

```# Im Backend-Container ausführen

docker compose exec backend python migrate_encrypt_tokens.py

**Verschlüsselt**: Beginnt mit `gAAAAA...`  ```

**Unverschlüsselt**: UUID-Format `xxxxxxxx-xxxx-...`

Das Script:

### Backend-Logs prüfen- ✅ Erkennt bereits verschlüsselte Tokens

- ✅ Verschlüsselt nur Klartext-Tokens

```bash- ✅ Zeigt Progress-Report

docker compose logs backend | grep -i encrypt

```### Manuelle Migration



## 🐛 TroubleshootingAlternativ kannst du die Konfiguration einfach neu speichern:



### "Decryption error" im Backend-Log1. Gehe zu **Settings → Proxmox**

**Ursache:** Falscher ENCRYPTION_KEY oder Key wurde geändert2. Trage den Token erneut ein

3. Klicke auf **Speichern**

**Lösung:**

```bashDer Token wird automatisch verschlüsselt gespeichert.

# 1. Prüfe ob ENCRYPTION_KEY gesetzt ist

docker compose exec backend printenv | grep ENCRYPTION_KEY## ⚠️ Wichtig



# 2. Token neu eingeben im Dashboard### Key-Verwaltung

# Settings → Proxmox Configuration → Credentials neu eintragen

```**Der Encryption Key ist kritisch!**



### Proxmox VMs werden nicht angezeigt- Ohne den korrekten Key können die Tokens nicht entschlüsselt werden

**Ursache:** Token kann nicht entschlüsselt werden- Bei Verlust des Keys musst du neue API-Tokens erstellen

- **Backup des Keys** für Produktionsumgebungen empfohlen

**Lösung:**

```bash### Key-Rotation

# Backend-Logs prüfen

docker compose logs backend | tail -n 50Wenn du den Encryption Key ändern möchtest:



# Falls "InvalidToken" Fehler → Token neu eingeben1. **Notiere** dir den aktuellen Proxmox Token (Klartext)

```2. **Ändere** `ENCRYPTION_KEY` in `.env`

3. **Starte** Container neu

## 📚 Weiterführende Dokumentation4. **Trage** den Token neu ein im Dashboard



- **Setup:** `INITIAL_SETUP.md` - Ersteinrichtung mit Key-Generierung## 🔍 Verifizierung

- **Re-Encryption:** `RE_ENCRYPTION_GUIDE.md` - Key-Wechsel durchführen

- **Token-Rotation:** `TOKEN_ROTATION_GUIDE.md` - Proxmox Tokens erneuern### Prüfe ob Verschlüsselung aktiv ist:

- **Security:** `SECURITY_IMPLEMENTATION.md` - Alle Security-Features

```bash

---# Zeige den gespeicherten Token (sollte verschlüsselt sein)

docker compose exec db psql -U user -d dashboard -c "SELECT id, substring(token_value, 1, 20) as encrypted_token FROM proxmox_config;"

**Deine Proxmox-Tokens sind jetzt sicher! 🔒**```


**Verschlüsselt**: Beginnt mit `gAAAAA...`
**Unverschlüsselt**: UUID-Format `xxxxxxxx-xxxx-...`

### Backend-Logs prüfen:

```bash
docker compose logs backend | grep -i encrypt
```

## 🛡️ Sicherheitsempfehlungen

### Für Entwicklung
✅ Standard-Setup (Key vom ADMIN_PASSWORD abgeleitet)

### Für Produktion
✅ Dedizierter `ENCRYPTION_KEY` in `.env`  
✅ `.env` Datei **nicht** in Git committen (bereits in `.gitignore`)  
✅ Backup des Encryption Keys an sicherem Ort  
✅ Starke Passwörter verwenden  
✅ Regelmäßige Key-Rotation erwägen

## 📝 Technische Details

### Verschlüsselungsablauf

```python
# Speichern (main.py)
plain_token = "44782547-f90c-460b-9793-a6a685d778bb"
encrypted = cipher_suite.encrypt(plain_token.encode())
# DB: "gAAAAABnKj3x..."

# Abrufen (main.py)
encrypted_from_db = "gAAAAABnKj3x..."
plain_token = cipher_suite.decrypt(encrypted_from_db.encode())
# Verwendet: "44782547-f90c-460b-9793-a6a685d778bb"
```

### Key-Ableitung

```python
# Wenn ENCRYPTION_KEY nicht gesetzt
admin_password = os.getenv("ADMIN_PASSWORD")
key_bytes = admin_password.encode()
hash_digest = hashlib.sha256(key_bytes).digest()  # 32 Bytes
fernet_key = base64.urlsafe_b64encode(hash_digest)
```

## 🐛 Troubleshooting

### "Decryption error"
→ Falscher Encryption Key  
→ Lösung: Korrekten Key in `.env` setzen oder Token neu eingeben

### "Invalid token"
→ Token wurde mit anderem Key verschlüsselt  
→ Lösung: Token neu eingeben im Dashboard

### Migration schlägt fehl
→ Prüfe `DATABASE_URL` und Datenbankverbindung  
→ Stelle sicher, dass `cryptography` installiert ist

---

**Deine Proxmox-Tokens sind jetzt sicher! 🔒**
