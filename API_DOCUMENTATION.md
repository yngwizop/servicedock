# 📡 API Documentation - ServiceDock v3.1

**Backend-Version:** 3.1 (Performance & Security Hardening)  
**Base URL:** `https://10.10.10.50/api`  
**Hinweis:** Im lokalen Netzwerk immer die zentrale Nginx-Adresse verwenden: `https://10.10.10.50/api/...`. Alle OAuth-Redirects (z.B. Spotify) und API-Aufrufe funktionieren im gesamten Netz nur über diese Adresse.
**Authentication:** JWT Bearer Token  
**Update:** 05.12.2025  
**Repository:** [github.com/yngwizop/servicedock](https://github.com/yngwizop/servicedock)

**What's New in v3.1:**
- ✅ **Async Performance Fix:** 100x faster concurrent requests (run_in_threadpool)
- ✅ **CSRF Protection:** SameSite=strict cookies
- ✅ **Thread-Safe Spotify:** Race condition prevention with threading.Lock
- ✅ **Pydantic Response Models:** Type-safe API responses
- ✅ **Docker Security:** no-new-privileges, read-only, tmpfs
- ✅ **React Error Boundary:** Graceful frontend error handling

**Features from v3.0:**
- ✅ Live rate limit usage monitoring (`/api/admin/rate-limit-usage`)
- ✅ Enhanced security threats tracking in audit stats
- ✅ Audit logs filtering (6 filter types: all/failed/failed_logins/permission_errors/vm_operations/success)
- ✅ Comprehensive rate limiting across ALL endpoints (Services, Shortcuts, Appearance)
- ✅ Validated cleanup operations with configurable retention (1-365 days)
- ✅ Updated Proxmox rate limits (30/min for batch operations)

---

## 🏗️ Architektur-Übersicht

Das Backend verwendet eine **modulare Router-Struktur** mit 6 spezialisierten Routern:

```
routers/
├── auth.py         # Login & Authentifizierung
├── shortcuts.py    # Shortcuts CRUD + Reorder
├── services.py     # Services CRUD + Reorder
├── appearance.py   # Dashboard-Einstellungen
├── proxmox.py      # Proxmox VM-Management
└── admin.py        # Audit-Logs & Token-Rotation
```

### Security Features
- 🔐 **JWT-Authentifizierung** mit bcrypt-gehashten Passwörtern
- 🛡️ **Role-Based Access Control (RBAC)** - Admin-Only-Endpoints
- ⏱️ **Rate-Limiting** (SlowAPI + IP-basierte Lockouts)
- 🔒 **Token-Verschlüsselung** (Fernet AES-128)
- 📝 **Audit-Logging** für alle kritischen Operationen
- 🔄 **Connection Pooling** (min=2, max=10)

---

## 🔐 Authentication

### Login

**Endpoint:** `POST /api/login`

**Rate Limits:**
- SlowAPI: 5 Anfragen/Minute
- IP-Lockout: 5 Fehlversuche → 15 Minuten Sperre

**Request Body:**
```json
{
  "password": "admin-password"
}
```

**Response (Success):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 7200
}
```

**Response (Error - 401):**
```json
{
  "detail": "Invalid credentials"
}
```

**Response (Error - 429):**
```json
{
  "detail": "Login-Versuche überschritten. Versuchen Sie es in 15 Minuten erneut."
}
```

**Audit-Logging:**
- `LOGIN_SUCCESS` - Erfolgreicher Login
- `LOGIN_FAILED` - Falsches Passwort
- `LOGIN_BLOCKED` - IP-Lockout aktiv

---

## 🔗 Shortcuts

**Prefix:** `/api/shortcuts`  
**Public Endpoints:** `GET /`  
**Admin Endpoints:** `POST, PUT, DELETE, PUT /reorder`

### GET / - Alle Shortcuts abrufen

**Authentication:** ❌ Nicht erforderlich (öffentlich)

**Response:**
```json
[
  {
    "id": 1,
    "name": "GitHub",
    "url": "https://github.com",
    "icon": "https://selfh.st/icons/github.png",
    "position": 0
  },
  {
    "id": 2,
    "name": "Docker Hub",
    "url": "https://hub.docker.com",
    "icon": "🐳",
    "position": 1
  }
]
```

### POST / - Shortcut hinzufügen

**Authentication:** ✅ Admin JWT Token erforderlich  
**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Portainer",
  "url": "https://portainer.local",
  "icon": "https://selfh.st/icons/portainer.png"
}
```

