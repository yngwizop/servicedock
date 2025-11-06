# Sicherheitsverbesserungen - Implementierung

Dieses Dokument beschreibt die durchgeführten Sicherheitsverbesserungen für das Web Dashboard.

## ✅ Implementierte Maßnahmen

### 1. JWT-Authentifizierung (KRITISCH)

**Status:** ✅ Vollständig implementiert

**Änderungen:**
- JWT-Token-System mit `python-jose` implementiert
- Token-Generierung bei erfolgreichem Login (8 Stunden Gültigkeit)
- `verify_token()` Dependency für geschützte Endpunkte
- Alle sensiblen Endpunkte geschützt mit `Depends(verify_token)`:
  - `/api/shortcuts` (POST, PUT, DELETE)
  - `/api/services` (POST, PUT, DELETE)
  - `/api/appearance` (PUT)
  - `/api/admin/*` (alle Admin-Endpunkte)
  - `/api/proxmox/config` (GET, PUT)
  - `/api/proxmox/vm/*/start|stop|reboot`

**Frontend-Integration:**
- Token-Storage in localStorage mit Ablaufzeit
- Automatische Token-Validierung bei jedem Request
- Authorization-Header mit Bearer-Token
- Automatischer Logout bei abgelaufenem Token

**Sicherheitsgewinn:**
- ❌ Vorher: Alle Endpunkte offen zugänglich
- ✅ Jetzt: Nur authentifizierte Nutzer können Änderungen vornehmen

---

### 2. CORS-Einschränkung (KRITISCH)

**Status:** ✅ Vollständig implementiert

**Änderungen:**
```python
# Vorher:
allow_origins=["*"]  # ❌ Extrem unsicher!

# Jetzt:
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
allowed_origins = [FRONTEND_URL]

# Development-Mode erlaubt zusätzliche localhost-URLs
if os.getenv("ENVIRONMENT") == "development":
    allowed_origins.extend([...])
```

**Environment-Variablen:**
- `FRONTEND_URL`: Production-Frontend-URL (z.B. `https://dashboard.example.com`)
- `ENVIRONMENT`: `development` oder `production`

**Sicherheitsgewinn:**
- ❌ Vorher: Jede Website konnte API-Requests machen
- ✅ Jetzt: Nur spezifische Frontend-URLs erlaubt

---

### 3. ENCRYPTION_KEY mandatory (KRITISCH)

**Status:** ✅ Vollständig implementiert

**Änderungen:**
```python
# Vorher:
if not encryption_key:
    # Fallback auf ADMIN_PASSWORD ❌ Unsicher!
    admin_pw = os.getenv("ADMIN_PASSWORD", "admin123")

# Jetzt:
if not encryption_key:
    raise ValueError("ENCRYPTION_KEY is required!") # ✅ Keine Fallbacks
```

**Sicherheitsgewinn:**
- ❌ Vorher: Key aus Admin-Passwort abgeleitet → kompromittierbar
- ✅ Jetzt: Dedizierter Encryption-Key erforderlich

**Key-Generierung:**
```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

---

### 4. Passwort-Hashing mit bcrypt (KRITISCH)

**Status:** ✅ Vollständig implementiert

**Änderungen:**
- `passlib[bcrypt]` für sicheres Passwort-Hashing
- Passwörter werden bei Initialisierung gehasht
- Vergleich mit `verify_password()` statt Klartext

```python
# Vorher:
if creds.password == ADMIN_PASSWORD:  # ❌ Klartext-Vergleich

# Jetzt:
if verify_password(creds.password, ADMIN_PASSWORD_HASH):  # ✅ bcrypt
```

**Sicherheitsgewinn:**
- ❌ Vorher: Passwort im Klartext im Speicher
- ✅ Jetzt: Nur Hash gespeichert, Passwort nicht rekonstruierbar

---

### 5. Rate Limiting auf Login (KRITISCH)

**Status:** ✅ Vollständig implementiert

**Änderungen:**
```python
@app.post("/api/login")
@limiter.limit("5/minute")  # ✅ Max 5 Login-Versuche pro Minute
def login(creds: AdminLogin, request: Request):
```

**Sicherheitsgewinn:**
- ❌ Vorher: Unbegrenzte Login-Versuche möglich
- ✅ Jetzt: Brute-Force-Schutz durch Rate Limiting

---

## 📋 Erforderliche Konfiguration

### .env-Datei

**NEU - Pflichtfelder:**
```bash
# WICHTIG: Muss gesetzt sein!
ENCRYPTION_KEY=<generierter-key>
JWT_SECRET_KEY=<generierter-key>

# Frontend-URL für CORS
FRONTEND_URL=http://localhost:3000

