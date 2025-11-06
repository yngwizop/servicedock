# Sicherheitsfunktionen

Dieses Dokument beschreibt die drei implementierten Sicherheitsfunktionen für das Proxmox Monitoring.

## 1. Audit-Logging

### Funktionalität
Alle API-Zugriffe auf Proxmox-Ressourcen werden in einer zentralen Audit-Log-Tabelle protokolliert.

### Automatische Bereinigung
- **Beim Backend-Start**: Alle Logs älter als **90 Tage** werden automatisch gelöscht
- **Startup-Log**: Zeigt Anzahl gelöschter Einträge im Backend-Log
- **Verhindert**: Unbegrenztes Wachstum der Datenbank

### Geloggte Informationen
- **Timestamp**: Zeitpunkt des Zugriffs
- **User Type**: Typ des Nutzers (admin/guest)
- **IP-Adresse**: Client-IP-Adresse
- **Action**: Art der Aktion (VIEW_VMS, START_VM, STOP_VM, REBOOT_VM)
- **Resource Type**: Typ der Ressource (vm, lxc)
- **Resource ID**: VM-ID oder LXC-ID
- **Status**: Erfolg oder Fehler
- **Details**: Zusätzliche Informationen (JSON)
- **User-Agent**: Browser/Client-Information

### API-Endpoints

#### Audit-Logs abrufen
```bash
GET /api/admin/audit-logs?limit=50&offset=0&action=VIEW_VMS&ip_address=192.168.1.100
```

**Parameter:**
- `limit` (optional): Max. Anzahl Einträge (Standard: 100)
- `offset` (optional): Offset für Pagination (Standard: 0)
- `action` (optional): Filter nach Aktion
- `ip_address` (optional): Filter nach IP

**Antwort:**
```json
{
  "logs": [
    {
      "id": 1,
      "timestamp": "2025-11-05T13:38:45.208677",
      "user_type": "guest",
      "ip_address": "172.18.0.1",
      "action": "VIEW_VMS",
      "resource_type": null,
      "resource_id": null,
      "status": "success",
      "details": {"count": 38},
      "user_agent": null
    }
  ],
  "total": 1,
  "limit": 100,
  "offset": 0
}
```

#### Audit-Statistiken abrufen
```bash
GET /api/admin/audit-stats
```

**Antwort:**
```json
{
  "actions_24h": [
    {"action": "VIEW_VMS", "count": 30}
  ],
  "top_ips": [
    {"ip": "172.18.0.1", "count": 30}
  ],
  "error_stats": {
    "success": 30,
    "failed": 0,
    "total": 30
  }
}
```

#### Alte Logs bereinigen
```bash
POST /api/admin/audit-logs/cleanup?days=90
```

**Parameter:**
- `days` (optional): Lösche Logs älter als X Tage (Standard: 90)

**Antwort:**
```json
{
  "message": "Alte Audit-Logs gelöscht",
  "deleted_count": 15,
  "older_than_days": 90
}
```

#### Alle Logs löschen (Admin-Passwort erforderlich)
```bash
POST /api/admin/audit-logs/delete-all
Content-Type: application/json

{
  "password": "admin"
}
```

**Antwort:**
```json
{
  "message": "Alle Audit-Logs gelöscht",
  "deleted_count": 65
}
```

**Hinweis:** Diese Funktion setzt auch die Auto-Increment-ID zurück.

### Datenbank-Schema
```sql
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_type VARCHAR(50),
    ip_address VARCHAR(45),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    status VARCHAR(20) NOT NULL,
    details TEXT,
    user_agent TEXT
);

CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_ip ON audit_log(ip_address);
```

---

## 2. Rate-Limiting

### Funktionalität
Begrenzt die Anzahl der API-Aufrufe pro IP-Adresse, um Missbrauch zu verhindern.

### Limits
- **View-Operationen** (GET /api/proxmox/vms): **30 Requests pro Minute**
- **Control-Operationen** (Start/Stop/Reboot): **10 Requests pro Minute**

### Implementierung
Verwendet die `slowapi`-Bibliothek mit IP-basiertem Rate-Limiting:

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

@app.get("/api/proxmox/vms")
@limiter.limit("30/minute")
async def get_vms(request: Request):
    # ...
```

### Fehlerbehandlung
Bei Überschreitung des Limits:
- **HTTP Status**: 429 Too Many Requests
- **Header**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

**Beispiel:**
```bash
$ curl -i http://localhost:8000/api/proxmox/vms
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1699192740
```

### Test
```bash
# Teste Rate-Limiting
for i in {1..35}; do 
  curl -s -o /dev/null -w "Request $i: HTTP %{http_code}\n" "http://localhost:8000/api/proxmox/vms"
