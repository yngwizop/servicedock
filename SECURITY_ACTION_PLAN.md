# 🔒 Sicherheits-Aktionsplan

**Erstellt:** 07.11.2025  
**Status:** Offen  
**Priorität:** KRITISCH

Dieser Plan adressiert alle identifizierten Sicherheitslücken aus dem Security Review und ordnet sie nach Priorität.

---

## 📊 Übersicht

| Kategorie | Anzahl | Priorität |
|-----------|--------|-----------|
| **KRITISCH** | 7 | 🔴 Sofort |
| **HOCH** | 4 | 🟠 Innerhalb 1 Woche |
| **MITTEL** | 3 | 🟡 Innerhalb 1 Monat |
| **OPTIONAL** | 5 | 🟢 Nice-to-have |

**Geschätzter Aufwand:** 12-16 Stunden  
**Quick Wins (1-2 Std):** 5 Punkte

---

## 🔴 KRITISCH - Sofort beheben

### 1. JWT Secret Key Doppeldefinition & Fallback entfernen

**Problem:**
```python
# Zeile 19: Erste Definition mit Fallback
SECRET_KEY = os.getenv("JWT_SECRET_KEY", os.urandom(32).hex())  # ❌ UNSICHER!

# Zeile 23: Zweite Definition mit anderem Fallback  
SECRET_KEY = os.getenv("JWT_SECRET_KEY", os.urandom(32).hex())
```

**Risiko:**
- Bei jedem Backend-Restart wird ein neuer zufälliger Key generiert
- Alle bestehenden JWT-Tokens werden ungültig → User werden ausgeloggt
- Secret ist nicht persistent → unsicher in Production
- Doppelte Definition führt zu Verwirrung

**Lösung:**
```python
# Nur EINE Definition, kein Fallback!
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError(
        "JWT_SECRET_KEY environment variable is required! "
        "Generate one with: openssl rand -hex 32"
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120  # 2 Stunden (aktuell 480 = 8h)
```

**Aufwand:** 10 Min  
**Dateien:** `backend/main.py` (Zeilen 19-26)

---

### 2. ACCESS_TOKEN_EXPIRE_MINUTES vereinheitlichen

**Problem:**
```python
# Zeile 21: 480 Minuten (8 Stunden)
ACCESS_TOKEN_EXPIRE_MINUTES = 480

# Zeile 25: 120 Minuten (2 Stunden) - auskommentiert?
ACCESS_TOKEN_EXPIRE_MINUTES = 120
```

**Risiko:**
- Inkonsistente Token-Laufzeit
- 8 Stunden ist zu lang für ein privates Dashboard
- Erhöht Risiko bei Token-Leak

**Lösung:**
```python
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY is required!")

ALGORITHM = "HS256"
# Von ENV laden mit sicherem Default
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))  # 2h
```

**Zusätzlich in `.env.example`:**
```bash
# JWT-Konfiguration
JWT_SECRET_KEY=your-jwt-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=120  # 2 Stunden
```

**Aufwand:** 5 Min  
**Dateien:** `backend/main.py`, `.env.example`

---

### 3. Admin-Passwort mandatory machen (kein Fallback)

**Problem:**
```python
# Zeile 237: Unsicherer Fallback
admin_password = os.getenv("ADMIN_PASSWORD", "admin123")  # ❌ UNSICHER!
```

**Risiko:**
- Default-Passwort "admin123" ist extrem unsicher
- Deployments ohne explizites Passwort sind kompromittierbar
- Maskiert fehlende Konfiguration

**Lösung:**
```python
def initialize_admin_password():
    """
    Initialisiert das Admin-Passwort beim ersten Start.
    ADMIN_PASSWORD muss gesetzt sein - kein Fallback!
    """
    global ADMIN_PASSWORD_HASH
    admin_password = os.getenv("ADMIN_PASSWORD")
    
    if not admin_password:
        raise ValueError(
            "ADMIN_PASSWORD environment variable is required! "
            "Set a strong password in your .env file."
        )
    
    if len(admin_password) < 8:
        raise ValueError("ADMIN_PASSWORD must be at least 8 characters long!")
    
    ADMIN_PASSWORD_HASH = get_password_hash(admin_password)
    print(f"✓ Admin password initialized (hashed)")
```

