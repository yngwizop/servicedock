# 🖥️ Proxmox monitoring setup guide

## Overview

Servicedock can monitor and manage your Proxmox VMs and LXC containers. This guide walks you through a secure setup with encrypted token storage.

**Features:**

> **Note:** All Proxmox API calls and the dashboard are reached on your LAN via the central Nginx URL `https://10.10.10.50`. The database is only reachable inside the Docker network.
- 📊 Live status for all VMs / containers
- 🚀 Remote control (start / stop / reboot)
- 📈 Resource monitoring (CPU, RAM, disk)
- 🔒 Encrypted token storage (Fernet AES-128)
- 📝 Audit logging for actions
- ⏱️ Rate limiting (DoS protection)

---

## ✅ What is implemented

### Backend
- ✅ Proxmox API integration via `proxmoxer`
- ✅ Endpoints for VM/LXC management (`/api/proxmox/*`)
- ✅ **Encrypted storage** of API credentials (Fernet AES-128)
- ✅ Start / stop / reboot for VMs and containers
- ✅ Rate limits: 30/min views, 10/min control
- ✅ Audit logging for Proxmox actions
- ✅ Token rotation tracking (60-day recommendation)

### Frontend
- ✅ **Proxmox** tab in Settings
- ✅ Proxmox card with live status
- ✅ Resource monitoring (CPU, RAM, disk, uptime)
- ✅ Auto-refresh every 30 seconds (can be disabled)
- ✅ Configuration in Settings
- ✅ Filter & sort (6 options)

---

## 🚀 Setup steps

### 1. Create a Proxmox API token

1. Log in to the Proxmox web UI
2. Go to **Datacenter → Permissions → API Tokens**
3. Click **Add**
4. Configure:
   - **User:** pick a user (e.g. `root@pam`)
   - **Token ID:** choose a name (e.g. `dashboard`)
   - **Privilege separation:** ✅ enabled (recommended)
   - Click **Add**

5. **Important:** copy the secret immediately — it is shown only once.
   ```
   Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

### 2. Assign permissions (if privilege separation is enabled)

If you enabled privilege separation, grant the token permissions:

1. Go to **Datacenter → Permissions**
2. Click **Add → API Token Permission**
3. Configure:
   - **Path:** `/` (all VMs/LXCs)
   - **API Token:** select your token
   - **Role:**
     - `PVEAuditor` (read-only monitoring) ✅ recommended
     - `PVEVMAdmin` (includes start/stop/reboot)
   - Click **Add**

**Security tip:** start with `PVEAuditor`. Upgrade to `PVEVMAdmin` only if you need control actions.

### 3. Configure the dashboard

1. Start the stack (if not running):
   ```bash
   cd /home/servicedock
   docker compose up -d
   ```

2. Open the dashboard and sign in as admin
   ```
   http://your-server-ip:3000
   ```

3. Open **Settings** (gear icon)

4. Open the **Proxmox** tab

5. Fill in the form:
   - **Proxmox host / IP:** IP or hostname (e.g. `192.168.1.100`)
   - **Port:** `8006` (default)
   - **API token name:** format `user@realm!tokenid` (e.g. `root@pam!dashboard`)
   - **API token secret:** the secret you copied when creating the token
   - **Node name:** optional — leave empty for all nodes, or set a specific node
   - **Verify SSL certificate:**
     - ✅ on for production with valid certs
     - ❌ off for self-signed certs (typical homelab)

6. Click **Save Proxmox configuration**

**On save:**
- ✅ Token is encrypted with Fernet (AES-128)
- ✅ Only ciphertext is stored in the database
- ✅ `token_created_at` is set to now
- ✅ A connection test runs

### 4. Verify encryption (optional)

```bash
docker compose exec db psql -U dashboard_user -d dashboard -c \
  "SELECT id, host, token_name, substring(token_value, 1, 20) as encrypted_token FROM proxmox_config;"
```

**Expected:**
```
 id |      host       |        token_name         |   encrypted_token    
----+-----------------+---------------------------+---------------------
  1 | 192.168.1.100   | root@pam!dashboard        | gAAAAABpC5U8QaM...