done
```

Nach 30 Requests sollte HTTP 429 zurückgegeben werden.

---

## 3. Token-Rotation

### Funktionalität
Verfolgt das Alter von Proxmox API-Tokens und empfiehlt eine Rotation nach 90 Tagen.

### Tracking-Felder
Die `proxmox_config`-Tabelle wurde erweitert:
```sql
ALTER TABLE proxmox_config 
ADD COLUMN token_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN token_last_rotated TIMESTAMP;
```

### API-Endpoints

#### Token-Info abrufen
```bash
GET /api/admin/proxmox/token-info
```

**Antwort:**
```json
{
  "configured": true,
  "token_name": "lxc-creator@pve!lxc-creator",
  "created_at": "2025-11-05T13:36:20.673236",
  "last_rotated": null,
  "age_days": 0,
  "rotation_recommended": false
}
```

**Felder:**
- `configured`: Proxmox ist konfiguriert
- `token_name`: Aktueller Token-Name (user@realm!tokenid)
- `created_at`: Erstellungsdatum
- `last_rotated`: Letztes Rotationsdatum
- `age_days`: Alter in Tagen
- `rotation_recommended`: `true` wenn älter als 60 Tage

#### Token rotieren
```bash
POST /api/admin/proxmox/rotate-token
Content-Type: application/json