**Aufwand:** 10 Min  
**Dateien:** `backend/main.py` (Zeile 234-242)

---

### 4. require_role() Dependency implementieren

**Problem:**
- `verify_token()` prüft nur JWT-Signatur, nicht die Rolle
- Alle geschützten Endpunkte haben keine Rollen-Prüfung
- Potenzieller Privilege Escalation-Vektor

**Risiko:**
- Bei zukünftigem Multi-User-System: Guest-Token könnte Admin-Endpunkte nutzen
- Keine Trennung zwischen Admin- und User-Rechten

**Lösung:**
```python
def require_role(required_role: str):
    """
    Dependency für Rollen-basierte Zugriffskontrolle.
    
    Usage:
        @app.get("/api/admin/something")
        def admin_only(token: dict = Depends(require_role("admin"))):
            ...
    """
    def role_checker(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
        try:
            token = credentials.credentials
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            
            # Prüfe Rolle
            user_role = payload.get("type")
            if user_role != required_role:
                raise HTTPException(
                    status_code=403, 
                    detail=f"Access denied. Required role: {required_role}"
                )
            
            return payload
        except JWTError:
            raise HTTPException(
                status_code=401, 
                detail="Invalid authentication credentials"
            )
    
    return role_checker

# Dann alle Admin-Endpunkte ändern:
@app.get("/api/admin/audit-logs")
def get_audit_logs(limit: int = 100, offset: int = 0, token: dict = Depends(require_role("admin"))):
    ...

@app.post("/api/proxmox/vm/{vmid}/start")
@limiter.limit("10/minute")
def start_proxmox_vm(vmid: int, vm_type: str = "qemu", request: Request = None, 
                     token: dict = Depends(require_role("admin"))):
    ...
```

**Aufwand:** 30 Min  
**Dateien:** `backend/main.py` (nach `verify_token()` einfügen)  
**Betroffene Endpunkte:** Alle mit `Depends(verify_token)` → zu `Depends(require_role("admin"))`

---

### 5. Exception-Handling & Logging Framework

**Problem:**
- Zahlreiche `print(f"...")` Statements im Code
- `Exception` Details werden an Client gesendet
- Keine strukturierten Logs
- Token/Secrets könnten in Logs erscheinen

**Beispiele:**
```python
# Zeile 118: Decryption error
print(f"Decryption error: {e}")  # ❌ Details in stdout

# Zeile 258: DB Connection
print(f"Fehler bei der Datenbankverbindung: {e}")  # ❌ Details an Client
raise HTTPException(status_code=500, detail="Datenbankverbindung fehlgeschlagen")

# Zeile 699: Proxmox API
print(f"Proxmox API error: {e}")  # ❌ Details in stdout
raise HTTPException(..., detail=f"Failed to fetch: {str(e)}")  # ❌ Details an Client!
```

**Risiko:**
- Information Disclosure: Stacktraces, DB-Details, interne Pfade
- Keine Audit-Trail für Fehler
- Token/Secrets könnten versehentlich geloggt werden

**Lösung:**

