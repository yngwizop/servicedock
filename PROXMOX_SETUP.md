# 🖥️ Proxmox Monitoring Setup Guide

## Übersicht

ServiceDock kann deine Proxmox VMs und LXC Container monitoren und verwalten! Diese Anleitung hilft dir bei der sicheren Einrichtung mit verschlüsselter Token-Speicherung.

**Features:**

> **Hinweis:** Alle Proxmox-API-Aufrufe und das Dashboard sind im lokalen Netzwerk über die zentrale Nginx-Adresse `https://10.10.10.50` erreichbar. Die Datenbank ist nur intern im Docker-Netzwerk verfügbar.
- 📊 Live-Status-Monitoring aller VMs/Container
- 🚀 Remote-Steuerung (Start/Stop/Reboot)
- 📈 Ressourcen-Überwachung (CPU, RAM, Disk)
- 🔒 Verschlüsselte Token-Speicherung (Fernet AES-128)
- 📝 Audit-Logging aller Aktionen
- ⏱️ Rate-Limiting (DoS-Schutz)

---

## ✅ Was wurde implementiert

### Backend
- ✅ Proxmox API Integration via `proxmoxer` Library
- ✅ Neue Endpoints für VM/LXC Verwaltung (`/api/proxmox/*`)
- ✅ **Verschlüsselte Speicherung** der API-Credentials (Fernet AES-128)
- ✅ Unterstützung für Start/Stop/Reboot von VMs/Containern
- ✅ Rate-Limiting: 30/min View, 10/min Control
- ✅ Audit-Logging aller Proxmox-Aktionen
- ✅ Token-Rotation Tracking (60 Tage Empfehlung)

### Frontend
- ✅ "Proxmox Monitoring" Tab im Settings-Panel
- ✅ ProxmoxCard Component mit Live-Status-Anzeige
- ✅ Ressourcen-Monitoring (CPU, RAM, Disk, Uptime)
- ✅ Auto-Refresh alle 30 Sekunden (deaktivierbar)
- ✅ Konfiguration über Settings Panel
- ✅ Filter & Sortierung (6 Optionen)

---

## 🚀 Setup-Schritte

### 1. Proxmox API Token erstellen

1. Melde dich in deiner Proxmox Web-UI an
2. Gehe zu: **Datacenter → Permissions → API Tokens**
3. Klicke auf **Add**
4. Konfiguration:
   - **User**: Wähle einen User (z.B. `root@pam`)
   - **Token ID**: Vergebe einen Namen (z.B. `dashboard`)
   - **Privilege Separation**: ✅ Aktiviert (empfohlen für Security)
   - Klicke **Add**