**Response:**
```json
{
  "id": 3,
  "position": 2,
  "name": "Portainer",
  "url": "https://portainer.local",
  "icon": "https://selfh.st/icons/portainer.png"
}
```

### PUT /{shortcut_id} - Shortcut aktualisieren

**Authentication:** ✅ Admin JWT Token erforderlich  
**Path Parameter:** `shortcut_id` (Integer)

**Request Body:**
```json
{
  "name": "Portainer (Updated)",
  "url": "https://portainer.example.com",
  "icon": "🐋"
}
```

**Response:**
```json
{
  "message": "updated",
  "id": 3,
  "name": "Portainer (Updated)",
  "url": "https://portainer.example.com",
  "icon": "🐋"
}
```

### DELETE /{shortcut_id} - Shortcut löschen

**Authentication:** ✅ Admin JWT Token erforderlich

**Response:**
```json
{
  "message": "deleted"
}
```

### PUT /reorder - Shortcuts neu sortieren

**Authentication:** ✅ Admin JWT Token erforderlich

**Request Body:**
```json
{
  "newOrder": [3, 1, 2]
}
```

**Response:**
```json
{
  "message": "Shortcuts reordered successfully"
}
```

---

## 🎯 Services

**Prefix:** `/api/services`  
**Endpoints:** Identisch zu Shortcuts, aber mit zusätzlichem `description`-Feld

### Service-Objekt

```json
{
  "id": 1,
  "name": "Proxmox",
  "description": "Virtualization Management",
  "url": "https://proxmox.local:8006",
  "icon": "https://selfh.st/icons/proxmox.png",
  "position": 0
}
```

**Verfügbare Endpoints:**
- `GET /` - Alle Services abrufen (öffentlich)
- `POST /` - Service hinzufügen (Admin)
- `PUT /{service_id}` - Service aktualisieren (Admin)
- `DELETE /{service_id}` - Service löschen (Admin)
- `PUT /reorder` - Services neu sortieren (Admin)

---

## 🎨 Appearance

**Prefix:** `/api/appearance`  
**Public Endpoints:** `GET /`  
**Admin Endpoints:** `PUT /`

### GET / - Einstellungen abrufen

**Authentication:** ❌ Nicht erforderlich

**Response:**
```json
{
  "bg_color": "#1f2937",
  "bg_image_url": "https://example.com/bg.jpg",
  "bg_opacity": 0.5,
  "shortcut_cols": 6,
  "service_cols": 3,
  "text_color_light": "#1f2937",
  "text_color_dark": "#e5e7eb",
  "clock_format": "24h",
  "weather_city": "Berlin",
  "weather_fields": ["temperature", "humidity"]
}
```

### PUT / - Einstellungen aktualisieren

**Authentication:** ✅ Admin JWT Token erforderlich

**Request Body (alle Felder optional):**
```json
{
  "bg_color": "#0f172a",
  "bg_opacity": 0.7,
  "service_cols": 4,
  "clock_format": "12h",
  "weather_city": "Munich"
}
```

**Response:**
```json
{
  "message": "Appearance updated"
}
```

---

## 🖥️ Proxmox VM Management

**Prefix:** `/api/proxmox`  
**All Endpoints:** ✅ Admin JWT Token erforderlich

### GET /config - Proxmox-Konfiguration abrufen