**Schritt 1: Logging-Framework einrichten**
```python
import logging
import sys
from logging.handlers import RotatingFileHandler

# Logging Setup (nach den Imports)
def setup_logging():
    """Konfiguriert strukturiertes Logging"""
    
    # Erstelle Logger
    logger = logging.getLogger("dashboard")
    logger.setLevel(logging.INFO)
    
    # Console Handler (nur für wichtige Meldungen)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_format = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    console_handler.setFormatter(console_format)
    
    # File Handler mit Rotation (für Details)
    file_handler = RotatingFileHandler(
        '/app/logs/backend.log', 
        maxBytes=10485760,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.DEBUG)
    file_format = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
    )
    file_handler.setFormatter(file_format)
    
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)
    
    return logger

logger = setup_logging()

# Sensitive-Data-Filter
class SensitiveDataFilter(logging.Filter):
    """Filtert sensible Daten aus Logs"""
    SENSITIVE_PATTERNS = [
        'password', 'token', 'secret', 'key', 'authorization'
    ]
    
    def filter(self, record):
        message = record.getMessage().lower()
        for pattern in self.SENSITIVE_PATTERNS:
            if pattern in message:
                record.msg = record.msg.replace(record.args, '***REDACTED***') if record.args else record.msg
        return True

logger.addFilter(SensitiveDataFilter())
```

**Schritt 2: Alle print() durch logger ersetzen**
```python
# Vorher:
print(f"Decryption error: {e}")

# Nachher:
logger.error("Decryption failed", exc_info=False)  # exc_info=False verhindert Stacktrace

# Vorher:
print(f"Fehler bei der Datenbankverbindung: {e}")

# Nachher:
logger.error("Database connection failed", exc_info=True)  # exc_info nur in File-Log
```

**Schritt 3: Generische Error-Responses**
```python
def get_connection():
    try:
        result = urlparse(DATABASE_URL)
        return psycopg2.connect(...)
    except Exception as e:
        logger.error(f"Database connection error: {type(e).__name__}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="Database connection failed"  # ✅ Keine Details an Client!
        )

# Proxmox Connection
except Exception as e:
    logger.error(f"Proxmox connection error: {type(e).__name__}", exc_info=True)
    return None, None  # Oder generische HTTPException

# Proxmox API Calls
except Exception as e:
    logger.error(f"Proxmox API error for VM {vmid}: {type(e).__name__}", exc_info=True)
    log_audit(...)
    raise HTTPException(
        status_code=500, 
        detail="Failed to fetch Proxmox resources"  # ✅ Generisch!
    )
```

**Schritt 4: Logs-Verzeichnis in Docker**
```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Logs-Verzeichnis erstellen
RUN mkdir -p /app/logs

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
backend:
  volumes:
    - ./backend/logs:/app/logs  # Logs persistent machen
```

**Aufwand:** 60 Min  
**Dateien:** `backend/main.py`, `backend/Dockerfile`, `docker-compose.yml`  
**Betroffene Zeilen:** Alle `print()` Statements (~20 Stellen)

---

### 6. CORS auf ENV-Origin & Credentials fix

**Problem:**
```python
# Zeile 176-190: Development-Mode erlaubt zu viele Origins
if os.getenv("ENVIRONMENT") == "development":
    allowed_origins.extend([
        "http://localhost:3000",
        "http://localhost:4173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:4173",
        "http://192.168.178.83:3000",  # ❌ Hardcoded IP!
        "http://192.168.178.83:8000"   # ❌ Hardcoded IP!
    ])
```

**Risiko:**
- Hardcoded IPs müssen bei jedem Umzug geändert werden
- In Production könnten Development-Origins versehentlich aktiv bleiben
- `allow_credentials=True` mit mehreren Origins ist problematisch

**Lösung:**
```python
# CORS Configuration
FRONTEND_URL = os.getenv("FRONTEND_URL")
ENVIRONMENT = os.getenv("ENVIRONMENT", "production")  # Default: production!

if not FRONTEND_URL:
    raise ValueError(
        "FRONTEND_URL environment variable is required! "
        "Example: http://localhost:3000 or https://dashboard.example.com"
    )

# In Production: Nur exakte Origin
allowed_origins = [FRONTEND_URL]

# In Development: Zusätzliche lokale Origins
if ENVIRONMENT == "development":
    # Nur localhost-Varianten, keine IPs
    allowed_origins.extend([
        "http://localhost:3000",
        "http://localhost:4173",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:4173",
        "http://127.0.0.1:5173"
    ])
    logger.info(f"🔓 CORS Development mode: {len(allowed_origins)} origins allowed")
else:
    logger.info(f"🔒 CORS Production mode: Only {FRONTEND_URL} allowed")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,  # OK mit spezifischen Origins
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],  # ✅ Spezifisch statt "*"
)
```