{
  "new_token_value": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

**Antwort:**
```json
{
  "success": true,
  "message": "Token erfolgreich rotiert",
  "old_age_days": 120,
  "new_created_at": "2025-11-05T14:00:00"
}
```

### Empfohlener Rotations-Workflow

1. **Neuen Token in Proxmox erstellen**
   ```bash
   # In Proxmox Web-UI: Datacenter → Permissions → API Tokens → Add
   ```

2. **Token-Info prüfen**
   ```bash
   curl http://localhost:8000/api/admin/proxmox/token-info
   ```

3. **Token rotieren** (wenn `rotation_recommended: true`)
   ```bash
   curl -X POST http://localhost:8000/api/admin/proxmox/rotate-token \
     -H "Content-Type: application/json" \
     -d '{"new_token_value": "neuer-token-wert"}'
   ```

4. **Alten Token in Proxmox löschen**

### Automatische Rotation (optional)

Für automatisierte Rotation kann ein Cronjob eingerichtet werden:

```bash
# Prüfe täglich um 2 Uhr nachts
0 2 * * * /home/webdashboard/scripts/check-token-rotation.sh
```

**check-token-rotation.sh:**
```bash
#!/bin/bash
TOKEN_INFO=$(curl -s http://localhost:8000/api/admin/proxmox/token-info)
RECOMMENDED=$(echo $TOKEN_INFO | jq -r '.rotation_recommended')

if [ "$RECOMMENDED" = "true" ]; then
  echo "⚠️  Token-Rotation empfohlen!"
  # Optional: Send notification
fi
```

---

## Sicherheits-Best-Practices

### 1. Verschlüsselung
- Alle API-Tokens werden mit **Fernet (AES-128)** verschlüsselt
- Encryption Key wird aus `ADMIN_PASSWORD` abgeleitet (SHA-256)
- Siehe [ENCRYPTION.md](ENCRYPTION.md) für Details

### 2. Audit-Logs
- Regelmäßig überprüfen auf verdächtige Aktivitäten
- Filter nach fehlgeschlagenen Aktionen (`status=failed`)
- Überwachen von IP-Adressen mit vielen Fehlversuchen
- **Automatische Bereinigung**: Logs älter als 90 Tage werden beim Start gelöscht
- **Manuelle Bereinigung**: "Alle Logs löschen" Button im Security Dashboard (Admin-Passwort erforderlich)

### 3. Rate-Limiting
- Schützt vor Brute-Force-Angriffen
- Verhindert API-Missbrauch
- Bei Bedarf Limits anpassen in `main.py`

### 4. Token-Rotation
- **Empfohlen**: Token alle 60 Tage rotieren (vorher 90 Tage)
- Bei Sicherheitsvorfällen sofort rotieren
- Alte Tokens in Proxmox löschen
- **Token-Secret wird aus Sicherheitsgründen nicht im Frontend angezeigt**
- Bei Rotation muss der neue Token-Wert manuell eingegeben werden

### 5. Netzwerk-Sicherheit
- Dashboard nur über HTTPS erreichbar machen
- Firewall-Regeln für Proxmox API
- VPN/Tailscale für externen Zugriff

---

## Monitoring & Alerting

### Audit-Log-Alerts
Überwache die Logs auf:
- Viele fehlgeschlagene Versuche (`status=failed`)
- Unbekannte IP-Adressen
- Verdächtige Aktionsmuster

### Rate-Limit-Alerts
Überwache auf:
- Häufige 429-Errors
- Verdächtige IPs mit vielen Requests

### Token-Rotation-Alerts
Setze Benachrichtigungen:
- Bei `rotation_recommended: true`
- Bei Token-Alter > 80 Tage (kritisch)

---

## Troubleshooting

### Audit-Logs werden nicht erstellt
```bash
# Prüfe ob Tabelle existiert
docker compose exec db psql -U user -d dashboard -c "\d audit_log"

# Prüfe Backend-Logs
docker compose logs backend --tail 50

# Prüfe Startup-Bereinigung
docker compose logs backend | grep "Startup:"
```

### Audit-Logs laufen voll
Die automatische Bereinigung läuft nur beim Backend-Start. Für manuelle Bereinigung:

```bash
# Im Security Dashboard: Audit Logs Tab → "Alle Logs löschen" Button
# Oder via API:
curl -X POST http://localhost:8000/api/admin/audit-logs/cleanup?days=90

# Alle Logs löschen (Passwort erforderlich):
curl -X POST http://localhost:8000/api/admin/audit-logs/delete-all \
  -H "Content-Type: application/json" \
  -d '{"password": "admin"}'
```

### Rate-Limiting funktioniert nicht
```bash
# Prüfe slowapi Installation
docker compose exec backend pip list | grep slowapi

# Prüfe ob Limiter initialisiert wurde
docker compose logs backend | grep "Limiter"
```

### Token-Rotation schlägt fehl
```bash
# Prüfe ob Spalten existieren
docker compose exec db psql -U user -d dashboard -c "\d proxmox_config"

# Prüfe Encryption
curl http://localhost:8000/api/admin/proxmox/token-info

# Prüfe ob token_created_at aktualisiert wird
docker compose exec -T db psql -U user -d dashboard -c \
  "SELECT token_name, token_created_at FROM proxmox_config WHERE id = 1;"
```

**Häufige Probleme:**
- Token-Wert muss neu eingegeben werden (wird nicht aus DB geladen)
- `token_created_at` wird nur aktualisiert wenn `token_value` gesendet wird
- Nach dem Speichern verschwindet der Token-Wert aus dem Formular (Sicherheit)

---

## Tests

### Test 1: Audit-Logging
```bash
# Führe einige Aktionen aus
curl http://localhost:8000/api/proxmox/vms

# Prüfe Logs
curl "http://localhost:8000/api/admin/audit-logs?limit=10" | jq .

# Prüfe Statistiken
curl http://localhost:8000/api/admin/audit-stats | jq .
```

**Erwartetes Ergebnis:**
- Logs enthalten VIEW_VMS-Einträge
- Statistiken zeigen korrekte Zahlen

### Test 2: Rate-Limiting
```bash
# 35 schnelle Requests
for i in {1..35}; do 
  curl -s -o /dev/null -w "Request $i: HTTP %{http_code}\n" \
    "http://localhost:8000/api/proxmox/vms"
done
```

**Erwartetes Ergebnis:**
- Requests 1-30: HTTP 200
- Requests 31+: HTTP 429

### Test 3: Token-Rotation
```bash
# Token-Info abrufen
curl http://localhost:8000/api/admin/proxmox/token-info | jq .

# Token rotieren (Beispiel)
curl -X POST http://localhost:8000/api/admin/proxmox/rotate-token \
  -H "Content-Type: application/json" \
  -d '{"new_token_value": "test-token-value"}' | jq .
```

**Erwartetes Ergebnis:**
- Token-Info zeigt Alter und Empfehlung
- Rotation aktualisiert `last_rotated` und `created_at`

---

## Zusammenfassung

Alle drei Sicherheitsfunktionen sind implementiert und funktionsfähig:

| Feature | Status | Beschreibung |
|---------|--------|-------------|
| **Audit-Logging** | ✅ Aktiv | Alle API-Zugriffe werden protokolliert |
| **Rate-Limiting** | ✅ Aktiv | 30/min für Views, 10/min für Controls |
| **Token-Rotation** | ✅ Aktiv | Tracking und Empfehlung nach 60 Tagen |
| **Token-Verschlüsselung** | ✅ Aktiv | Fernet AES-128, abgeleitet von ADMIN_PASSWORD |
| **Token-Name Maskierung** | ✅ Aktiv | Token-Name wird im Frontend als `user@realm!***` angezeigt |
| **Log-Bereinigung** | ✅ Aktiv | Auto-Cleanup >90 Tage, manuell via Security Dashboard |

### Wichtige Sicherheitshinweise

1. **Token-Value wird NIE im Frontend angezeigt**
   - Aus Sicherheitsgründen wird `token_value` nicht von der API zurückgegeben
   - Bei Rotation muss der neue Token manuell eingegeben werden

2. **Token-Name wird maskiert**
   - API gibt nur `user@realm!***` zurück statt vollem Token-Namen
   - Verhindert Token-ID-Leaks bei API-Abfragen

3. **DEBUG-Logs entfernt**
   - Keine Logs mit Token-Werten oder anderen sensitiven Daten
   - Error-Logs zeigen nur generische Meldungen

4. **ADMIN_PASSWORD Änderung**
   - Bei Änderung des ADMIN_PASSWORD müssen Tokens re-encrypted werden
   - Siehe [TOKEN_ROTATION_GUIDE.md](TOKEN_ROTATION_GUIDE.md) → "ADMIN_PASSWORD Änderung"
   - Re-Encryption Script: `backend/re_encrypt_tokens.py`

Die Implementierung folgt Best-Practices für Homelab-Sicherheit und kann bei Bedarf erweitert werden.

