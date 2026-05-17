# 🚦 API Rate Limits - Comprehensive Reference

**Web Dashboard - Servicedock v2.0**  
**Last Updated:** 2025-11-14  
**Status:** Production Implementation

---

## 📊 Overview

All API endpoints are protected by comprehensive rate limiting using **SlowAPI** (FastAPI integration of Flask-Limiter). Rate limits are enforced per IP address and tracked in-memory with Redis-like storage.

**Key Features:**
- ✅ Per-IP rate limiting
- ✅ Automatic 429 (Too Many Requests) responses
- ✅ Real-time usage monitoring via Admin Dashboard
- ✅ Tiered limits based on operation sensitivity
- ✅ Failed attempts contribute to rate limits (prevents brute-force)

---

## 🔐 Authentication Endpoints

| Endpoint | Method | Rate Limit | Purpose |
|----------|--------|------------|---------|
| `/api/auth/login` | POST | **5/minute** | User login - strict limit to prevent brute-force |
| `/api/auth/refresh` | POST | **10/minute** | Token refresh - moderate limit |
| `/api/auth/logout` | POST | None | Logout (cookie deletion) |
| `/api/auth/verify` | GET | None | Token verification |

**Security Features:**
- Failed login attempts count toward rate limit
- IP-based lockout after 5 failed attempts in 1 minute
- Audit logging of all authentication attempts

---

## 🖥️ Proxmox API Endpoints

| Endpoint | Method | Rate Limit | Purpose |
|----------|--------|------------|---------|
| `/api/proxmox/config` | GET | **30/minute** | Get Proxmox configuration |
| `/api/proxmox/config` | POST | **5/minute** | Update Proxmox config (strict) |
| `/api/proxmox/nodes` | GET | **20/minute** | List available nodes |
| `/api/proxmox/vms` | POST | **30/minute** | Start/Stop/Restart VM/LXC containers |
| `/api/proxmox/vms/start-all` | POST | **30/minute** | Batch start operations (10+ VMs) |
| `/api/proxmox/vms/shutdown-all` | POST | **30/minute** | Batch shutdown operations (10+ VMs) |

**Notable Changes:**
- VM operations increased from **5/minute → 30/minute** to support batch operations
- Config reads relaxed to 30/minute for dashboard polling
- Config writes remain strict at 5/minute (security-sensitive)

---

## 🛡️ Admin Panel Endpoints

| Endpoint | Method | Rate Limit | Purpose |
|----------|--------|------------|---------|
| `/api/admin/audit-logs` | GET | **30/minute** | Retrieve audit logs with filtering |
| `/api/admin/audit-stats` | GET | **30/minute** | Get audit statistics + security threats |
| `/api/admin/rate-limit-usage` | GET | **30/minute** | Live rate limit usage monitoring |
| `/api/admin/cleanup` | DELETE | **10/hour** | Cleanup old logs (very strict) |
| `/api/admin/delete-all-logs` | DELETE | **3/hour** | Delete ALL logs (extremely strict) |

**Security Features:**
- All endpoints require **admin role**
- Cleanup operations heavily rate-limited (destructive actions)
- Audit logging of all admin actions
- Real-time monitoring shows usage percentages

**New Endpoints (v3.0):**
- `audit-stats`: Now includes `security_threats` object (failed_logins, blocked_ips, permission_errors)
- `rate-limit-usage`: Returns live usage for login/proxmox_view/proxmox_control/admin buckets

---

## 🎴 Services (Service Cards)

| Endpoint | Method | Rate Limit | Purpose |
|----------|--------|------------|---------|
| `/api/services` | GET | **60/minute** | List all services (read-heavy) |
| `/api/services` | POST | **10/minute** | Create new service card |
| `/api/services/reorder` | POST | **20/minute** | Reorder service cards |
| `/api/services/{id}` | PUT | **20/minute** | Update service card |
| `/api/services/{id}` | DELETE | **10/minute** | Delete service card |

**Rationale:**
- Read operations (60/min) - generous for dashboard polling
- Create/Delete (10/min) - prevent spam and abuse
- Update/Reorder (20/min) - moderate for user interactions

---

## 🔗 Shortcuts

| Endpoint | Method | Rate Limit | Purpose |
|----------|--------|------------|---------|
| `/api/shortcuts` | GET | **60/minute** | List all shortcuts (read-heavy) |
| `/api/shortcuts` | POST | **10/minute** | Create new shortcut |
| `/api/shortcuts/{id}` | PUT | **20/minute** | Update shortcut |
| `/api/shortcuts/{id}` | DELETE | **10/minute** | Delete shortcut |
| `/api/shortcuts/reorder` | POST | **20/minute** | Reorder shortcuts |

**Same pattern as Services:**
- Read-heavy: 60/minute
- Writes: 10-20/minute based on sensitivity

---

## 🎨 Appearance Settings

| Endpoint | Method | Rate Limit | Purpose |
|----------|--------|------------|---------|
| `/api/appearance` | GET | **60/minute** | Get UI appearance settings |
| `/api/appearance` | PUT | **20/minute** | Update appearance (prevent UI spam) |

**Rationale:**
- Read operations (60/min) - supports frequent theme checks
- Update operations (20/min) - prevents UI thrashing from rapid changes

---

## 🎵 Spotify Integration

