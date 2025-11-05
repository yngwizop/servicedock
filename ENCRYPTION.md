# 🔐 Proxmox Token Verschlüsselung

## Übersicht

Die Proxmox API-Tokens werden jetzt **verschlüsselt** in der Datenbank gespeichert, um die Sicherheit zu erhöhen.

## 🔑 Verschlüsselung

### Wie funktioniert es?

1. **Encryption Key**: 
   - Wird aus der `ENCRYPTION_KEY` Umgebungsvariable gelesen
   - Falls nicht gesetzt: Wird vom `ADMIN_PASSWORD` abgeleitet
   - Verwendet **Fernet** (symmetrische Verschlüsselung)

2. **Speichern**:
   - Token wird mit AES-128 verschlüsselt
   - Verschlüsselter Wert wird in DB gespeichert

3. **Abrufen**:
   - Verschlüsselter Wert wird aus DB gelesen
   - Wird vor Verwendung entschlüsselt

### Algorithmus

- **Fernet** (Teil von `cryptography`)
- Basiert auf AES-128 in CBC-Modus
- HMAC für Authentizität
- Timestamps für Freshness

## 🚀 Setup

### Option 1: Automatisch (Standard)

Der Encryption Key wird automatisch vom `ADMIN_PASSWORD` abgeleitet.

**Keine weitere Konfiguration nötig!**

### Option 2: Dedizierter Key (Empfohlen für Produktion)

1. **Generiere einen sicheren Key**:
   ```bash
   python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```

2. **Füge ihn zur `.env` hinzu**:
   ```bash
   ENCRYPTION_KEY=dein-generierter-key-hier
   ```

3. **Starte die Container neu**:
   ```bash
   docker compose down
   docker compose up -d --build
   ```

## 🔄 Migration (bestehende Daten verschlüsseln)

Falls du bereits einen unverschlüsselten Token in der Datenbank hast:

```bash
# Im Backend-Container ausführen
docker compose exec backend python migrate_encrypt_tokens.py
```

Das Script:
- ✅ Erkennt bereits verschlüsselte Tokens
- ✅ Verschlüsselt nur Klartext-Tokens
- ✅ Zeigt Progress-Report

### Manuelle Migration

Alternativ kannst du die Konfiguration einfach neu speichern:

1. Gehe zu **Settings → Proxmox**
2. Trage den Token erneut ein
3. Klicke auf **Speichern**

Der Token wird automatisch verschlüsselt gespeichert.

## ⚠️ Wichtig

### Key-Verwaltung

**Der Encryption Key ist kritisch!**

- Ohne den korrekten Key können die Tokens nicht entschlüsselt werden
- Bei Verlust des Keys musst du neue API-Tokens erstellen
- **Backup des Keys** für Produktionsumgebungen empfohlen

### Key-Rotation

Wenn du den Encryption Key ändern möchtest:

1. **Notiere** dir den aktuellen Proxmox Token (Klartext)
2. **Ändere** `ENCRYPTION_KEY` in `.env`
3. **Starte** Container neu
4. **Trage** den Token neu ein im Dashboard

## 🔍 Verifizierung

### Prüfe ob Verschlüsselung aktiv ist:

```bash
# Zeige den gespeicherten Token (sollte verschlüsselt sein)
docker compose exec db psql -U user -d dashboard -c "SELECT id, substring(token_value, 1, 20) as encrypted_token FROM proxmox_config;"
```

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
