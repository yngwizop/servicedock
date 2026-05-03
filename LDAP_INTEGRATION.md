# AD / LDAP integration — ServiceDock

## Overview

ServiceDock supports **Active Directory / LDAP authentication** as an optional add-on. AD users sign in with their domain account; the role (admin or viewer) is determined by group membership.

**Features:**
- AD login with username + password (UPN bind: `user@domain`)
- Role mapping via AD groups (admin group / viewer group)
- Automatic fallback to local login when no username is provided
- Viewer role: read-only dashboard (no edit mode, no settings)
- LDAP over SSL (LDAPS) or StartTLS
- Bind password stored encrypted in the database (Fernet)
- Full configuration in the web UI (Settings → AddOns → LDAP/AD)

---

## Prerequisites

- **Active Directory domain controller** (e.g. Samba AD DC or Windows Server AD DS)
- **Service account** in AD with read rights (for user search)
- **Two AD groups** for roles:
  - One group for **admins** (full access)
  - One group for **viewers** (read-only)
- **ldap3** Python package (already in `requirements.txt`: `ldap3>=2.9.1`)

---

## Prepare Active Directory

### 1. Create a service account

Create a dedicated service account with read-only rights:

```bash
# Samba AD DC example:
samba-tool user create svc_servicedock --random-password
samba-tool user setexpiry svc_servicedock --noexpiry
```

### 2. Create groups

Create two security groups for role mapping:

```bash
# Admin group
samba-tool group add ServiceDock-Admins

# Viewer group
samba-tool group add ServiceDock-Viewers
```

### 3. Add users to groups

```bash
# Add admin user
samba-tool group addmembers ServiceDock-Admins adminuser

# Add viewer user
samba-tool group addmembers ServiceDock-Viewers vieweruser
```

### 4. Look up group DNs

```bash
# Look up group DN
samba-tool group show ServiceDock-Admins | grep dn
# → dn: CN=ServiceDock-Admins,CN=Users,DC=domain,DC=local

samba-tool group show ServiceDock-Viewers | grep dn
# → dn: CN=ServiceDock-Viewers,CN=Users,DC=domain,DC=local
```

---

## Configure ServiceDock

### Web UI

1. Sign in as **local admin**
2. **Settings** → **AddOns** → **LDAP / Active Directory** → **Configure**
3. Fill in the form:

| Field | Description | Example |
|------|-------------|---------|
| **LDAP host** | Hostname/IP of the domain controller | `ldap.example.com` |
| **Port** | LDAP port (`389` or `636` for LDAPS) | `389` |
| **SSL** | Enable LDAPS (port 636) | ☐ |
| **StartTLS** | StartTLS on port 389 | ☐ |
| **Base DN** | LDAP search base | `DC=domain,DC=local` |
| **User search base** | Where users are searched | `CN=Users` (relative) or `CN=Users,DC=domain,DC=local` (absolute) |
| **Bind DN** | Distinguished name of the service account | `CN=svc_servicedock,CN=Users,DC=domain,DC=local` |
| **Bind password** | Service account password | *(stored encrypted)* |
| **User attribute** | LDAP attribute for the username | `sAMAccountName` (default for AD) |
| **Domain** | AD domain for UPN bind | `domain.local` |
| **Admin group DN** | DN of the admin group | `CN=ServiceDock-Admins,CN=Users,DC=domain,DC=local` |
| **Viewer group DN** | DN of the viewer group | `CN=ServiceDock-Viewers,CN=Users,DC=domain,DC=local` |

4. **Test connection** → shows user count and group details  
5. **Save** → configuration is persisted in the database  
6. **Enable** with the toggle switch

### Configuration notes

- **User search base:** Can be relative (`CN=Users`) or absolute (`CN=Users,DC=domain,DC=local`). Relative values are combined with the base DN automatically.
- **User attribute:** `sAMAccountName` is the default for Microsoft AD and Samba AD. Use `uid` for typical OpenLDAP layouts.
- **Domain:** Used for UPN bind (`username@domain`). Must be the AD DNS domain.
- **Group check:** Admin group wins. If a user is in both groups, they get admin rights.
- **No group match:** Users in neither group are denied (login fails).

---

## Login flow

