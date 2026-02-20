# AD/LDAP Integration — ServiceDock

## Übersicht

ServiceDock unterstützt **Active Directory / LDAP-Authentifizierung** als optionales AddOn. Damit können sich AD-Benutzer mit ihrem Domain-Account anmelden, wobei die Rolle (Admin oder Viewer) über Gruppenmitgliedschaften gesteuert wird.

**Features:**
- AD-Login mit Username + Passwort (UPN-Bind: `user@domain`)
- Rollensteuerung über AD-Gruppen (Admin-Gruppe / Viewer-Gruppe)
- Automatischer Fallback auf lokalen Login, wenn kein Username angegeben wird
- Viewer-Rolle: Nur-Lese-Zugriff auf Dashboard (kein Edit Mode, keine Settings)
- LDAP über SSL (LDAPS) oder StartTLS unterstützt
- Bind-Passwort wird verschlüsselt in der Datenbank gespeichert (Fernet)
- Konfiguration komplett über die Web-UI (Settings → AddOns → LDAP/AD)

---

## Voraussetzungen

- **Active Directory Domain Controller** (z.B. Samba AD DC oder Windows Server AD DS)
- **Service-Account** im AD mit Leserechten (für User-Suche)
- **Zwei AD-Gruppen** für Rollensteuerung:
  - Eine Gruppe für **Admins** (voller Zugriff)
  - Eine Gruppe für **Viewer** (Nur-Lese-Zugriff)
- **ldap3** Python-Paket (bereits in `requirements.txt`: `ldap3>=2.9.1`)

---

## AD vorbereiten

### 1. Service-Account erstellen

Erstelle einen dedizierten Service-Account im AD, der nur Leserechte hat:

```bash
# Samba AD DC Beispiel:
samba-tool user create svc_servicedock --random-password
samba-tool user setexpiry svc_servicedock --noexpiry
```

### 2. Gruppen erstellen

Erstelle zwei Sicherheitsgruppen für die Rollenzuordnung:

```bash
# Admin-Gruppe
samba-tool group add ServiceDock-Admins

# Viewer-Gruppe
samba-tool group add ServiceDock-Viewers
```

### 3. Benutzer zu Gruppen hinzufügen

```bash
# Admin-User hinzufügen
samba-tool group addmembers ServiceDock-Admins adminuser

# Viewer-User hinzufügen
samba-tool group addmembers ServiceDock-Viewers vieweruser
```

### 4. DNs der Gruppen ermitteln

```bash
# Gruppen-DN nachschlagen
samba-tool group show ServiceDock-Admins | grep dn
# → dn: CN=ServiceDock-Admins,CN=Users,DC=domain,DC=local

samba-tool group show ServiceDock-Viewers | grep dn
# → dn: CN=ServiceDock-Viewers,CN=Users,DC=domain,DC=local
```

---

## Konfiguration in ServiceDock

### Über die Web-UI

1. Als **lokaler Admin** einloggen
2. **Settings** → **AddOns** → **LDAP / Active Directory** → **Konfigurieren**
3. Formular ausfüllen:

| Feld | Beschreibung | Beispiel |
|------|-------------|---------|
| **LDAP Host** | Hostname/IP des Domain Controllers | `ldap.example.com` |
| **Port** | LDAP-Port (389 oder 636 für LDAPS) | `389` |
| **SSL** | LDAPS aktivieren (Port 636) | ☐ |
| **StartTLS** | StartTLS auf Port 389 | ☐ |
| **Base DN** | LDAP-Basis für die Suche | `DC=domain,DC=local` |
| **User Search Base** | Wo User gesucht werden | `CN=Users` (relativ) oder `CN=Users,DC=domain,DC=local` (absolut) |
| **Bind DN** | Distinguished Name des Service-Accounts | `CN=svc_servicedock,CN=Users,DC=domain,DC=local` |
| **Bind Password** | Passwort des Service-Accounts | *(wird verschlüsselt gespeichert)* |
| **User Attribute** | LDAP-Attribut für den Usernamen | `sAMAccountName` (Standard für AD) |
| **Domain** | AD-Domain für UPN-Bind | `domain.local` |
| **Admin Group DN** | DN der Admin-Gruppe | `CN=ServiceDock-Admins,CN=Users,DC=domain,DC=local` |
| **Viewer Group DN** | DN der Viewer-Gruppe | `CN=ServiceDock-Viewers,CN=Users,DC=domain,DC=local` |

4. **Verbindung testen** → Zeigt gefundene User-Anzahl und Gruppen-Details
5. **Speichern** → Konfiguration wird in der DB gespeichert
6. **Aktivieren** über den Toggle-Schalter

### Hinweise zur Konfiguration