5. **WICHTIG**: Kopiere sofort den angezeigten Secret! Er wird nur einmal angezeigt.
   ```
   Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

### 2. Berechtigungen setzen (wenn Privilege Separation aktiviert)

Falls du "Privilege Separation" aktiviert hast, musst du dem Token Berechtigungen geben:

1. Gehe zu: **Datacenter → Permissions**
2. Klicke **Add → API Token Permission**
3. Konfiguration:
   - **Path**: `/` (für alle VMs/LXCs)
   - **API Token**: Wähle deinen erstellten Token
   - **Role**: 
     - `PVEAuditor` (Read-Only, nur Monitoring) ✅ Empfohlen
     - `PVEVMAdmin` (mit Start/Stop/Reboot)
   - Klicke **Add**

**Security-Empfehlung:** Starte mit `PVEAuditor` (Read-Only). Nur bei Bedarf auf `PVEVMAdmin` upgraden.

### 3. Dashboard konfigurieren

1. Starte dein Dashboard (falls nicht bereits gestartet):
   ```bash
   cd /home/servicedock
   docker compose up -d
   ```

2. Öffne das Dashboard und logge dich als Admin ein
   ```
   http://deine-server-ip:3000
   ```

3. Öffne die **Settings** (Zahnrad-Icon unten rechts)

4. Wechsle zum **Proxmox** Tab

5. Fülle das Formular aus:
   - **Proxmox Host/IP**: IP oder Hostname deines Proxmox-Servers (z.B. `192.168.1.100`)
   - **Port**: `8006` (Standard)
   - **API Token Name**: Format `user@realm!tokenname` (z.B. `root@pam!dashboard`)
   - **API Token Secret**: Der Secret, den du beim Erstellen kopiert hast
   - **Node Name**: Optional - leer lassen für alle Nodes oder spezifischen Node angeben
   - **SSL-Zertifikat verifizieren**: 
     - ✅ Aktiviert bei produktiven Systemen mit gültigem Zertifikat
     - ❌ Deaktiviert bei self-signed Zertifikaten (Homelab)

6. Klicke **Proxmox-Konfiguration speichern**

**Was passiert beim Speichern:**
- ✅ Token wird mit Fernet (AES-128) verschlüsselt
- ✅ Nur verschlüsselter Token wird in DB gespeichert
- ✅ `token_created_at` wird auf NOW() gesetzt
- ✅ Verbindungstest wird durchgeführt

### 4. Token-Verschlüsselung verifizieren (Optional)

```bash
# Zeige verschlüsselten Token in der DB
docker compose exec db psql -U dashboard_user -d dashboard -c \
  "SELECT id, host, token_name, substring(token_value, 1, 20) as encrypted_token FROM proxmox_config;"
```

**Erwartete Ausgabe:**
```
 id |      host       |        token_name         |   encrypted_token    
----+-----------------+---------------------------+---------------------
  1 | 192.168.1.100   | root@pam!dashboard        | gAAAAABpC5U8QaM...