| Endpoint | Method | Rate Limit | Purpose |
|----------|--------|------------|---------|
| `/api/spotify/install` | POST | **5/hour** | Install Spotify addon (very strict) |
| `/api/spotify/config` | GET | **30/minute** | Get Spotify configuration |
| `/api/spotify/config` | POST | **30/minute** | Update Spotify config |
| `/api/spotify/oauth/callback` | GET | **5/minute** | OAuth callback handler |
| `/api/spotify/current-track` | GET | None* | Get currently playing track |

**Notes:**
- Install operations extremely limited (5/hour) - destructive action
- Config operations moderate (30/min) - allows normal usage
- Current track polling uses Spotify API rate limits (not our SlowAPI)

---

## 📈 Rate Limit Usage Monitoring

The **Security Dashboard** (`/admin`) displays real-time rate limit usage:

```javascript
// Example rate limit usage response
{
  "login": { "used": 2, "limit": 5, "percentage": 40 },
  "proxmox_view": { "used": 15, "limit": 30, "percentage": 50 },
  "proxmox_control": { "used": 1, "limit": 30, "percentage": 3 },
  "admin": { "used": 8, "limit": 30, "percentage": 27 }
}
```

**Visual Indicators:**
- 🟢 Green: 0-60% usage (safe)
- 🟠 Orange: 61-80% usage (warning)
- 🔴 Red: 81-100% usage (critical)

---

## 🛠️ Implementation Details

### Technology Stack
- **SlowAPI** - FastAPI rate limiting middleware
- **In-Memory Storage** - Redis-like bucket tracking per IP
- **Decorator-Based** - `@limiter.limit("X/timeframe")` on each endpoint

### Code Location
All rate limits are defined in the routers:
```
backend/routers/
├── auth.py          # Auth endpoints (5-10/min)
├── proxmox.py       # Proxmox endpoints (5-30/min)
├── admin.py         # Admin endpoints (3/hour - 30/min)
├── services.py      # Services endpoints (10-60/min)
├── shortcuts.py     # Shortcuts endpoints (10-60/min)
├── appearance.py    # Appearance endpoints (20-60/min)
└── spotify.py       # Spotify endpoints (5/hour - 30/min)
```

### Rate Limit Response Format
```json
{
  "detail": "Rate limit exceeded: 5 per minute"
}
```
**HTTP Status Code:** `429 Too Many Requests`

---

## 🔍 Audit Logging

All rate-limited endpoints log requests to the audit system:

**Logged Events:**
- ✅ Login attempts (success/failure)
- ✅ VM operations (start/stop/restart)
- ✅ Admin actions (log cleanup, config changes)
- ✅ Failed authorization attempts
- ✅ Rate limit violations

**Filtering Options:**
- `all` - All audit events
- `failed` - Only failed operations
- `failed_logins` - Failed authentication attempts
- `permission_errors` - Authorization failures
- `vm_operations` - Proxmox VM actions
- `success` - Successful operations only

---

## 📊 Security Threats Dashboard

The Security Dashboard tracks critical metrics:

| Metric | Description | Source |
|--------|-------------|--------|
| **Failed Logins** | Login attempts with wrong credentials | `event_type = 'failed_login'` |
| **Blocked IPs** | Distinct IPs with failed attempts | Aggregated from audit logs |
| **Permission Errors** | Authorization failures | `details LIKE '%403%'` or permission-related |
| **Suspicious Activity** | Combined threat indicator | Sum of above metrics |

---

## 🎯 Best Practices

### For Developers
1. **Always test rate limits** - Use multiple IPs or wait for reset
2. **Monitor usage** - Check Security Dashboard for bottlenecks
3. **Adjust incrementally** - Increase limits based on real usage patterns
4. **Log everything** - Audit logs help identify abuse patterns

### For Administrators
1. **Review Security Threats** - Check dashboard daily for anomalies
2. **Adjust limits** - Modify `@limiter.limit()` decorators as needed
3. **Monitor false positives** - Legitimate users may hit limits with automation
4. **Whitelist if needed** - Consider IP whitelisting for internal services

### For API Consumers
1. **Implement retry logic** - Handle 429 responses gracefully
2. **Cache responses** - Don't poll unnecessarily (use WebSockets if available)
3. **Batch operations** - Use batch endpoints (e.g., start-all) instead of loops
4. **Respect limits** - Don't attempt to circumvent rate limiting

---

## 🔧 Configuration

### Modifying Rate Limits

Edit the decorator in the respective router file:

```python
# Before (strict)
@limiter.limit("5/minute")
async def get_services(request: Request):
    ...

# After (relaxed)
@limiter.limit("60/minute")
async def get_services(request: Request):
    ...
```

### Global Rate Limits

Global limits are configured in `backend/core/limiter.py`:

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["1000/hour"],  # Global fallback
    storage_uri="memory://",
)
```

---

## 📚 Related Documentation

- **API_DOCUMENTATION.md** - Full API reference
- **[README.md](../README.md)** - Project overview
- **ENCRYPTION.md** - Encryption & security keys
- **HTTPS_SETUP.md** - SSL/TLS configuration

---

## 📞 Support

**Rate Limit Issues?**
1. Check Security Dashboard for current usage
2. Review audit logs for failed attempts
3. Verify IP address isn't rate-limited
4. Contact admin for limit adjustments

**False Positives?**
- Internal services may need whitelisting
- Automation scripts should implement exponential backoff
- Consider increasing limits for legitimate high-frequency operations

---

**Last Modified:** 2025-11-14  
**Author:** Servicedock Development Team  
**Version:** 3.0 (Comprehensive Rate Limiting Update)