```
┌────────────────────────────────────────────────────────────┐
│                     Login flow                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. Frontend calls GET /api/auth/mode                      │
│     → { ad_enabled: true, domain: "domain.local" }         │
│     → Shows username field on login dialog                 │
│                                                            │
│  2. User enters username + password                          │
│     → POST /api/login { username, password }               │
│                                                            │
│  3. Backend checks: username present + AD enabled?         │
│     ├─ YES → LDAP authentication:                          │
│     │   a) Service account binds to DC                     │
│     │   b) Search user by sAMAccountName                   │
│     │   c) Re-bind with user credentials (user@domain)     │
│     │   d) Check group membership → role                   │
│     │   e) Issue JWT with role + auth_method="ad"          │
│     │                                                      │
│     └─ NO → Local login:                                   │
│         a) Verify password against ADMIN_PASSWORD hash     │
│         b) Issue JWT with role="admin" + auth_method="local"│
│                                                            │
│  4. JWT set as httpOnly cookie                             │
│    → { sub, type (admin/viewer), auth_method, display_name}│
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Username formats

The login accepts:
- `jdoe` — preferred (plain `sAMAccountName`)
- `jdoe@domain.local` — UPN is detected; domain suffix is stripped

---

## Roles & permissions

| Feature | Admin | Viewer |
|---------|:-----:|:------:|
| View dashboard | ✅ | ✅ |
| View services / shortcuts | ✅ | ✅ |
| Background / wallpaper | ✅ | ✅ |
| Edit mode | ✅ | ❌ |
| Edit services / shortcuts | ✅ | ❌ |
| Proxmox tab | ✅ | ❌ |
| Security tab | ✅ | ❌ |
| Settings | ✅ | ❌ |
| Add item (FAB) | ✅ | ❌ |

### Implementation

- **Backend:** `require_any_role("admin", "viewer")` for read endpoints (services, shortcuts, dashboards, appearance). Write endpoints remain `require_role("admin")`.
- **Frontend:** `isAdmin` controls edit mode, FAB, and sidebar tabs (Proxmox, Security, Settings).
- **Public endpoints** (no auth):
  - `GET /api/auth/mode` — whether AD is enabled
  - `GET /api/appearance/wallpaper` — login page background

---

## Security

### Bind password encryption

The service account bind password is stored **encrypted with Fernet** (AES-128-CBC). The key (`ENCRYPTION_KEY`) lives in `.env`.

### SSL/TLS
- **LDAPS** (port 636): encrypted from the start
- **StartTLS** (port 389): upgrade to TLS after connect
- **Plain LDAP** (port 389): **lab only** — passwords travel in clear text.

> ⚠️ **Recommendation:** Always use LDAPS or StartTLS in production.

### Self-signed certificates

For self-signed CAs (e.g. Samba AD), `validate=ssl.CERT_NONE` may be used. In production, install the CA certificate properly.

### Rate limiting

LDAP logins use the same limits as local logins:
- **slowapi:** 5 login attempts per minute
- **IP tracker:** lockout after repeated failures

### Config cache

LDAP settings are cached for **60 seconds** to avoid hitting the database on every login. The cache is invalidated when you save changes in the UI.

---

## Database

### `ldap_config` table

```sql
CREATE TABLE IF NOT EXISTS ldap_config (
    id INT PRIMARY KEY DEFAULT 1,
    enabled BOOLEAN DEFAULT FALSE,
    host VARCHAR(255) NOT NULL,
    port INT DEFAULT 389,
    use_ssl BOOLEAN DEFAULT FALSE,
    use_starttls BOOLEAN DEFAULT FALSE,
    base_dn VARCHAR(500) NOT NULL,
    user_search_base VARCHAR(500),
    bind_dn VARCHAR(500),
    bind_password TEXT,                   -- Fernet encrypted
    user_attribute VARCHAR(100) DEFAULT 'sAMAccountName',
    domain VARCHAR(255),
    admin_group_dn VARCHAR(500),
    viewer_group_dn VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT ldap_single_row CHECK (id = 1)
);
```

This table is a singleton (only `id = 1`), similar to `appearance` and `spotify_config`.

---

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/auth/mode` | No | AD status (`ad_enabled`, `domain`) |
| `POST` | `/api/login` | No | Login (AD + local fallback) |
| `GET` | `/api/ldap/config` | Admin | Read LDAP configuration |
| `POST` | `/api/ldap/config` | Admin | Save LDAP configuration |
| `DELETE` | `/api/ldap/config` | Admin | Remove LDAP configuration (uninstall) |
| `POST` | `/api/ldap/test` | Admin | Test LDAP connectivity |
| `PUT` | `/api/ldap/toggle` | Admin | Enable / disable LDAP |
| `GET` | `/api/appearance/wallpaper` | No | Wallpaper for login page |

---

## Related files

| File | Description |
|------|-------------|
| `backend/core/ldap_auth.py` | LDAP core: config cache, auth, roles, connection test |
| `backend/routers/auth.py` | Login with AD + local fallback, `/api/auth/mode` |
| `backend/routers/admin.py` | LDAP CRUD, test, toggle under `/api/ldap/*` |
| `backend/dependencies/auth.py` | `require_any_role()` for viewer + admin |
| `frontend/src/hooks/useAuth.js` | AD state, `/api/auth/mode` |
| `frontend/src/components/LoginModal.jsx` | Username field and login when AD is on |
| `frontend/src/components/settings/LdapAddon.jsx` | LDAP form in Settings → AddOns |
| `frontend/src/components/Sidebar.jsx` | Viewer guards (hide edit, Proxmox, security, settings) |
| `frontend/src/i18n/locales/de.json` | German UI strings for LDAP/AD |
| `frontend/src/i18n/locales/en.json` | English UI strings for LDAP/AD |
| `db/init.sql` | `ldap_config` schema |

---

## Troubleshooting

### "Invalid credentials" with a correct password
- Confirm the user is in the admin or viewer group
- Without group membership, login is denied
- Check backend logs: `docker compose logs backend | grep LDAP`

### "User not found"
- Verify `user_search_base` covers the OU/CN that contains the user
- Relative values (e.g. `CN=Users`) are combined with the base DN
- Check `user_attribute` — default `sAMAccountName` (AD); OpenLDAP may need `uid`

### Connection test fails
- Host and port (`389` LDAP, `636` LDAPS)
- Firewall: the backend container must reach the DC
- Bind DN and bind password
- For SSL issues: try without SSL in a lab first

### Viewer sees a white background
- Should be resolved — `GET /api/appearance/wallpaper` is public
- If not: clear browser cache and reload

### Cache issues after manual DB edits
- Config cache TTL is 60 seconds
- UI saves invalidate the cache automatically
- For raw SQL changes: restart the backend or wait 60s