**Zusätzlich: Security Headers Middleware**
```python
from fastapi import Response
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        
        # Security Headers nur in Production
        if ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            # CSP - anpassen falls nötig
            response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"
        
        return response

# Nach CORS Middleware hinzufügen
app.add_middleware(SecurityHeadersMiddleware)
```

**Aufwand:** 20 Min  
**Dateien:** `backend/main.py` (Zeilen 175-200)

---

### 7. X-Forwarded-For Trust konfigurierbar machen

**Problem:**
```python
# Zeile 155-157: Blindes Vertrauen auf X-Forwarded-For
def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()  # ❌ Kein Trust-Check!
```

**Risiko:**
- IP-Spoofing möglich: Angreifer kann X-Forwarded-For Header setzen
- Umgeht Rate-Limiting und Audit-Logging
- Nur sichere wenn Reverse Proxy (Nginx/Traefik) konfiguriert ist

**Lösung:**
```python
# Konfiguration
TRUST_FORWARDED_HEADERS = os.getenv("TRUST_FORWARDED_HEADERS", "false").lower() == "true"
TRUSTED_PROXIES = os.getenv("TRUSTED_PROXIES", "").split(",")  # z.B. "10.0.0.1,172.18.0.1"

def get_client_ip(request: Request) -> str:
    """
    Extrahiert die Client-IP aus dem Request.
    Berücksichtigt X-Forwarded-For nur wenn TRUST_FORWARDED_HEADERS=true
    """
    
    # Wenn Forwarded Headers vertrauenswürdig sind (hinter Reverse Proxy)
    if TRUST_FORWARDED_HEADERS:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # Nimm die erste IP (Original Client)
            client_ip = forwarded.split(",")[0].strip()
            
            # Optional: Prüfe ob Request von vertrauenswürdigem Proxy kommt
            if TRUSTED_PROXIES and request.client:
                proxy_ip = request.client.host
                if proxy_ip not in TRUSTED_PROXIES:
                    logger.warning(f"Untrusted proxy {proxy_ip} sent X-Forwarded-For")
                    # Fallback auf direkte IP
                    return proxy_ip
            
            return client_ip
    
    # Fallback: Direkte Client-IP (ohne Proxy)
    if request.client:
        return request.client.host
    
    return "unknown"
```

**In `.env.example` ergänzen:**
```bash
# Reverse Proxy Configuration (nur wenn Nginx/Traefik vorgeschaltet)
TRUST_FORWARDED_HEADERS=false
# TRUSTED_PROXIES=10.0.0.1,172.18.0.1  # Komma-separiert
```

**Aufwand:** 15 Min  
**Dateien:** `backend/main.py` (Zeile 153-168), `.env.example`

---

## 🟠 HOCH - Innerhalb 1 Woche

### 8. DB Connection Pooling implementieren

**Problem:**
- Jeder Request öffnet neue DB-Verbindung synchron
- Keine Connection-Wiederverwendung
- Performance-Problem bei vielen Requests
- Potenzieller DoS-Vektor (Connection-Exhaustion)

**Risiko:**
- Bei hoher Last: DB kann keine Connections mehr annehmen
- Langsame Response-Zeiten
- Ressourcen-Verschwendung