# Environment
ENVIRONMENT=development  # oder "production"
```

**Key-Generierung:**
```bash
# ENCRYPTION_KEY
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# JWT_SECRET_KEY
python3 -c "import secrets; print(secrets.token_hex(32))"
# oder
openssl rand -hex 32
```

---

## 🚀 Deployment-Checkliste

### Vor Production:

- [ ] `.env` Datei erstellen mit allen Pflichtfeldern
- [ ] `ENCRYPTION_KEY` generieren und setzen
- [ ] `JWT_SECRET_KEY` generieren und setzen
- [ ] `FRONTEND_URL` auf Production-URL setzen
- [ ] `ENVIRONMENT=production` setzen
- [ ] Starkes `ADMIN_PASSWORD` setzen
- [ ] Dependencies installieren: `pip install -r requirements.txt`
- [ ] Docker neu bauen: `docker-compose build`
- [ ] Docker starten: `docker-compose up -d`

### Nach Deployment:

- [ ] Testen: Login funktioniert
- [ ] Testen: CRUD-Operationen funktionieren (nur mit Auth)
- [ ] Testen: Proxmox-Integration funktioniert
- [ ] Testen: Unauthentifizierte Requests werden abgelehnt (401)
- [ ] CORS-Header überprüfen (nur Frontend-URL erlaubt)

---

## 🔄 Migration von bestehendem System

Wenn du bereits ein laufendes System hast:

1. **Backup erstellen:**
   ```bash
   docker-compose exec db pg_dump -U user dashboard > backup.sql
   ```

2. **Container stoppen:**
   ```bash
   docker-compose down
   ```

3. **.env aktualisieren:**
   - `ENCRYPTION_KEY` hinzufügen
   - `JWT_SECRET_KEY` hinzufügen
   - `FRONTEND_URL` hinzufügen
   - `ENVIRONMENT` hinzufügen

4. **Neu bauen und starten:**
   ```bash
   docker-compose build
   docker-compose up -d
   ```

5. **Neu einloggen im Frontend:**
   - Alte "Session" ist ungültig
   - Mit Admin-Passwort neu einloggen
   - JWT-Token wird gespeichert

---

## 📊 Sicherheitsvergleich

| Feature | Vorher | Jetzt |
|---------|--------|-------|
| **Authentifizierung** | ❌ Nur Login-Check | ✅ JWT-Token-System |
| **Geschützte Endpunkte** | ❌ Fast alle offen | ✅ Alle sensiblen geschützt |
| **CORS** | ❌ allow_origins=["*"] | ✅ Spezifische URL |
| **Passwort-Speicherung** | ❌ Klartext | ✅ bcrypt-Hash |
| **Encryption-Key** | ❌ Aus Passwort abgeleitet | ✅ Dediziert & mandatory |
| **Brute-Force-Schutz** | ❌ Keiner | ✅ Rate Limiting |
| **Token-Management** | ❌ Keins | ✅ Auto-Ablauf nach 8h |

---

## 🔐 Best Practices

1. **Secrets niemals committen:**
   - `.env` ist in `.gitignore`
   - Secrets über Umgebungsvariablen oder Docker Secrets

2. **Regelmäßige Key-Rotation:**
   - JWT_SECRET_KEY alle 90 Tage wechseln
   - ENCRYPTION_KEY nur bei Kompromittierung ändern
   - Proxmox-Tokens über `/api/admin/proxmox/rotate-token`

3. **Monitoring:**
   - Audit-Logs regelmäßig prüfen
   - Failed-Login-Attempts überwachen
   - Rate-Limit-Violations überwachen

4. **HTTPS:**
   - In Production IMMER HTTPS verwenden
   - Reverse Proxy (Nginx/Traefik) mit SSL-Zertifikat
   - HTTP→HTTPS Redirect

---

## 🛠 Troubleshooting

### "ENCRYPTION_KEY is required"

**Problem:** Backend startet nicht

**Lösung:**
```bash
# .env erstellen und Key generieren:
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# In .env einfügen: ENCRYPTION_KEY=<generierter-key>
```

### "Session expired"

**Problem:** Frontend zeigt Session-Fehler

**Lösung:**
- Token ist abgelaufen (nach 8 Stunden)
- Neu einloggen
- Token wird automatisch gelöscht

### "401 Unauthorized"

**Problem:** API-Requests werden abgelehnt

**Lösung:**
- Im Frontend einloggen
- JWT-Token wird gespeichert
- Requests enthalten dann Authorization-Header

### CORS-Fehler

**Problem:** Frontend kann nicht mit Backend kommunizieren

**Lösung:**
```bash
# In .env:
FRONTEND_URL=http://<deine-frontend-url>
ENVIRONMENT=development  # für localhost-Zugriff
```

---

## 📝 Nächste Schritte (Optional)

Weitere Sicherheitsverbesserungen für die Zukunft:

1. **Multi-User-Support:**
   - User-Tabelle in DB
   - Rollen-basierte Berechtigungen
   - Separate Admin- und User-Accounts

2. **2FA (Two-Factor Authentication):**
   - TOTP-basierte 2FA
   - Backup-Codes

3. **Security Headers:**
   - Content-Security-Policy
   - X-Frame-Options
   - Strict-Transport-Security

4. **Audit-Log-Erweiterungen:**
   - Alerts bei verdächtigen Aktivitäten
   - Export-Funktionen
   - Retention-Policies

5. **API-Versionierung:**
   - `/api/v1/` Prefix
   - Deprecation-Handling

---

**Stand:** 06.11.2025  
**Version:** 1.0  
**Sicherheitslevel:** 🟢 Production-Ready für kleine bis mittlere Deployments