```

✅ **Encrypted:** starts with `gAAAAAB...`  
❌ **Plain:** UUID-style `xxxxxxxx-xxxx-...`

See [ENCRYPTION.md](ENCRYPTION.md) for encryption details.

### 5. Use the monitoring tab

1. Open the **Proxmox** monitoring tab
2. You should see VMs and containers with:
   - Status (running / stopped)
   - CPU usage
   - RAM (used / total)
   - Disk (used / total)
   - Uptime

3. As admin you can control instances:
   - **▶️ Start** stopped VM/container
   - **⏹️ Stop** running VM/container
   - **🔄 Reboot** running VM/container

4. **Auto-refresh:** default every 30 seconds; can be disabled with the checkbox

---

## 📊 Features

### Auto refresh
- Default: every 30 seconds
- Can be disabled via checkbox
- Manual refresh button available

### Status indicators
- 🟢 **Green:** running
- 🔴 **Red:** stopped
- ⚪ **Gray:** unknown

### Resources (running guests)
- CPU %
- RAM used / total
- Disk used / total
- Uptime

### Control actions (admin only)
- ▶️ **Start**
- ⏹️ **Stop**
- 🔄 **Reboot**

## 🔒 Security

### Recommended token roles

**Read-only monitoring (safest):**
```
Role: PVEAuditor
Path: /
```
- ✅ List guests and status
- ❌ Cannot start/stop/reboot

**Full control:**
```
Role: PVEVMAdmin
Path: /
```
- ✅ Includes start/stop/reboot
- ⚠️ Higher impact if the token leaks

### Token encryption

- **Algorithm:** Fernet (AES-128 CBC + HMAC)
- **Key:** `ENCRYPTION_KEY` from `.env`
- **Storage:** ciphertext only in PostgreSQL
- **Decryption:** only in the backend at runtime

⚠️ **Do not change `ENCRYPTION_KEY` casually.** See [RE_ENCRYPTION_GUIDE.md](RE_ENCRYPTION_GUIDE.md).

### Token rotation

Recommended: **every 60 days** create a new token.

```bash
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:8000/api/admin/proxmox/token-info?dashboard_id=1
```

See [TOKEN_ROTATION_GUIDE.md](TOKEN_ROTATION_GUIDE.md).

### Rate limiting

- **List / view:** 30 requests/minute
- **Control:** 10 requests/minute
- **Audit:** actions are logged

### SSL
- **Production:** keep certificate verification enabled
- **Homelab:** disable verification for self-signed Proxmox certs

---

## 🐛 Troubleshooting

### "Proxmox not configured"
→ Settings → Proxmox and save a valid configuration

### "Failed to connect to Proxmox"
Check:
- Correct IP/hostname
- Host reachable (firewall?)
- Port (default `8006`)
- SSL verification vs self-signed cert

### "Authentication failed"
- Token name format: `user@realm!tokenid`
- Token secret (UUID)
- Token not revoked in Proxmox

### "Permission denied"
- Token lacks role/path permissions
- Proxmox → Permissions → API token permissions

### No VMs shown
- Token can see those objects
- Guests exist on the expected node
- If a node filter is set, verify the node name

## 📝 API endpoints

```
GET  /api/proxmox/config         — read configuration
PUT  /api/proxmox/config         — save configuration
GET  /api/proxmox/vms            — list VMs/LXCs
POST /api/proxmox/vm/{id}/start  — start
POST /api/proxmox/vm/{id}/stop   — stop
POST /api/proxmox/vm/{id}/reboot — reboot
```

## 🎨 Customization

### Change refresh interval
In `ProxmoxGrid.jsx` around line 60:
```javascript
const interval = setInterval(() => {
  fetchProxmoxData();
}, 30000); // change 30000 to desired ms
```

### Change grid columns
In `ProxmoxGrid.jsx` around line 180:
```javascript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```
Adjust `lg:grid-cols-3` as needed.

## 📚 Further reading

- [Proxmox VE API](https://pve.proxmox.com/wiki/Proxmox_VE_API)
- [proxmoxer (PyPI)](https://pypi.org/project/proxmoxer/)

---

**Enjoy your upgraded dashboard! 🚀**