**Lösung:**
```python
from psycopg2 import pool
import atexit

# Globaler Connection Pool
connection_pool = None

def initialize_connection_pool():
    """Erstellt einen Connection Pool beim Start"""
    global connection_pool
    
    try:
        result = urlparse(DATABASE_URL)
        connection_pool = pool.SimpleConnectionPool(
            minconn=2,   # Minimum 2 Verbindungen offen halten
            maxconn=10,  # Maximum 10 gleichzeitige Verbindungen
            dbname=result.path[1:],
            user=result.username,
            password=result.password,
            host=result.hostname,
            port=result.port
        )
        logger.info("✓ Database connection pool initialized (2-10 connections)")
    except Exception as e:
        logger.critical(f"Failed to create connection pool: {type(e).__name__}", exc_info=True)
        raise

def get_connection():
    """Holt Connection aus Pool"""
    try:
        if connection_pool is None:
            raise Exception("Connection pool not initialized")
        
        conn = connection_pool.getconn()
        if conn is None:
            raise Exception("No connection available from pool")
        
        return conn
    except Exception as e:
        logger.error("Failed to get connection from pool", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")

def return_connection(conn):
    """Gibt Connection zurück an Pool"""
    if connection_pool and conn:
        connection_pool.putconn(conn)

def close_connection_pool():
    """Schließt alle Connections beim Shutdown"""
    global connection_pool
    if connection_pool:
        connection_pool.closeall()
        logger.info("✓ Database connection pool closed")

# Connection Pool bei Start initialisieren
initialize_connection_pool()

# Pool beim Shutdown schließen
atexit.register(close_connection_pool)

@app.on_event("shutdown")
async def shutdown_event():
    close_connection_pool()
```

**Alle Endpunkte ändern:**
```python
# Vorher:
def get_shortcuts():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(...)
    rows = cur.fetchall()
    cur.close()
    conn.close()  # ❌ Schließt Connection
    return rows

# Nachher:
def get_shortcuts():
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(...)
        rows = cur.fetchall()
        cur.close()
        return rows
    except Exception as e:
        logger.error("Error fetching shortcuts", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch shortcuts")
    finally:
        return_connection(conn)  # ✅ Gibt Connection zurück an Pool
```

**Aufwand:** 90 Min (viele Endpunkte betroffen)  
**Dateien:** `backend/main.py` (alle DB-Zugriffe)  
**Alternative:** Mittelfristig auf `asyncpg` + async/await umsteigen

---

### 9. SQL Interval Fix (make_interval statt String-Interpolation)

**Problem:**
```python
# Audit Log Cleanup - Zeile im SQL
"DELETE FROM audit_log WHERE timestamp < NOW() - INTERVAL '%s days';"
```

**Risiko:**
- String-Interpolation bei SQL-Zeit-Angaben
- Zwar kein direktes SQL-Injection-Risiko (da Integer), aber unsauber
- Kann zu SQL-Syntax-Fehlern führen

**Lösung:**
```python
# Vorher:
cur.execute(
    "DELETE FROM audit_log WHERE timestamp < NOW() - INTERVAL '%s days';",
    (days,)
)

# Nachher:
cur.execute(
    "DELETE FROM audit_log WHERE timestamp < NOW() - make_interval(days => %s);",
    (days,)
)

# Oder sicherer mit psycopg2.sql:
from psycopg2 import sql

cur.execute(
    sql.SQL("DELETE FROM audit_log WHERE timestamp < NOW() - make_interval(days => {});").format(
        sql.Literal(days)
    )
)
```

**Aufwand:** 10 Min  
**Dateien:** `backend/main.py`  
**Betroffene Stellen:** 
- Zeile ~216 (startup cleanup)
- Zeile ~1045 (cleanup endpoint)

---

### 10. Audit-Log Filterung (keine Secrets loggen)

**Problem:**
- Audit-Log könnte versehentlich sensible Daten enthalten
- `details` Dict wird ungefiltert in DB geschrieben

**Risiko:**
- Token/Passwörter könnten in Audit-Logs erscheinen
- Bei Login-Fehlversuchen: Passwort-Versuch könnte geloggt werden