**Response:**
```json
{
  "configured": true,
  "host": "proxmox.local",
  "port": 8006,
  "token_name": "root@pam!***",
  "verify_ssl": false,
  "node": "pve"
}
```

**Hinweis:** Token wird maskiert (`***`) und nie im Klartext zurückgegeben.

### PUT /config - Proxmox-Konfiguration speichern

**Request Body:**
```json
{
  "host": "proxmox.local",
  "port": 8006,
  "token_name": "root@pam!dashboard-token",
  "token_value": "abcd1234-5678-90ef-ghij-klmnopqrstuv",
  "verify_ssl": false,
  "node": "pve"
}
```

**Response:**
```json
{
  "message": "Proxmox config saved successfully"
}
```

**Security:**
- ✅ Token wird mit Fernet (AES-128) verschlüsselt gespeichert
- ✅ Audit-Log: `PROXMOX_CONFIG_SAVED`

### GET /vms - Alle VMs/Container abrufen

**Rate Limit:** 30 Anfragen/Minute

**Query Parameters:**
- `sort_by` (optional): `name`, `vmid`, `status`, `cpu`, `mem`, `type` (default: `vmid`)
- `sort_order` (optional): `asc`, `desc` (default: `asc`)
- `filter_type` (optional): `qemu`, `lxc` (default: alle)
- `filter_status` (optional): `running`, `stopped` (default: alle)

**Response:**
```json
{
  "vms": [
    {
      "vmid": 100,
      "name": "debian-vm",
      "status": "running",
      "type": "qemu",
      "cpu": 0.15,
      "mem": 2147483648,
      "maxmem": 4294967296,
      "mem_percent": 50.0,
      "disk": 21474836480,
      "maxdisk": 107374182400,
      "disk_percent": 20.0,
      "uptime": 86400
    },
    {
      "vmid": 101,
      "name": "docker-lxc",
      "status": "stopped",
      "type": "lxc",
      "cpu": 0.0,
      "mem": 0,
      "maxmem": 2147483648,
      "mem_percent": 0.0,
      "disk": 0,
      "maxdisk": 53687091200,
      "disk_percent": 0.0,
      "uptime": 0
    }
  ],
  "node": "pve",
  "sort_by": "vmid",
  "sort_order": "asc"
}
```

**Error Responses:**
- `404` - Proxmox nicht konfiguriert
- `500` - Proxmox-Verbindungsfehler
- `403` - Token hat keine PVE-Rechte (PVEAuditor oder höher erforderlich)

### POST /vm/{vmid}/start - VM/Container starten

**Rate Limit:** 10 Anfragen/Minute  
**Path Parameter:** `vmid` (Integer)  
**Query Parameter:** `vm_type` (`qemu` oder `lxc`, default: `qemu`)

**Response (Success):**
```json
{
  "message": "QEMU VM 138 wird gestartet...",
  "vmid": 138,
  "type": "qemu",
  "operation": "start"
}
```

**Response (Already Running):**
```json
{
  "message": "QEMU VM 138 läuft bereits",
  "vmid": 138,
  "type": "qemu",
  "status": "running"
}
```

**Error Responses:**
- `404` - Proxmox nicht konfiguriert oder VM nicht gefunden
- `403` - Token hat keine ausreichenden Rechte (PVEVMAdmin oder höher erforderlich)
- `500` - Proxmox API-Fehler

**Audit-Logging:**
- `VM_START_SUCCESS` / `VM_START_FAILED`

### POST /vm/{vmid}/stop - VM/Container stoppen

**Rate Limit:** 10 Anfragen/Minute  
**Identisch zu `start`, aber mit Operation `stop`

**Audit-Logging:**
- `VM_STOP_SUCCESS` / `VM_STOP_FAILED`

### POST /vm/{vmid}/reboot - VM/Container neustarten

