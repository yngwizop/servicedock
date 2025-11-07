# Proxmox API-Token Rechte anpassen

## Problem
Dein API-Token hat die Rolle **PVEAuditor** (Read-Only), kann daher keine VMs starten/stoppen/rebooten.

## Lösung: API-Token Rechte erhöhen

### Methode 1: Über Proxmox Web-UI

1. **Öffne Proxmox Web-Interface**
   - Gehe zu: `https://dein-proxmox-server:8006`

2. **Navigiere zu API-Tokens**
   - Datacenter → Permissions → API Tokens
   - ODER: Datacenter → Permissions → Users → [Dein User] → API Tokens

3. **Finde dein Token**
   - Suche nach dem Token, das in deiner `.env` Datei steht
   - Beispiel: `PROXMOX_TOKEN_NAME=root@pam!dashboard`

4. **Ändere die Permissions**
   - Klicke auf "Permissions" (Berechtigungen)
   - Füge neue Permission hinzu:
     - **Path:** `/`
     - **Role:** `PVEVMAdmin` (für VM-Management)
     - **Propagate:** ✅ Ja

### Methode 2: Über Proxmox Shell (CLI)

```bash
# SSH in deinen Proxmox Server

# Option A: PVEVMAdmin Rolle (empfohlen für VM-Management)
pveum acl modify / -token 'root@pam!dashboard' -role PVEVMAdmin

# Option B: Volle Admin-Rechte (wenn du mehr brauchst)
pveum acl modify / -token 'root@pam!dashboard' -role Administrator
```

**Ersetze `root@pam!dashboard` mit deinem tatsächlichen Token-Namen!**

## Proxmox Rollen Übersicht

| Rolle | Berechtigung | Empfohlen für |
|-------|-------------|---------------|
| **PVEAuditor** | Nur Lesen (Status abfragen) | Monitoring ohne Kontrolle |
| **PVEVMAdmin** | VM/Container verwalten (Start/Stop/Reboot) | **Dashboard mit Kontrolle ✅** |
| **PVEVMUser** | VMs nutzen, aber nicht erstellen | End-User Zugriff |
| **Administrator** | Volle Rechte | System-Administration |

## Nach der Änderung

1. **Kein Neustart nötig** - Änderungen sind sofort aktiv
2. **Teste im Dashboard:**
   - Gehe zum Proxmox Monitoring Tab
   - Klicke auf einen Start/Stop/Reboot Button
   - Sollte jetzt funktionieren! 🚀

## Testen ob es funktioniert

```bash
# In deinem Dashboard Server (webdashboard Container):
curl -X POST "http://localhost:8000/api/proxmox/vm/138/start?vm_type=lxc" \
  -H "Authorization: Bearer DEIN_JWT_TOKEN"

# Sollte jetzt "message": "Container 138 started" zurückgeben
```

## Sicherheitshinweis

⚠️ **Wichtig:** Das API-Token kann jetzt VMs kontrollieren!
- Halte das Token geheim
- Speichere es nicht in Git
- `.env` Datei sollte in `.gitignore` sein

✅ Dein Dashboard hat bereits:
- JWT Authentication (nur Admins)
- Rate Limiting (10 Aktionen/Minute)
- Audit Logging (alle Aktionen werden geloggt)