```

✅ **Verschlüsselt**: Beginnt mit `gAAAAAB...`  
❌ **Unverschlüsselt**: UUID-Format `xxxxxxxx-xxxx-...`

Siehe [ENCRYPTION.md](ENCRYPTION.md) für Details zur Verschlüsselung.

### 5. Monitoring Tab nutzen

1. Wechsle zum Tab **Proxmox Monitoring**
2. Du siehst jetzt alle deine VMs und LXC Container mit:
   - Status (Running/Stopped)
   - CPU-Auslastung
   - RAM-Nutzung (genutzt / gesamt)
   - Disk-Verwendung (genutzt / gesamt)
   - Uptime (wie lange läuft die VM)

3. Als Admin kannst du VMs/Container direkt steuern:
   - **▶️ Start**: Gestoppte VM/Container starten
   - **⏹️ Stop**: Laufende VM/Container stoppen
   - **🔄 Reboot**: Laufende VM/Container neu starten

4. **Auto-Refresh**: Standardmäßig alle 30 Sekunden, kann per Checkbox deaktiviert werden

---

## 📊 Features

### Automatische Aktualisierung
- Standard: Alle 30 Sekunden automatische Aktualisierung
- Kann über Checkbox deaktiviert werden
- Manueller Refresh jederzeit über Button möglich

### Status-Indikatoren
- 🟢 **Grün**: VM/Container läuft
- 🔴 **Rot**: VM/Container gestoppt
- ⚪ **Grau**: Status unbekannt

### Ressourcen-Anzeige
Für laufende VMs/Container werden angezeigt:
- CPU-Auslastung in %
- RAM-Nutzung (genutzt / gesamt)
- Disk-Verwendung (genutzt / gesamt)
- Uptime (wie lange läuft die VM)

### Control Actions (nur Admin)
- ▶️ **Start**: Startet gestoppte VM/Container
- ⏹️ **Stop**: Stoppt laufende VM/Container
- 🔄 **Reboot**: Startet VM/Container neu

## 🔒 Sicherheit

### Empfohlene Token-Berechtigungen

**Für Read-Only Monitoring (sicherste Option):**
```
Role: PVEAuditor
Path: /
```
- ✅ Kann VMs/Container anzeigen
- ✅ Kann Status abfragen
- ❌ Kann NICHT starten/stoppen/rebooten

**Für vollständige Kontrolle:**
```
Role: PVEVMAdmin
Path: /
```
- ✅ Kann VMs/Container anzeigen
- ✅ Kann starten/stoppen/rebooten
- ⚠️ Mehr Berechtigungen = höheres Risiko bei Token-Leak

### Token-Verschlüsselung

- **Algorithmus**: Fernet (AES-128 in CBC-Modus mit HMAC)
- **Key-Quelle**: `ENCRYPTION_KEY` aus `.env`
- **Storage**: Nur verschlüsselte Tokens in PostgreSQL
- **Decryption**: Nur zur Laufzeit im Backend

⚠️ **WICHTIG**: `ENCRYPTION_KEY` niemals ändern! Siehe [RE_ENCRYPTION_GUIDE.md](RE_ENCRYPTION_GUIDE.md)

### Token-Rotation

Empfohlen: **Alle 60 Tage** neuen Token erstellen

```bash
# Token-Alter prüfen
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:8000/api/admin/proxmox/token-info?dashboard_id=1
```

Siehe [TOKEN_ROTATION_GUIDE.md](TOKEN_ROTATION_GUIDE.md) für Details.

### Rate-Limiting

- **View VMs**: 30 Anfragen/Minute
- **Control (Start/Stop/Reboot)**: 10 Anfragen/Minute
- **Audit-Logging**: Alle Aktionen werden protokolliert

### SSL-Zertifikate
- **Produktiv-Systeme**: SSL-Verifikation aktiviert lassen
- **Homelab/Test-Systeme**: Bei self-signed Zertifikaten deaktivieren

---

## 🐛 Troubleshooting

### "Proxmox nicht konfiguriert"
→ Gehe zu Settings → Proxmox Tab und konfiguriere die Verbindung

### "Failed to connect to Proxmox"
Mögliche Ursachen:
- Falsche IP/Host-Adresse
- Proxmox Server nicht erreichbar (Firewall?)
- Falscher Port (Standard: 8006)
- SSL-Verifikation bei self-signed Zertifikat aktiviert

### "Authentication failed"
- Prüfe Token Name Format: `user@realm!tokenname`
- Prüfe Token Secret (UUID-Format)
- Stelle sicher, dass Token noch gültig ist

### "Permission denied"
- Token hat nicht genug Berechtigungen
- Gehe zu Proxmox → Permissions und prüfe API Token Permissions

### Keine VMs/Container sichtbar
- Prüfe ob der Token Zugriff auf die VMs hat
- Prüfe ob die VMs existieren und auf dem richtigen Node sind
- Falls spezifischer Node konfiguriert: Prüfe Node-Name

## 📝 API Endpoints

Das Backend bietet folgende neue Endpoints:

```
GET  /api/proxmox/config        - Proxmox-Konfiguration abrufen
PUT  /api/proxmox/config        - Proxmox-Konfiguration speichern
GET  /api/proxmox/vms           - Alle VMs/LXCs abrufen
POST /api/proxmox/vm/{id}/start - VM/LXC starten
POST /api/proxmox/vm/{id}/stop  - VM/LXC stoppen
POST /api/proxmox/vm/{id}/reboot - VM/LXC neu starten
```

## 🎨 Anpassungen

### Refresh-Interval ändern
In `ProxmoxGrid.jsx` Zeile ~60:
```javascript
const interval = setInterval(() => {
  fetchProxmoxData();
}, 30000); // 30 Sekunden → ändern auf gewünschten Wert
```

### Grid-Layout ändern
In `ProxmoxGrid.jsx` Zeile ~180:
```javascript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```
Passe `lg:grid-cols-3` an für mehr/weniger Spalten

## 📚 Weitere Informationen

- [Proxmox API Dokumentation](https://pve.proxmox.com/wiki/Proxmox_VE_API)
- [Proxmoxer Python Library](https://pypi.org/project/proxmoxer/)

---

**Viel Spaß mit deinem erweiterten Dashboard! 🚀**