- **User Search Base:** Kann relativ (`CN=Users`) oder absolut (`CN=Users,DC=domain,DC=local`) angegeben werden. Relative Pfade werden automatisch mit der Base DN kombiniert.
- **User Attribute:** `sAMAccountName` ist der Standard für Microsoft AD und Samba AD. Für OpenLDAP ggf. `uid` verwenden.
- **Domain:** Wird für den UPN-Bind verwendet (`username@domain`). Muss die DNS-Domain des AD sein.
- **Gruppenprüfung:** Admin-Gruppe hat Vorrang. Ist ein User in beiden Gruppen, erhält er Admin-Rechte.
- **Kein Gruppenmatch:** User, die in keiner der beiden Gruppen sind, werden abgelehnt (Login schlägt fehl).

---

## Login-Ablauf

```
┌────────────────────────────────────────────────────────────┐
│                     Login-Flow                             │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. Frontend fragt GET /api/auth/mode                      │
│     → { ad_enabled: true, domain: "domain.local" }         │
│     → Zeigt Username-Feld im Login-Dialog                  │
│                                                            │
│  2. User gibt Username + Passwort ein                      │
│     → POST /api/login { username, password }               │
│                                                            │
│  3. Backend prüft: Username vorhanden + AD enabled?        │
│     ├─ JA → LDAP-Authentifizierung:                        │
│     │   a) Service-Account bindet an DC                    │
│     │   b) Sucht User nach sAMAccountName                  │
│     │   c) Re-Bind mit User-Credentials (user@domain)      │
│     │   d) Prüft Gruppenmitgliedschaft → Rolle             │
│     │   e) JWT mit Rolle + auth_method="ad" setzen         │
│     │                                                      │
│     └─ NEIN → Lokaler Login:                               │
│         a) Passwort gegen ADMIN_PASSWORD Hash prüfen       │
│         b) JWT mit role="admin" + auth_method="local"      │
│                                                            │
│  4. JWT als httpOnly Cookie gesetzt                        │
│    → { sub, type (admin/viewer), auth_method, display_name}│
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Username-Format

Der Login akzeptiert verschiedene Formate:
- `jdoe` — Bevorzugt (plain sAMAccountName)
- `jdoe@domain.local` — UPN-Format wird automatisch erkannt, Domain wird abgeschnitten

---

## Rollen & Berechtigungen

| Feature | Admin | Viewer |
|---------|:-----:|:------:|
| Dashboard anzeigen | ✅ | ✅ |
| Services/Shortcuts sehen | ✅ | ✅ |
| Hintergrund/Wallpaper | ✅ | ✅ |
| Edit Mode | ✅ | ❌ |
| Services/Shortcuts bearbeiten | ✅ | ❌ |
| Proxmox-Tab | ✅ | ❌ |
| Security-Tab | ✅ | ❌ |
| Settings | ✅ | ❌ |
| Add Item (FAB) | ✅ | ❌ |

### Technische Umsetzung

- **Backend:** `require_any_role("admin", "viewer")` für GET-Endpunkte (Services, Shortcuts, Dashboards, Appearance). Schreibende Endpunkte bleiben `require_role("admin")`.
- **Frontend:** `isAdmin` Prop steuert Sichtbarkeit von Edit Mode, FAB, Sidebar-Tabs (Proxmox, Security, Settings).
- **Öffentliche Endpunkte** (kein Auth nötig):
  - `GET /api/auth/mode` — Prüft ob AD aktiviert ist
  - `GET /api/appearance/wallpaper` — Hintergrundbild für Login-Seite

---

## Sicherheit

### Bind-Passwort-Verschlüsselung
Das Bind-Passwort des Service-Accounts wird mit **Fernet** (AES-128-CBC) verschlüsselt in der DB gespeichert. Der Schlüssel (`ENCRYPTION_KEY`) liegt in der `.env`-Datei.

### SSL/TLS
- **LDAPS** (Port 636): Vollständig verschlüsselte Verbindung von Anfang an
- **StartTLS** (Port 389): Upgrade auf verschlüsselte Verbindung nach Verbindungsaufbau
- **Ohne SSL/TLS** (Port 389): Nur für Testumgebungen! Passwörter werden im Klartext übertragen.

> ⚠️ **Empfehlung:** In Produktivumgebungen immer LDAPS oder StartTLS verwenden.

### Self-Signed Zertifikate
Für Self-Signed Zertifikate (z.B. Samba AD mit eigenem CA) ist `validate=ssl.CERT_NONE` konfiguriert. Für Produktivumgebungen sollte das CA-Zertifikat eingebunden werden.

### Rate Limiting
LDAP-Logins unterliegen dem gleichen Rate Limiting wie lokale Logins:
- **slowapi:** 5 Login-Versuche pro Minute
- **IP-Tracker:** Lockout nach zu vielen Fehlversuchen

### Config-Cache
Die LDAP-Konfiguration wird für **60 Sekunden gecacht**, um nicht bei jedem Login die DB abzufragen. Der Cache wird bei Konfigurationsänderungen über die UI automatisch invalidiert.

---

## Datenbank

### Tabelle `ldap_config`

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
    bind_password TEXT,                   -- Fernet-verschlüsselt
    user_attribute VARCHAR(100) DEFAULT 'sAMAccountName',
    domain VARCHAR(255),
    admin_group_dn VARCHAR(500),
    viewer_group_dn VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT ldap_single_row CHECK (id = 1)
);
```