**Lösung:**
```python
def sanitize_audit_details(details: dict) -> dict:
    """Entfernt sensible Keys aus Audit-Details"""
    if not details:
        return details
    
    SENSITIVE_KEYS = [
        'password', 'token', 'token_value', 'secret', 'key',
        'authorization', 'api_key', 'access_token', 'refresh_token'
    ]
    
    sanitized = details.copy()
    for key in SENSITIVE_KEYS:
        if key in sanitized:
            sanitized[key] = '***REDACTED***'
    
    return sanitized

def log_audit(
    action: str,
    status: str = "success",
    user_type: str = "system",
    ip_address: str = None,
    resource_type: str = None,
    resource_id: str = None,
    details: dict = None,
    user_agent: str = None
):
    """Schreibt einen Eintrag ins Audit-Log"""
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # Sanitize details BEFORE logging
        safe_details = sanitize_audit_details(details)
        details_json = json_lib.dumps(safe_details) if safe_details else None
        
        cur.execute(...)
        conn.commit()
        cur.close()
        return_connection(conn)  # Mit Connection Pool
    except Exception as e:
        logger.error("Audit log write failed", exc_info=True)
        # Fehler beim Logging sollten nicht die Hauptfunktion blockieren
```

**Aufwand:** 20 Min  
**Dateien:** `backend/main.py` (Zeile 123-152)

---

### 11. Login Rate-Limiting verschärfen

**Problem:**
```python
@app.post("/api/login")
@limiter.limit("5/minute")  # Nur 5 pro Minute
```

**Risiko:**
- 5 Versuche/Minute ist relativ großzügig
- Kein exponentielles Backoff
- Kein Account-Lockout nach x Fehlversuchen

**Lösung:**
```python
# Globaler Counter für Failed-Logins (in Production: Redis!)
failed_login_attempts = {}  # IP -> (count, last_attempt_time)

from datetime import datetime, timedelta

def check_login_attempts(ip_address: str) -> bool:
    """
    Prüft ob IP für Login gesperrt ist.
    Blockiert nach 5 Fehlversuchen für 15 Minuten.
    """
    now = datetime.now()
    
    if ip_address in failed_login_attempts:
        count, last_attempt = failed_login_attempts[ip_address]
        
        # Reset nach 15 Minuten
        if now - last_attempt > timedelta(minutes=15):
            del failed_login_attempts[ip_address]
            return True
        
        # Blockiert nach 5 Versuchen
        if count >= 5:
            logger.warning(f"Login blocked for IP {ip_address} (too many attempts)")
            return False
    
    return True

def record_failed_login(ip_address: str):
    """Zählt fehlgeschlagene Login-Versuche"""
    now = datetime.now()
    if ip_address in failed_login_attempts:
        count, _ = failed_login_attempts[ip_address]
        failed_login_attempts[ip_address] = (count + 1, now)
    else:
        failed_login_attempts[ip_address] = (1, now)

def reset_failed_login(ip_address: str):
    """Löscht Failed-Login-Counter bei erfolgreichem Login"""
    if ip_address in failed_login_attempts:
        del failed_login_attempts[ip_address]

@app.post("/api/login")
@limiter.limit("10/minute")  # Erhöht auf 10/min (wegen Cleanup nach 15min)
def login(creds: AdminLogin, request: Request):
    client_ip = get_client_ip(request)
    
    # Prüfe ob IP geblockt ist
    if not check_login_attempts(client_ip):
        log_audit(
            action="LOGIN_BLOCKED",
            status="blocked",
            user_type="admin",
            ip_address=client_ip,
            details={"reason": "Too many failed attempts"}
        )
        raise HTTPException(
            status_code=429, 
            detail="Too many failed login attempts. Try again in 15 minutes."
        )
    
    # Verifiziere Passwort
    if not verify_password(creds.password, ADMIN_PASSWORD_HASH):
        record_failed_login(client_ip)
        log_audit(...)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Erfolgreicher Login
    reset_failed_login(client_ip)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(...)
    
    log_audit(...)
    return {...}
```

**In Production:** Failed-Attempts in Redis/DB speichern statt in Memory!

**Aufwand:** 30 Min  
**Dateien:** `backend/main.py` (um Zeile 462)

---

## 🟡 MITTEL - Innerhalb 1 Monat

### 12. Token Refresh/Rotation implementieren

