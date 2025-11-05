# 🖥️ Proxmox Monitoring Setup Guide

## Übersicht

Dein Dashboard kann jetzt Proxmox VMs und LXC Container monitoren! Diese Anleitung hilft dir bei der Einrichtung.

## ✅ Was wurde implementiert

### Backend
- ✅ Proxmox API Integration via `proxmoxer` Library
- ✅ Neue Endpoints für VM/LXC Verwaltung
- ✅ Sichere Speicherung der API-Credentials in der Datenbank
- ✅ Unterstützung für Start/Stop/Reboot von VMs/Containern

### Frontend
- ✅ Neuer "Proxmox Monitoring" Tab
- ✅ ProxmoxCard Component mit Live-Status-Anzeige
- ✅ Ressourcen-Monitoring (CPU, RAM, Disk, Uptime)
- ✅ Auto-Refresh alle 30 Sekunden
- ✅ Konfiguration über Settings Panel

## 🚀 Setup-Schritte

### 1. Proxmox API Token erstellen

1. Melde dich in deiner Proxmox Web-UI an
2. Gehe zu: **Datacenter → Permissions → API Tokens**
3. Klicke auf **Add**
4. Konfiguration:
   - **User**: Wähle einen User (z.B. `root@pam`)
   - **Token ID**: Vergebe einen Namen (z.B. `dashboard`)
   - **Privilege Separation**: ✅ Aktiviert (empfohlen)
   - Klicke **Add**

5. **WICHTIG**: Kopiere sofort den angezeigten Secret! Er wird nur einmal angezeigt.

### 2. Berechtigungen setzen (wenn Privilege Separation aktiviert)

Falls du "Privilege Separation" aktiviert hast, musst du dem Token Berechtigungen geben:

1. Gehe zu: **Datacenter → Permissions**
2. Klicke **Add → API Token Permission**
3. Konfiguration:
   - **Path**: `/` (für alle VMs/LXCs)
   - **API Token**: Wähle deinen erstellten Token
   - **Role**: `PVEAuditor` (Read-Only) oder `PVEVMAdmin` (mit Start/Stop)
   - Klicke **Add**

### 3. Dashboard konfigurieren

1. Starte dein Dashboard neu, damit die Datenbank-Änderungen aktiv werden:
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

2. Öffne das Dashboard und logge dich als Admin ein

3. Öffne die **Settings** (Zahnrad-Icon)

4. Wechsle zum **Proxmox** Tab

5. Fülle das Formular aus:
   - **Proxmox Host/IP**: IP oder Hostname deines Proxmox-Servers (z.B. `192.168.1.100`)
   - **Port**: `8006` (Standard)
   - **API Token Name**: Format `user@realm!tokenname` (z.B. `root@pam!dashboard`)
   - **API Token Secret**: Der Secret, den du beim Erstellen kopiert hast
   - **Node Name**: Optional - leer lassen für alle Nodes
   - **SSL-Zertifikat verifizieren**: Deaktivieren bei self-signed Zertifikaten

6. Klicke **Konfiguration speichern**

### 4. Monitoring Tab nutzen

1. Wechsle zum Tab **Proxmox Monitoring**
2. Du siehst jetzt alle deine VMs und LXC Container mit:
   - Status (Running/Stopped)
   - CPU-Auslastung
   - RAM-Nutzung
   - Disk-Verwendung
   - Uptime

3. Als Admin kannst du VMs/Container direkt steuern:
   - **Start**: Gestoppte VM/Container starten
   - **Stop**: Laufende VM/Container stoppen
   - **Reboot**: Laufende VM/Container neu starten

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

Für **Read-Only** Monitoring (ohne Start/Stop):
```
Role: PVEAuditor
Path: /
```

Für **vollständige Kontrolle** (mit Start/Stop/Reboot):
```
Role: PVEVMAdmin
Path: /
```

### SSL-Zertifikate
- Bei produktiven Systemen: SSL-Verifikation aktiviert lassen
- Bei Test-Systemen mit self-signed Zertifikaten: Verifikation deaktivieren

### Credential-Speicherung
- API Token wird sicher in der PostgreSQL-Datenbank gespeichert
- Niemals Token in Frontend-Code oder Logs speichern

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
