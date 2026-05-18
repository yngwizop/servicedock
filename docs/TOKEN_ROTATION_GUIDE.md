# Proxmox API Token Rotation Guide

This document describes the complete process for renewing and verifying Proxmox API tokens.


## 📋 Table of contents

> **Note:** All API calls and OAuth redirects (e.g. Spotify) run on the local network via the central Nginx address `https://10.10.10.50`.

1. [Why rotate tokens?](#why-rotate-tokens)
2. [When to rotate?](#when-to-rotate)
3. [Step-by-step guide](#step-by-step-guide)
4. [Backend verification](#backend-verification)
5. [Troubleshooting](#troubleshooting)

---

## 🔐 Why rotate tokens?

**Security best practice:**
- Tokens should be renewed regularly (recommended: every **60 days**)
- Reduces risk if credentials are compromised
- Aligns with modern security standards

**Change:** Previously 90 days was recommended; now **60 days** for stronger security.

**Rotate immediately when:**
- ⚠️ A token was accidentally exposed (e.g. in logs, Git)
- ⚠️ There is a security incident on the network
- ⚠️ You suspect unauthorized access
- ⚠️ After staff changes (if the token was shared)

---

## 📅 When to rotate?

### Automatic warning

The dashboard shows a **red warning** in the Security tab when the token is older than **60 days**:

```
┌─────────────────────────────────┐
│ 🔴 Token Rotation          ⚠️  │
│                                 │
│ Token age: 65 days              │
│ Created on: 2025-09-01, 14:30   │
│                                 │
│ ⚠️ Rotation recommended (>60 d) │
└─────────────────────────────────┘
```

### Manual check

```bash
# Check token age (dashboard 1 is default)
curl -s http://localhost:8000/api/admin/proxmox/token-info?dashboard_id=1 | jq .

# Output:
{
  "configured": true,
  "token_name": "lxc-creator@pve!dashboard",
  "created_at": "2025-09-01T14:30:00",
  "last_rotated": null,
  "age_days": 65,
  "rotation_recommended": true  # <- rotation needed!
}
```

---

## 📝 Step-by-step guide

### Step 1: Create a new token in Proxmox

1. **Open the Proxmox web UI**
   ```
   https://192.168.178.45:8006
   ```

2. **Go to API tokens**
   ```
   Datacenter → Permissions → API Tokens
   ```

3. **Create a new token**
   - Click **Add**
   - **User**: `lxc-creator@pve` (or your existing user)
   - **Token ID**: `dashboard-2025-11` (include a date for easier tracking)
   - **Privilege Separation**: ☐ **do not** enable (token should have the same rights as the user)
   - Click **Add**

4. **Copy the token secret**
   ```
   ⚠️ IMPORTANT: The secret is shown only once!
   
   Token: lxc-creator@pve!dashboard-2025-11
   Secret: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   
   → Copy the secret immediately and store it securely!
   ```

5. **Screenshot as backup** (optional but recommended)

---

### Step 2: Update the token in the dashboard

#### Option A: Via web UI (recommended)

1. **Open the dashboard**
   ```
   http://192.168.178.83:3000
   ```

2. **Log in as admin**
   - Click the lock icon (bottom right)
   - Enter your admin password

3. **Open Settings**
   - Click the gear icon (bottom right)

4. **Select the Proxmox tab**
   - Click **Proxmox** in the tab navigation

5. **Update the token**
   ```
   Host:        192.168.178.45  (unchanged)
   Port:        8006             (unchanged)
   Token Name:  lxc-creator@pve!dashboard-2025-11  ← NEW!
   Token Value: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  ← NEW!
   Verify SSL:  ☐ (unchanged)
   Node:        Proxmox1         (optional)
   ```

   **⚠️ Important:** 
   - The token value field is empty (for security reasons)
   - You **must** enter the new token value
   - After saving, the token value disappears again (expected behavior!)

6. **Save**
   - Click **Save Proxmox configuration**
   - Wait for confirmation: "✅ Saved!"
   - `token_created_at` is automatically set to `NOW()`

#### Option B: Via API (for automation)

The endpoint expects a full Proxmox configuration body (same fields as the dashboard **Save** action: `host`, `port`, `token_name`, `token_value`, `verify_ssl`, and optional `node` / `is_cluster`). Authenticate as admin via `Authorization: Bearer <JWT>` (from login) or the `access_token` cookie. Rate limit: **5 requests/hour**.

```bash
curl -X POST http://localhost:8000/api/admin/proxmox/rotate-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -d '{
    "host": "192.168.178.45",
    "port": 8006,
    "token_name": "lxc-creator@pve!dashboard-2025-11",
    "token_value": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "verify_ssl": false,
    "node": "Proxmox1",
    "is_cluster": false
  }'

# Expected response:
{"message": "Token rotated successfully"}
```

This updates the encrypted token and sets `token_last_rotated` (used for age in `/api/admin/proxmox/token-info`).

---

### Step 3: Test the connection

1. **Open the Proxmox Monitoring tab**
   - Switch to the **Proxmox Monitoring** tab
   - The dashboard should list all VMs/containers

2. **Manual test (optional)**
   ```bash
   # Fetch VMs
   curl -s http://localhost:8000/api/proxmox/vms | jq '.resources | length'
   
   # Expected output: number of VMs (e.g. 38)
   ```

3. **If errors occur:**
   ```bash
   # Check backend logs
   docker compose logs backend --tail 50
   
   # Common errors:
   # - "401 Unauthorized" → token wrong/invalid
   # - "Connection refused" → host/port wrong
   # - "SSL Error" → check verify_ssl setting
   ```

---

### Step 4: Delete the old token in Proxmox

**⚠️ IMPORTANT: Delete only after the new token works!**

1. **Proxmox web UI**
   ```
   Datacenter → Permissions → API Tokens
   ```

2. **Find the old token**
   - Look for: `lxc-creator@pve!dashboard` (old token)

3. **Delete the token**
   - Select the token
   - Click **Remove**
   - Confirm with **Yes**

4. **Verify**
   - The old token should no longer appear in the list
   - The dashboard should still work

---

## 🔍 Backend verification

### 1. Check token encryption

**Verify that the token is encrypted in the database:**

```bash
docker compose exec -T db psql -U user -d dashboard -c \
  "SELECT id, token_name, LEFT(token_value, 50) as token_preview, LENGTH(token_value) as token_length FROM proxmox_config;"
```

**Expected output:**
```
 id |        token_name              |                   token_preview                    | token_length 
----+--------------------------------+----------------------------------------------------+--------------
  1 | lxc-creator@pve!dashboard-2025 | gAAAAABpC5U8QaM4cN7HQclpfWN4AZdkdcZHnbxSKNZZVCjx8r |          140
```

**✅ Token is encrypted if:**
- The value starts with `gAAAAAB` (Fernet header)
- Length is ~140 characters (encrypted)
- The **original** secret is **not** visible

**❌ Token is not encrypted if:**
- It looks like a UUID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- Length is ~36 characters
- → **PROBLEM: encryption not active!**

---

### 2. View the full token (for debugging only)

```bash
docker compose exec -T db psql -U user -d dashboard -c \
  "SELECT token_value FROM proxmox_config WHERE id = 1;"
```

**Expected output:**
```
gAAAAABpC5U8QaM4cN7HQclpfWN4AZdkdcZHnbxSKNZZVCjx8r-V-xvLJASx-ZZumkkAf1xWOCCiy93SCRBYZ3S6pOu7SzfHyu1fAWN0dt6wH0auFRbQzhBA11swHQSUpklgy5UX6swq
```

**Fernet token anatomy:**
```
gAAAAAB pC5U8 QaM4cN7HQclpfWN...
│       │      │
│       │      └─ Encrypted data (AES-128) + HMAC (SHA-256)
│       └──────── Timestamp (when encrypted)
└──────────────── Fernet version byte (0x80)
```

---

### 3. Check the encryption key

**Show the encryption key in use:**

```bash
docker compose exec backend python3 -c "
import os
import hashlib
import base64

password = os.getenv('ADMIN_PASSWORD', 'admin')
key_bytes = password.encode('utf-8')
hash_digest = hashlib.sha256(key_bytes).digest()
encryption_key = base64.urlsafe_b64encode(hash_digest)

print('Encryption Key (first 20 chars):', encryption_key[:20].decode())
print('Derived from: ADMIN_PASSWORD environment variable')
print('Algorithm: SHA-256 → Base64 (Fernet-compatible)')
"
```

**Expected output:**
```
Encryption Key (first 20 chars): 7NcYcNGWMxapfjrDQIyY
Derived from: ADMIN_PASSWORD environment variable
Algorithm: SHA-256 → Base64 (Fernet-compatible)
```

**Important:**
- The encryption key is derived from `ADMIN_PASSWORD`
- If you change the password, tokens must be re-encrypted!
- The key is 44 characters long (Base64-encoded 32-byte key)

---

### 4. Test token decryption (debug)

**⚠️ For debugging only! Do not run in production!**

```bash
docker compose exec backend python3 -c "
import os
import hashlib
import base64
from cryptography.fernet import Fernet
import psycopg2

# Get encryption key
password = os.getenv('ADMIN_PASSWORD', 'admin')
key_bytes = password.encode('utf-8')
hash_digest = hashlib.sha256(key_bytes).digest()
encryption_key = base64.urlsafe_b64encode(hash_digest)

# Get encrypted token from DB
conn = psycopg2.connect(
    host='db',
    database='dashboard',
    user='user',
    password='password'
)
cur = conn.cursor()
cur.execute('SELECT token_value FROM proxmox_config WHERE id = 1;')
encrypted_token = cur.fetchone()[0]

# Decrypt
cipher = Fernet(encryption_key)
decrypted = cipher.decrypt(encrypted_token.encode()).decode()

print('Decrypted Token (first 20 chars):', decrypted[:20])
print('Decrypted Token (last 10 chars):', decrypted[-10:])
print('Full length:', len(decrypted), 'characters')
print('Format looks like UUID:', '-' in decrypted and len(decrypted) == 36)
"
```

**Expected output:**
```
Decrypted Token (first 20 chars): xxxxxxxx-xxxx-xxxx-x
Decrypted Token (last 10 chars): xxxxxxxxxx
Full length: 36 characters
Format looks like UUID: True
```

**✅ Decryption succeeded if:**
- The token has UUID format (36 characters with hyphens)
- No errors from `cipher.decrypt()`

**❌ Decryption error:**
```
cryptography.fernet.InvalidToken
→ Wrong encryption key or corrupted data
```

---

### 5. Check token rotation history

```bash
docker compose exec -T db psql -U user -d dashboard -c \
  "SELECT 
    token_name,
    token_created_at,
    token_last_rotated,
    EXTRACT(DAY FROM (NOW() - token_created_at)) as age_days
  FROM proxmox_config WHERE id = 1;"
```

**Expected output:**
```
        token_name              |     token_created_at     | token_last_rotated | age_days 
--------------------------------+--------------------------+--------------------+----------
 lxc-creator@pve!dashboard-2025 | 2025-11-05 18:45:00      | NULL               |        0
```

**After rotation:**
```
        token_name              |     token_created_at     |   token_last_rotated    | age_days 
--------------------------------+--------------------------+-------------------------+----------
 lxc-creator@pve!dashboard-2025 | 2025-11-05 18:45:00      | 2025-11-05 18:45:00     |        0
```

---

### 6. Check the rotation audit log

```bash
curl -s "http://localhost:8000/api/admin/audit-logs?limit=5" | jq '.logs[] | select(.action | contains("TOKEN"))'
```

**Expected output:**
```json
{
  "id": 45,
  "timestamp": "2025-11-05T18:45:00",
  "user_type": "admin",
  "ip_address": "192.168.178.83",
  "action": "ROTATE_TOKEN",
  "resource_type": "proxmox_token",
  "status": "success",
  "details": {
    "old_token_age_days": 65,
    "new_token_name": "lxc-creator@pve!dashboard-2025-11"
  }
}
```

---

## 🔧 Troubleshooting

### Issue 1: "Token is not encrypted"

**Symptom:**
```sql
token_value: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  (plaintext!)
```

**Cause:**
- Encryption was disabled before storing the token
- Old token from before the encryption feature existed

**Fix:**
```bash
# Encrypt tokens manually
docker compose exec backend python3 /app/migrate_encrypt_tokens.py
```

---

### Issue 2: "InvalidToken when decrypting"

**Symptom:**
```
cryptography.fernet.InvalidToken: 
```

**Cause:**
- `ADMIN_PASSWORD` was changed
- Token was encrypted with a different key

**Fix:**
```bash
# 1. Delete the old token in Proxmox
# 2. Create a new token
# 3. Save it in the dashboard (encrypted with the current key)
```

---

### Issue 3: "401 Unauthorized" on Proxmox access

**Symptom:**
```json
{
  "error": "401 Unauthorized"
}
```

**Cause:**
- Token was deleted/disabled in Proxmox
- Token name formatted incorrectly
- User lacks permissions

**Fix:**
```bash
# 1. Check token format
curl -s http://localhost:8000/api/proxmox/config | jq .token_name
# Must be: "user@realm!tokenid"

# 2. Verify token in Proxmox
# Datacenter → Permissions → API Tokens
# → Token must exist and be active

# 3. Check user permissions
# Datacenter → Permissions → Users
# → User needs at least VM.Monitor, VM.PowerMgmt
```

---

### Issue 4: Token age is not updated

**Symptom:**
```json
{
  "age_days": 65,  // stale!
  "rotation_recommended": true
}
```

**Cause:**
- `token_created_at` was not updated
- Token value was not re-entered (frontend sends empty string)

**Fix:**
```bash
# Option 1: Re-enter in the dashboard
# 1. Settings → Proxmox tab
# 2. Re-enter token value (important!)
# 3. Save

# Option 2: Update manually in the DB
docker compose exec -T db psql -U user -d dashboard -c \
  "UPDATE proxmox_config 
   SET token_created_at = NOW(), 
       token_last_rotated = NOW() 
   WHERE id = 1;"

# Option 3: Check whether token_value was sent
docker compose logs backend | grep "token_value received"
# Should show: "YES (length: 36)"
```

**Important:** For security, the token value is **not** shown in the frontend. You must enter it again on every rotation!

---

### Issue 5: "Dashboard shows no VMs"

**Symptom:**
- Proxmox Monitoring tab is empty
- Error: "Failed to fetch Proxmox data"

**Diagnosis:**
```bash
# 1. Check backend logs
docker compose logs backend --tail 50 | grep -i proxmox

# 2. Check Proxmox config
curl -s http://localhost:8000/api/proxmox/config | jq .

# 3. Manual API request
curl -s http://localhost:8000/api/proxmox/vms | jq .
```

**Common causes:**
- Token was deleted in Proxmox (old one removed too early)
- Wrong host/port
- Network issue between dashboard and Proxmox
- Proxmox server offline

---

## 📊 Post-rotation checklist

- [ ] New token created in Proxmox
- [ ] Token saved in the dashboard
- [ ] Token encrypted in the database (`gAAAAAB...`)
- [ ] Token age reset (0 days)
- [ ] Proxmox Monitoring lists all VMs
- [ ] Start/stop/reboot works
- [ ] Old token removed in Proxmox
- [ ] Audit log shows rotation entry
- [ ] Security dashboard shows green status

---

## 🔐 Best practices

### Security

1. **Never share tokens**
   - Each admin should have their own token
   - Format: `admin-name@pve!dashboard-YYYY-MM`

2. **Store token secrets securely**
   - Password manager (e.g. Bitwarden, KeePass)
   - Do **not** commit to Git
   - Do **not** print to logs

3. **Rotate regularly**
   - Every 60 days (or when the dashboard warns)
   - Immediately after security incidents

4. **Backup the encryption key**
   - Store `ADMIN_PASSWORD` securely
   - If lost: you must recreate all tokens

### Documentation

1. **Token names with dates**
   ```
   dashboard-2025-11
   dashboard-2025-12
   dashboard-2026-01
   ```

2. **Keep a rotation log**
   ```
   2025-11-05 - Token rotated (previous: 65 days)
   2026-01-04 - Token rotated (previous: 60 days)
   ```

3. **Screenshots when creating tokens**
   - Backup if the secret is lost

---

## 🔐 ADMIN_PASSWORD change (re-encryption)

### Problem
If you change your `ADMIN_PASSWORD`, encrypted tokens can no longer be decrypted, because the encryption key is derived from the password!

### ⚠️ Symptoms after a password change
- Proxmox Monitoring shows no VMs
- Backend log: `Decryption error: InvalidToken`
- 401 Unauthorized when accessing Proxmox

### Solution: re-encryption script

#### Step 1: Create a backup
```bash
# Database backup
docker compose exec db pg_dump -U user dashboard > backup_$(date +%Y%m%d).sql
```

#### Step 2: Run re-encryption
```bash
# Start the script
docker compose exec backend python3 /app/re_encrypt_tokens.py
```

The script prompts and log lines are in **German** in the current codebase. You should see prompts like:

- `Altes ADMIN_PASSWORD:` (old password)  
- `Neues ADMIN_PASSWORD:` (new password)  
- `Neues ADMIN_PASSWORD bestätigen:` (confirm new password)

On success, output includes lines such as:

- `✅ Entschlüsselung mit altem Passwort erfolgreich`
- `✅ Verschlüsselung mit neuem Passwort erfolgreich`
- `✅ Token erfolgreich re-encrypted!`
- `✅ Verifikation erfolgreich!`
- `🎉 Token kann jetzt mit neuem ADMIN_PASSWORD entschlüsselt werden`

#### Step 3: Update docker-compose.yml
```yaml
services:
  backend:
    environment:
      - ADMIN_PASSWORD=your-new-password  # ← CHANGE HERE
```

#### Step 4: Restart the backend
```bash
docker compose restart backend
```

#### Step 5: Test
```bash
# Verify Proxmox Monitoring works
curl http://localhost:8000/api/proxmox/vms | jq .
```

### Alternative: new token
If re-encryption does not work:

1. **Create a new token in Proxmox**
2. **Save it in the dashboard** (Settings → Proxmox tab)
3. **It will be encrypted automatically with the new password**

---

## 📚 Further reading

- [ENCRYPTION.md](ENCRYPTION.md) — Encryption details
- [RATE_LIMITS.md](RATE_LIMITS.md) — API rate limits
- [PROXMOX_SETUP.md](PROXMOX_SETUP.md) — Proxmox integration setup

---

## 🆘 Support

If you run into problems:
1. Check backend logs: `docker compose logs backend --tail 100`
2. Check the database: see [Backend verification](#backend-verification)
3. Create a new token: [Step-by-step guide](#step-by-step-guide)

**Emergency reset:**
```bash
# Reset everything
docker compose exec -T db psql -U user -d dashboard -c \
  "DELETE FROM proxmox_config WHERE id = 1;"

# Create a new token and save it in the dashboard
```