**Rate Limit:** 10 Anfragen/Minute  
**Identisch zu `start`, aber mit Operation `reboot`

**Audit-Logging:**
- `VM_REBOOT_SUCCESS` / `VM_REBOOT_FAILED`

---

## 📊 Admin - Audit Logs

**Prefix:** `/api/admin`  
**All Endpoints:** ✅ Admin JWT Token erforderlich

### GET /audit-logs - Audit-Logs abrufen

**Query Parameters:**
- `limit` (optional, default: 100) - Maximum number of logs to return
- `offset` (optional, default: 0) - Pagination offset
- `filter_type` (optional, default: "all") - Filter logs by event type:
  - `all` - All audit events
  - `failed` - Only failed operations
  - `failed_logins` - Only failed authentication attempts
  - `permission_errors` - Only authorization failures (403 errors)
  - `vm_operations` - Only Proxmox VM/LXC operations
  - `success` - Only successful operations

**Examples:**
```bash
# Get all failed login attempts
GET /api/admin/audit-logs?filter_type=failed_logins&limit=50

# Get VM operations only
GET /api/admin/audit-logs?filter_type=vm_operations&limit=100
```

**Response:**
```json
{
  "logs": [
    {
      "id": 123,
      "timestamp": "2025-11-07T13:20:15.123456",
      "user_type": "admin",
      "ip_address": "192.168.1.100",
      "action": "VM_START_SUCCESS",
      "resource_type": "proxmox_vm",
      "resource_id": "138",
      "status": "success",
      "details": {
        "vmid": 138,
        "vm_type": "qemu",
        "node": "pve"
      },
      "user_agent": "Mozilla/5.0..."
    }
  ],
  "total": 1523,
  "limit": 100,
  "offset": 0,
  "filter_type": "all"
}
```

### GET /audit-stats - Statistiken abrufen

**Response:**
```json
{
  "actions_24h": [
    {"action": "VM_START_SUCCESS", "count": 15},
    {"action": "LOGIN_SUCCESS", "count": 8},
    {"action": "VM_STOP_SUCCESS", "count": 5}
  ],
  "top_ips": [
    {"ip": "192.168.1.100", "count": 42},
    {"ip": "192.168.1.200", "count": 18}
  ],
  "error_stats": {
    "success": 123,
    "failed": 5,
    "total": 128
  },
  "security_threats": {
    "failed_logins": 12,
    "blocked_ips": 3,
    "permission_errors": 5,
    "suspicious_activity": 20
  }
}
```

**New in v3.0:** Added `security_threats` object with:
- `failed_logins` - Count of failed login attempts (last 24h)
- `blocked_ips` - Number of distinct IPs with failed attempts (last 24h)
- `permission_errors` - Count of 403/permission-denied errors (last 24h)
- `suspicious_activity` - Combined threat score (sum of above)

### GET /rate-limit-usage - Live Rate Limit Monitoring

**New in v3.0** - Real-time rate limit usage tracking

**Response:**
```json
{
  "login": {
    "used": 2,
    "limit": 5,
    "percentage": 40
  },
  "proxmox_view": {
    "used": 15,
    "limit": 30,
    "percentage": 50
  },
  "proxmox_control": {
    "used": 1,
    "limit": 30,
    "percentage": 3
  },
  "admin": {
    "used": 8,
    "limit": 30,
    "percentage": 27
  }
}
```

**Usage Indicators:**
- 🟢 **0-60%** - Safe usage level
- 🟠 **61-80%** - Warning - approaching limit
- 🔴 **81-100%** - Critical - rate limit close

**Note:** Rate limits reset every minute/hour depending on endpoint configuration. See [RATE_LIMITS.md](RATE_LIMITS.md) for complete reference.

### POST /audit-logs/cleanup - Alte Logs löschen

**Query Parameter:** `days` (Integer, 1-365, default: 90)