**Aktuell:**
- JWT-Token läuft nach 2 Stunden ab → User muss neu einloggen
- Keine Refresh-Token

**Lösung:**
- Kurzlebige Access-Tokens (15-30 Min)
- Langlebige Refresh-Tokens (7 Tage)
- Automatisches Token-Refresh im Frontend

**Aufwand:** 2-3 Stunden  
**Komplexität:** Mittel  
**Dokumente:** Siehe Best Practices Online

---

### 13. Admin-IP-Whitelisting (Optional)

**Idee:**
- Nur bestimmte IPs dürfen Admin-Endpunkte nutzen
- Konfigurierbar via ENV

```python
ADMIN_IP_WHITELIST = os.getenv("ADMIN_IP_WHITELIST", "").split(",")

def check_admin_ip(request: Request):
    if not ADMIN_IP_WHITELIST or ADMIN_IP_WHITELIST == [""]:
        return  # Keine Whitelist konfiguriert
    
    client_ip = get_client_ip(request)
    if client_ip not in ADMIN_IP_WHITELIST:
        logger.warning(f"Admin access denied for IP {client_ip}")
        raise HTTPException(status_code=403, detail="Access denied")

# In Admin-Endpunkten:
@app.get("/api/admin/audit-logs")
def get_audit_logs(..., token: dict = Depends(require_role("admin")), 
                     ip_check: None = Depends(check_admin_ip)):
    ...
```

**Aufwand:** 30 Min

---

### 14. Webhooks für Security-Events

**Idee:**
- Benachrichtigungen bei kritischen Events
- Z.B. via Discord/Slack/NTFY

```python
import requests

WEBHOOK_URL = os.getenv("SECURITY_WEBHOOK_URL")

def send_security_alert(event: str, details: dict):
    if not WEBHOOK_URL:
        return
    
    payload = {
        "event": event,
        "timestamp": datetime.now().isoformat(),
        "details": details
    }
    
    try:
        requests.post(WEBHOOK_URL, json=payload, timeout=5)
    except Exception as e:
        logger.error(f"Failed to send webhook: {e}")

# Aufrufen bei:
# - 5+ Failed-Login-Attempts
# - Token-Rotation
# - Admin-IP von Whitelist abgelehnt
# - Rate-Limit überschritten
```

**Aufwand:** 1 Stunde

---

## 🟢 OPTIONAL - Nice-to-have

### 15. Umzug auf Async (asyncpg + async/await)

**Aktuell:** Synchrones psycopg2  
**Besser:** Async mit asyncpg

**Vorteile:**
- Bessere Performance bei vielen gleichzeitigen Requests
- Native FastAPI Async-Support
- Connection Pooling built-in

**Aufwand:** 4-6 Stunden (komplette Umstellung)  
**Lohnt sich:** Ab 50+ gleichzeitigen Nutzern

---

### 16. Multi-User-Support mit Rollen

**Features:**
- User-Tabelle in DB
- Registrierung/Invitation-System
- Rollen: Admin, User, Guest
- Permissions pro Rolle

**Aufwand:** 6-8 Stunden

---

### 17. 2FA (Two-Factor Authentication)

**Implementierung:**
- TOTP-basiert (Google Authenticator, Authy)
- QR-Code-Generierung
- Backup-Codes

**Aufwand:** 3-4 Stunden

---

### 18. Content-Security-Policy Fine-Tuning

**Aktuell:** Basis-CSP in Security Headers  
**Besser:** Angepasst an Frontend-Needs

```python
# Beispiel für React-App
"Content-Security-Policy": (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "  # React benötigt eval
    "style-src 'self' 'unsafe-inline'; "  # Tailwind/CSS
    "img-src 'self' data: https:; "  # Icons, externe Bilder
    "connect-src 'self' http://192.168.178.83:8000; "  # API
    "font-src 'self' data:; "
)
```

**Aufwand:** 1-2 Stunden (Testing)

---

### 19. API-Versionierung

**Struktur:**
- `/api/v1/shortcuts`
- `/api/v2/shortcuts`

