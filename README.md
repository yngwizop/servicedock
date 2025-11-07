# 🌐 Web Dashboard

Ein modernes, selbst gehostetes Dashboard zum Verwalten und Organisieren deiner Web-Services und Shortcuts. Perfekt für Homelab-Setups, Self-Hosting-Enthusiasten oder als persönliche Startseite.


## 📚 Dokumentation

### 🚀 Setup & Installation
- **[INITIAL_SETUP.md](INITIAL_SETUP.md)** - Vollständige Ersteinrichtung mit Tool-Installation, Key-Generierung und Docker-Setup
- **[PROXMOX_SETUP.md](PROXMOX_SETUP.md)** - Proxmox API Token erstellen und Integration einrichten

### 🔒 Sicherheit
- **[SECURITY_IMPLEMENTATION.md](SECURITY_IMPLEMENTATION.md)** - Technische Details der implementierten Security-Features
- **[SECURITY_FEATURES.md](SECURITY_FEATURES.md)** - Audit-Logging, Rate-Limiting und Security-Dashboard
- **[ENCRYPTION.md](ENCRYPTION.md)** - Token-Verschlüsselung mit Fernet (AES-128)

### 🔄 Maintenance
- **[TOKEN_ROTATION_GUIDE.md](TOKEN_ROTATION_GUIDE.md)** - Proxmox API Tokens regelmäßig erneuern
- **[RE_ENCRYPTION_GUIDE.md](RE_ENCRYPTION_GUIDE.md)** - Encryption Key wechseln und Tokens neu verschlüsseln

---

## ✨ Features

### 🎨 Anpassbares Design
- **Light/Dark Mode** mit automatischer Theme-Erkennung
- Anpassbare Hintergrundfarben und Hintergrundbilder
- Einstellbare Schriftfarben für Light und Dark Mode
- Flexible Grid-Layouts (2-12 Spalten)
- Backdrop-Blur-Effekte und moderne Glasmorphism-Optik