**Example:**
```bash
# Logs älter als 30 Tage löschen
POST /api/admin/audit-logs/cleanup?days=30

# Logs älter als 180 Tage löschen
POST /api/admin/audit-logs/cleanup?days=180
```

**Validation:**
- Minimum: 1 Tag
- Maximum: 365 Tage
- Default: 90 Tage

**Response:**
```json
{
  "message": "Alte Audit-Logs gelöscht",
  "deleted_count": 523,
  "older_than_days": 90
}
```

**Error Response (400):**
```json
{
  "detail": "Days parameter must be between 1 and 365"
}
```

### POST /audit-logs/delete-all - Alle Logs löschen

**⚠️ KRITISCHE OPERATION - Admin-Passwort erforderlich**

**Request Body:**
```json
{
  "password": "admin-password"
}
```

**Response:**
```json
{
  "message": "Alle Audit-Logs gelöscht",
  "deleted_count": 1523
}
```

---

## 🔄 Admin - Token Management

### GET /proxmox/token-info - Token-Alter abrufen

**Response:**
```json
{
  "configured": true,
  "token_name": "root@pam!dashboard-token",
  "created_at": "2025-09-01T10:00:00",
  "last_rotated": "2025-11-01T14:30:00",
  "age_days": 6,
  "rotation_recommended": false
}
```

**Empfehlung:** Token sollte alle 60 Tage rotiert werden.

### POST /proxmox/rotate-token - Token rotieren

**Request Body:**
```json
{
  "token_name": "root@pam!dashboard-token-new",
  "token_value": "new-token-value-here"
}
```

**Response:**
```json
{
  "message": "Token rotated successfully"
}
```

**Audit-Logging:**
- `ROTATE_TOKEN` - Token wurde rotiert

---

## 🛡️ Security Headers

Alle Responses enthalten folgende Security Headers:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

---

## 🚨 Error Responses

### Standard Error Format

```json
{
  "detail": "Error message"
}
```

### HTTP Status Codes

| Code | Bedeutung | Beispiel |
|------|-----------|----------|
| `200` | OK | Erfolgreiche GET-Anfrage |
| `401` | Unauthorized | Ungültiges JWT-Token |
| `403` | Forbidden | Unzureichende Rechte |
| `404` | Not Found | Ressource nicht gefunden |
| `422` | Unprocessable Entity | Validierungsfehler |
| `429` | Too Many Requests | Rate-Limit überschritten |
| `500` | Internal Server Error | Server-Fehler |

---

## 📝 Beispiel: Vollständiger Workflow

### 1. Login
```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"password":"admin-password"}'
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 7200
}
```

### 2. VMs abrufen
```bash
curl -X GET http://localhost:8000/api/proxmox/vms \
  -H "Authorization: Bearer eyJhbGc..."
```

### 3. VM starten
```bash
curl -X POST http://localhost:8000/api/proxmox/vm/138/start?vm_type=qemu \
  -H "Authorization: Bearer eyJhbGc..."
```

### 4. Audit-Logs prüfen
```bash
curl -X GET http://localhost:8000/api/admin/audit-logs?limit=10 \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## 📚 Weitere Dokumentation

- **[README.md](README.md)** - Hauptdokumentation
- **[RATE_LIMITS.md](RATE_LIMITS.md)** - Comprehensive Rate Limits Reference (NEW in v3.0)
- **[FINAL_SECURITY_CHECK.md](FINAL_SECURITY_CHECK.md)** - Security-Details
- **[PROXMOX_SETUP.md](PROXMOX_SETUP.md)** - Proxmox-Integration
- **[TOKEN_ROTATION_GUIDE.md](TOKEN_ROTATION_GUIDE.md)** - Token-Rotation
- **[ENCRYPTION.md](ENCRYPTION.md)** - Verschlüsselung

---

**Version:** 3.0 - Enhanced Security & Monitoring Edition  
**Last Updated:** 14.11.2025  
**Maintained by:** ServiceDock Team