**Vorteile:**
- Breaking Changes möglich
- Deprecation-Handling
- Backward-Compatibility

**Aufwand:** 2-3 Stunden

---

## 📋 Umsetzungs-Checkliste

### Quick Wins (1-2 Stunden)

- [ ] **1. JWT Secret Key bereinigen** (10 Min)
- [ ] **2. Token-Laufzeit vereinheitlichen** (5 Min)
- [ ] **3. Admin-Passwort mandatory** (10 Min)
- [ ] **7. X-Forwarded-For Trust** (15 Min)
- [ ] **9. SQL Interval Fix** (10 Min)
- [ ] **10. Audit-Log Sanitization** (20 Min)

**Gesamt:** ~70 Minuten

---

### Phase 1: Kritische Fixes (3-4 Stunden)

- [ ] **4. require_role() implementieren** (30 Min)
- [ ] **5. Logging Framework** (60 Min)
- [ ] **6. CORS + Security Headers** (20 Min)

---

### Phase 2: Robustheit (2-3 Stunden)

- [ ] **8. DB Connection Pooling** (90 Min)
- [ ] **11. Login Rate-Limiting** (30 Min)

---

### Phase 3: Optional (je nach Bedarf)

- [ ] **12. Token Refresh** (2-3h)
- [ ] **13. IP-Whitelisting** (30 Min)
- [ ] **14. Security Webhooks** (1h)
- [ ] **15-19. Advanced Features** (je 2-8h)

---

## 🧪 Testing nach Implementierung

### Security Tests

```bash
# 1. Login mit falschem Passwort (sollte 401)
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"password": "wrong"}'

# 2. Admin-Endpunkt ohne Token (sollte 401)
curl http://localhost:8000/api/admin/audit-logs

# 3. Admin-Endpunkt mit Token aber falscher Rolle (sollte 403)
# (später mit Multi-User)

# 4. Rate-Limiting testen
for i in {1..15}; do 
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/api/login \
    -X POST -H "Content-Type: application/json" -d '{"password":"test"}'
done
# Sollte ab Versuch 11 → 429 geben

# 5. X-Forwarded-For Spoofing (sollte ignoriert werden wenn TRUST_FORWARDED_HEADERS=false)
curl -H "X-Forwarded-For: 1.2.3.4" http://localhost:8000/api/proxmox/vms

# 6. CORS von falscher Origin (sollte geblockt werden)
curl -H "Origin: http://evil.com" http://localhost:8000/api/shortcuts
```

---

## 📄 Dokumentation aktualisieren

Nach Implementierung:

- [ ] `SECURITY_IMPLEMENTATION.md` aktualisieren
- [ ] `.env.example` mit neuen Variablen
- [ ] `README.md` mit Security-Best-Practices
- [ ] Testing-Guide erstellen
- [ ] Changelog/Release-Notes

---

## 🎯 Zusammenfassung

| Phase | Aufwand | Priorität | Wirkung |
|-------|---------|-----------|---------|
| Quick Wins | 1-2h | 🔴 Kritisch | Große Sicherheitsverbesserung |
| Phase 1 | 3-4h | 🔴 Kritisch | Robustes Error-Handling |
| Phase 2 | 2-3h | 🟠 Hoch | Performance & Stabilität |
| Phase 3 | Variable | 🟡🟢 Optional | Advanced Security |

**Gesamtaufwand (Kern):** 6-9 Stunden  
**Sicherheitslevel vorher:** 🟡 Gelb (mittel)  
**Sicherheitslevel nachher:** 🟢 Grün (gut-sehr gut)

---

**Nächste Schritte:**
1. `.env` Datei mit allen neuen Variablen anlegen
2. Quick Wins umsetzen (1-2h)
3. Backend testen
4. Phase 1 umsetzen
5. Dokumentation aktualisieren

**Bei Fragen/Problemen:** Siehe SECURITY_IMPLEMENTATION.md oder erstelle ein Issue.