Die Tabelle ist ein Singleton (nur id=1 erlaubt), analog zu `appearance` und `spotify_config`.

---

## API-Endpunkte

| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|--------------|
| `GET` | `/api/auth/mode` | Nein | AD-Status abfragen (ad_enabled, domain) |
| `POST` | `/api/login` | Nein | Login (AD + Local Fallback) |
| `GET` | `/api/ldap/config` | Admin | LDAP-Konfiguration lesen |
| `POST` | `/api/ldap/config` | Admin | LDAP-Konfiguration speichern |
| `DELETE` | `/api/ldap/config` | Admin | LDAP-Konfiguration löschen (Deinstallieren) |
| `POST` | `/api/ldap/test` | Admin | LDAP-Verbindung testen |
| `PUT` | `/api/ldap/toggle` | Admin | LDAP aktivieren/deaktivieren |
| `GET` | `/api/appearance/wallpaper` | Nein | Hintergrundbild (für Login-Seite) |

---

## Beteiligte Dateien

| Datei | Beschreibung |
|-------|-------------|
| `backend/core/ldap_auth.py` | LDAP-Kernlogik: Config-Cache, Authentifizierung, Rollenbestimmung, Verbindungstest |
| `backend/routers/auth.py` | Login-Endpoint mit AD + Local Fallback, `/api/auth/mode` |
| `backend/routers/admin.py` | LDAP-Config CRUD, Test, Toggle (unter `/api/ldap/*`) |
| `backend/dependencies/auth.py` | `require_any_role()` für Viewer+Admin-Zugriff |
| `frontend/src/hooks/useAuth.js` | AD-State (adEnabled, adDomain, userRole, isAdmin), `/api/auth/mode` Fetch |
| `frontend/src/components/LoginModal.jsx` | Username-Feld bei AD, Login-Flow |
| `frontend/src/components/settings/LdapAddon.jsx` | LDAP-Konfigurationsformular in Settings → AddOns |
| `frontend/src/components/Sidebar.jsx` | Viewer-Guards (versteckt Edit Mode, Proxmox, Security, Settings) |
| `frontend/src/i18n/locales/de.json` | Deutsche LDAP/AD-Übersetzungen (~45 Keys) |
| `frontend/src/i18n/locales/en.json` | Englische LDAP/AD-Übersetzungen (~45 Keys) |
| `db/init.sql` | `ldap_config` Tabellendefinition |

---

## Troubleshooting

### "Invalid credentials" trotz korrektem Passwort
- Prüfen ob der User in der Admin- oder Viewer-Gruppe ist
- Ohne Gruppenmitgliedschaft wird der Login abgelehnt
- Backend-Logs prüfen: `docker compose logs backend | grep LDAP`

### "User nicht gefunden"
- `user_search_base` prüfen — muss den Container enthalten, in dem der User liegt
- Bei relativer Angabe (z.B. `CN=Users`) wird automatisch die Base DN angehängt
- `user_attribute` prüfen — Standard ist `sAMAccountName` (AD), für OpenLDAP ggf. `uid`

### Verbindungstest schlägt fehl
- Host und Port prüfen (389 für LDAP, 636 für LDAPS)
- Firewall-Regeln prüfen (Docker-Container muss den DC erreichen können)
- Bind-DN und Bind-Passwort des Service-Accounts prüfen
- Bei SSL-Problemen: Zunächst ohne SSL testen

### Viewer sieht weißen Hintergrund
- Sollte nicht mehr auftreten — `GET /api/appearance/wallpaper` ist ein öffentlicher Endpoint
- Falls doch: Browser-Cache leeren und neu laden

### Cache-Probleme nach Konfigurationsänderung
- Der Config-Cache hat eine TTL von 60 Sekunden
- Bei Änderungen über die UI wird der Cache automatisch invalidiert
- Bei manuellen DB-Änderungen: Backend neu starten oder 60s warten