### 📱 Services & Shortcuts
- **Services**: Detaillierte Karten mit Name, Beschreibung, URL und Icon
- **Shortcuts**: Kompakte Links für schnellen Zugriff
- Icon-Support via URL oder Emoji
- Externe Icons können von [selfh.st/icons](https://selfh.st/icons/) verwendet werden

### 🔐 Admin-Bereich
- Passwortgeschützter Login
- Intuitives Edit-Modal für Services und Shortcuts
- Live-Bearbeitung mit sofortiger Vorschau
- Settings-Panel mit Tabs für bessere Organisation

### 📊 Proxmox Monitoring (Admin-only)
- **VM/Container-Übersicht**: Zeigt alle VMs und LXC-Container
- **Status-Anzeige**: Live-Status (running/stopped) mit Farb-Kodierung
- **Remote-Control**: Start, Stop, Reboot direkt aus dem Dashboard
- **Filter & Sortierung**: 6 Sortier-Optionen + Typ/Status-Filter
- **Token-Verschlüsselung**: API-Tokens werden mit Fernet (AES-128) verschlüsselt

### 🛡️ Security Features (Admin-only)
- **Audit-Logging**: Alle Proxmox-Aktionen werden protokolliert
  - Automatische Bereinigung alter Logs (>90 Tage) beim Start
  - Manuelles Löschen via Security Dashboard (Passwort erforderlich)
- **Rate-Limiting**: Schutz vor API-Missbrauch (30/min View, 10/min Control)
- **Token-Rotation**: Automatische Warnung nach 60 Tagen, Tracking von Token-Alter
- **Security Dashboard**: Übersicht über Audit-Logs, Statistiken und Token-Status

### 🚀 Technologie-Stack
- **Frontend**: React 20 + Tailwind CSS + Vite
- **Backend**: FastAPI (Python 3.11)
- **Datenbank**: PostgreSQL 16
- **Deployment**: Docker + Docker Compose
- **Styling**: Tailwind CSS mit Dark Mode Support
- **Icons**: Phosphor Icons
- **Proxmox API**: proxmoxer library
- **Security**: cryptography (Fernet), slowapi (Rate-Limiting)

## 📦 Installation

### Voraussetzungen
- Docker & Docker Compose
- Git

### Setup

1. **Repository klonen**
```bash
git clone <dein-repo-url>
cd web-dashboard
```

2. **Umgebungsvariablen konfigurieren**
```bash
# .env Datei erstellen
DATABASE_URL=postgresql://user:password@db:5432/dashboard
ADMIN_PASSWORD=dein-sicheres-passwort
```

3. **Docker Container starten**
```bash
docker-compose up -d --build
```

4. **Dashboard öffnen**
```
http://localhost:3000
```

## 🎯 Verwendung

### Services hinzufügen
1. Admin-Login (🔒 Button unten rechts)
2. Settings öffnen (⚙️ Button)
3. Tab "Services & Shortcuts" auswählen
4. Service-Formular ausfüllen und "Hinzufügen" klicken

### Services bearbeiten
1. Im eingeloggten Zustand über eine Service-Card hovern
2. ✏️-Button klicken
3. Im Modal bearbeiten und "Speichern" klicken

### Design anpassen
1. Settings öffnen
2. Tab "Appearance" auswählen
3. Farben, Hintergründe und Layout anpassen
4. "Save Changes" klicken

## 🎨 Appearance-Optionen

- **Background Color**: Hintergrundfarbe des Dashboards
- **Background Image**: URL zu einem Hintergrundbild
- **Background Opacity**: Transparenz des Hintergrundbildes (0-1)
- **Text Colors**: Separate Schriftfarben für Light und Dark Mode
- **Service Columns**: Anzahl der Spalten für Services (2-10)
- **Shortcut Columns**: Anzahl der Spalten für Shortcuts (2-8)

## 🔧 Backend-API

### Architektur

Das Backend verwendet eine **modulare Router-Architektur**:

```
backend/
├── main.py                  # App-Initialisierung (131 Zeilen)
├── config/                  # Konfiguration
│   ├── settings.py          # ENV-Variablen
│   └── database.py          # PostgreSQL Connection Pool
├── core/                    # Core-Funktionalität
│   ├── security.py          # JWT, Bcrypt, Encryption (Fernet)
│   ├── audit.py             # Audit-Logging
│   ├── rate_limiting.py     # IP-basierte Rate Limits
│   └── limiter.py           # Shared SlowAPI Limiter
├── middleware/              # Middleware
│   └── security.py          # Security Headers
├── models/                  # Pydantic Schemas
│   ├── auth.py
│   ├── service.py
│   ├── shortcut.py
│   ├── appearance.py
│   └── proxmox.py
├── dependencies/            # FastAPI Dependencies
│   └── auth.py              # JWT-Verifizierung, require_role()
└── routers/                 # API-Routers (modular)
    ├── auth.py              # Login (70 Zeilen)
    ├── shortcuts.py         # Shortcuts CRUD + Reorder (85 Zeilen)
    ├── services.py          # Services CRUD + Reorder (88 Zeilen)
    ├── appearance.py        # Appearance Settings (84 Zeilen)
    ├── proxmox.py           # VM-Management (438 Zeilen)
    └── admin.py             # Audit-Logs + Token-Rotation (235 Zeilen)
```

**Vorteile der modularen Struktur:**
- ✅ 92% Code-Reduktion in main.py (1618 → 131 Zeilen)
- ✅ Klare Separation of Concerns
- ✅ Einfache Wartbarkeit und Erweiterbarkeit
- ✅ Bessere Testbarkeit
- ✅ Wiederverwendbare Komponenten

### API Endpoints

**Authentication**
- `POST /api/login` - Admin-Login mit JWT
  - Rate Limit: 5 Anfragen/Minute (SlowAPI)
  - IP-basierter Lockout nach 5 Fehlversuchen

**Services** (`/api/services`)
- `GET /` - Alle Services abrufen (öffentlich)
- `POST /` - Service hinzufügen (Admin-only)
- `PUT /{id}` - Service aktualisieren (Admin-only)
- `DELETE /{id}` - Service löschen (Admin-only)
- `PUT /reorder` - Services neu sortieren (Admin-only)

**Shortcuts** (`/api/shortcuts`)
- `GET /` - Alle Shortcuts abrufen (öffentlich)
- `POST /` - Shortcut hinzufügen (Admin-only)
- `PUT /{id}` - Shortcut aktualisieren (Admin-only)
- `DELETE /{id}` - Shortcut löschen (Admin-only)
- `PUT /reorder` - Shortcuts neu sortieren (Admin-only)

**Appearance** (`/api/appearance`)
- `GET /` - Design-Einstellungen abrufen (öffentlich)
- `PUT /` - Design-Einstellungen aktualisieren (Admin-only)

**Proxmox Monitoring** (`/api/proxmox`) - Admin-only
- `GET /config` - Proxmox-Konfiguration abrufen (Token maskiert)
- `PUT /config` - Proxmox-Konfiguration speichern (Token verschlüsselt)
- `GET /vms` - Alle VMs/Container abrufen
  - Rate Limit: 30 Anfragen/Minute
- `POST /vm/{vmid}/start` - VM/Container starten
  - Rate Limit: 10 Anfragen/Minute
  - Query-Parameter: `vm_type` (qemu/lxc)
- `POST /vm/{vmid}/stop` - VM/Container stoppen
  - Rate Limit: 10 Anfragen/Minute
- `POST /vm/{vmid}/reboot` - VM/Container neustarten
  - Rate Limit: 10 Anfragen/Minute

**Admin Security** (`/api/admin`) - Admin-only
- `GET /audit-logs` - Audit-Logs abrufen (paginiert)
  - Query-Parameter: `limit` (default: 100), `offset` (default: 0)
- `GET /audit-stats` - Audit-Statistiken abrufen
  - Aktionen (24h), Top-IPs (7d), Fehlerrate (24h)
- `POST /audit-logs/cleanup` - Alte Logs löschen
  - Query-Parameter: `days` (default: 90)
- `POST /audit-logs/delete-all` - Alle Logs löschen
  - Body: `{"password": "admin-password"}`
- `GET /proxmox/token-info` - Token-Alter und Rotation-Status
- `POST /proxmox/rotate-token` - Proxmox API Token rotieren

**System**
- `GET /` - Health Check
- `GET /api/info` - API-Information (Version, Router-Liste)

## 📂 Projektstruktur

```
web-dashboard/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ServiceCard.jsx
│   │   │   ├── ServiceGrid.jsx
│   │   │   ├── ShortcutLink.jsx
│   │   │   ├── ShortcutGrid.jsx
│   │   │   ├── EditModal.jsx
│   │   │   ├── LoginModal.jsx
│   │   │   ├── SettingsPanel.jsx
│   │   │   ├── ProxmoxCard.jsx
│   │   │   ├── ProxmoxGrid.jsx
│   │   │   └── SecurityDashboard.jsx
│   │   ├── utils/
│   │   │   └── auth.js           # JWT-Token-Verwaltung
│   │   ├── App.jsx
│   │   └── index.css
│   ├── package.json
│   └── Dockerfile
├── backend/
│   ├── main.py                   # App-Initialisierung (131 Zeilen) ⚡
│   ├── config/                   # Konfiguration
│   │   ├── __init__.py
│   │   ├── settings.py           # ENV-Variablen, Keys
│   │   └── database.py           # PostgreSQL Connection Pool
│   ├── core/                     # Core-Funktionalität
│   │   ├── __init__.py
│   │   ├── security.py           # JWT, Bcrypt, Fernet-Encryption
│   │   ├── audit.py              # Audit-Logging
│   │   ├── logging.py            # Custom Logger
│   │   ├── rate_limiting.py      # IP-basierte Lockouts
│   │   └── limiter.py            # Shared SlowAPI Limiter
│   ├── middleware/               # FastAPI Middleware
│   │   ├── __init__.py
│   │   └── security.py           # Security Headers
│   ├── models/                   # Pydantic Schemas
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── service.py
│   │   ├── shortcut.py
│   │   ├── appearance.py
│   │   └── proxmox.py
│   ├── dependencies/             # FastAPI Dependencies
│   │   ├── __init__.py
│   │   └── auth.py               # JWT-Verify, require_role()
│   ├── routers/                  # API-Routers (modular) ⚡
│   │   ├── auth.py               # Login (70 Zeilen)
│   │   ├── shortcuts.py          # Shortcuts CRUD (85 Zeilen)
│   │   ├── services.py           # Services CRUD (88 Zeilen)
│   │   ├── appearance.py         # Appearance Settings (84 Zeilen)
│   │   ├── proxmox.py            # VM-Management (438 Zeilen)
│   │   └── admin.py              # Audit-Logs + Token-Rotation (235 Zeilen)
│   ├── requirements.txt
│   └── Dockerfile
├── db/
│   └── init.sql
├── docker-compose.yml
├── .env                          # Umgebungsvariablen (nicht im Repo)
├── SECURITY_FEATURES.md
├── SECURITY_IMPLEMENTATION.md
├── TOKEN_ROTATION_GUIDE.md
├── ENCRYPTION.md
├── INITIAL_SETUP.md
├── PROXMOX_SETUP.md
└── README.md
```

**Highlights:**
- ⚡ **main.py**: Von 1618 auf 131 Zeilen reduziert (92% Reduktion)
- 🧩 **Modulare Router**: 6 spezialisierte Router für klare Struktur
- 🔒 **Security-First**: Encryption, Audit-Logging, Rate-Limiting
- 📦 **Connection Pooling**: Effizientes PostgreSQL-Handling (min=2, max=10)

## 🛠️ Entwicklung

### Frontend entwickeln
```bash
cd frontend
npm install
npm start
```

### Backend entwickeln
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```


## 🐛 Troubleshooting

### Backend startet nicht
```bash
docker-compose logs backend
```

### Datenbank-Verbindungsfehler
- Überprüfe `DATABASE_URL` in der `.env` Datei
- Stelle sicher, dass PostgreSQL Container läuft: `docker ps`

### Frontend zeigt keine Daten
- Überprüfe `BACKEND_URL` in `App.jsx`
- Stelle sicher, dass Backend erreichbar ist

## 📝 To-Do / Roadmap

- [x] Proxmox Monitoring Integration
- [x] Token-Verschlüsselung (Fernet AES-128)
- [x] Audit-Logging für alle Proxmox-Aktionen
- [x] Rate-Limiting (30/min View, 10/min Control)
- [x] Token-Rotation Tracking (60 Tage Empfehlung)
- [x] Security Dashboard mit Statistiken
- [x] Automatische Audit-Log-Bereinigung (>90 Tage)
- [ ] Drag & Drop für Service-Reihenfolge
- [ ] Multiple Spalten Support zur besseren Organisation der Services/Shortcuts
- [ ] Export/Import von Konfigurationen
- [ ] Multi-User-Support
- [ ] Kategorien/Gruppen für Services
- [ ] Suchfunktion
- [ ] Mobile App (React Native)

## 🤝 Beitragen

Contributions sind willkommen! Bitte erstelle einen Pull Request oder öffne ein Issue für Vorschläge und Bug-Reports.

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE) Datei für Details.

## 🙏 Danksagungen

- Icons von [selfh.st/icons](https://selfh.st/icons/)
- UI-Framework: [Tailwind CSS](https://tailwindcss.com/)
- Backend-Framework: [FastAPI](https://fastapi.tiangolo.com/)

---

**Made with ❤️ for the self-hosting community**