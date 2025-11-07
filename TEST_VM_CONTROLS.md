# Test-Anleitung: VM Controls im Dashboard

## Problem gefunden
1. **Proxmox API-Token Rechte:** Dein Token hat nur `PVEAuditor` (Read-Only)
2. **Lösung:** Token braucht `PVEVMAdmin` Rolle für Start/Stop/Reboot

## Schritt 1: Proxmox API-Token Rechte erhöhen

### Option A: Über Proxmox Web-UI (Einfach)

1. Öffne Proxmox: `https://dein-proxmox:8006`
2. Gehe zu: **Datacenter → Permissions → API Tokens**
3. Finde dein Token (z.B. `root@pam!dashboard`)
4. Klicke auf **"Permissions"**
5. Füge neue Permission hinzu:
   - Path: `/`
   - Role: **`PVEVMAdmin`**
   - Propagate: ✅ Ja
6. Klicke **"Add"**

### Option B: Über Proxmox CLI (Schnell)

```bash
# SSH in Proxmox Server
ssh root@dein-proxmox

# Ersetze 'root@pam!dashboard' mit deinem Token-Namen
pveum acl modify / -token 'root@pam!dashboard' -role PVEVMAdmin
```

## Schritt 2: Im Dashboard testen

1. **Öffne Dashboard:** `http://localhost:5173`
2. **Login als Admin**
3. **Gehe zu "Proxmox Monitoring" Tab**
4. **Wähle eine gestoppte VM/Container**
5. **Klicke "Start" Button**

### ✅ Wenn es funktioniert:
- VM startet
- Nach 2 Sekunden lädt die Liste neu
- Status wechselt zu "Running"

### ❌ Wenn es nicht funktioniert:
- **Alert-Popup erscheint** mit konkreter Fehlermeldung:
  - "Permission denied. API token needs 'PVEVMAdmin' role." → Token hat immer noch zu wenig Rechte
  - "Failed to start VM/Container. Please check your authentication." → Du bist nicht eingeloggt
  - "Session expired. Please login again." → JWT Token abgelaufen
  - Andere Meldung → Schaue in Backend Logs: `docker logs webdashboard-backend-1 --tail 50`

## Schritt 3: Backend Logs checken

```bash
# Zeige letzte VM-Aktionen
docker logs webdashboard-backend-1 --tail 100 | grep -E "(START_VM|STOP_VM|REBOOT_VM)"

# Zeige Permission Errors
docker logs webdashboard-backend-1 --tail 100 | grep -i "permission"

# Live-Monitoring
docker logs webdashboard-backend-1 -f
```

## Erwartete Backend-Logs bei Erfolg

```
2025-11-07 11:20:15 - dashboard - INFO - Audit: action=START_VM, status=success, user=admin, resource=lxc:138
INFO: 192.168.178.45:12345 - "POST /api/proxmox/vm/138/start?vm_type=lxc HTTP/1.1" 200 OK
```

## Erwartete Backend-Logs bei Permission Error

```
2025-11-07 11:20:15 - dashboard - ERROR - Proxmox VM start failed: 403 Permission check failed
2025-11-07 11:20:15 - dashboard - INFO - Audit: action=START_VM, status=failed, error=403 Permission...
INFO: 192.168.178.45:12345 - "POST /api/proxmox/vm/138/start?vm_type=lxc HTTP/1.1" 500 Internal Server Error
```

## Debugging Tipps

### 1. Prüfe ob du eingeloggt bist
```javascript
// Browser Console (F12)
localStorage.getItem('jwt_token')
// Sollte einen Token zeigen, nicht null
```

### 2. Prüfe Request im Browser
```
# Browser DevTools → Network Tab
# Klicke Button → Schaue POST /api/proxmox/vm/XXX/start
# Status: 200 = OK, 401 = Nicht eingeloggt, 500 = Backend Error
```

### 3. Teste API direkt
```bash
# Hole JWT Token aus Browser (F12 → Console → localStorage.getItem('jwt_token'))
export JWT_TOKEN="dein_token_hier"

# Test Start
curl -X POST "http://localhost:8000/api/proxmox/vm/138/start?vm_type=lxc" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -v

# Sollte 200 OK zurückgeben mit {"message": "Container 138 started"}
```

## Nächste Schritte

Nach erfolgreicher Rechte-Anpassung:
1. ✅ Start Button funktioniert
2. ✅ Stop Button funktioniert
3. ✅ Reboot Button funktioniert
4. ✅ Alle Aktionen werden im Audit-Log gespeichert
5. ✅ Rate Limiting schützt vor Missbrauch (10 Aktionen/Minute)

## Sicherheit

Das Dashboard hat mehrere Sicherheitsebenen:
- **JWT Authentication:** Nur eingeloggte Admins können VMs kontrollieren
- **Role-Based Access:** `@require_role("admin")` Decorator
- **Rate Limiting:** Max 10 Start/Stop/Reboot pro Minute
- **Audit Logging:** Alle Aktionen werden mit Timestamp, User, IP geloggt
- **Proxmox API:** Zusätzlich durch Token-Berechtigungen geschützt
