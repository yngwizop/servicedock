# 🌐 ServiceDock - Web Dashboard

Ein modernes, selbst gehostetes Dashboard zum Verwalten und Organisieren deiner Web-Services, Shortcuts und Proxmox VMs. Perfekt für Homelab-Setups, Self-Hosting-Enthusiasten oder als persönliche Startseite mit integriertem VM-Management.

**Version:** 2.0 | **Status:** ✅ Production Ready | **Security Score:** 10.0/10 🟢

---

## 📚 Dokumentation

### 🚀 Setup & Installation
- **[INITIAL_SETUP.md](INITIAL_SETUP.md)** - Vollständige Ersteinrichtung mit Tool-Installation, Key-Generierung und Docker-Setup
- **[PROXMOX_SETUP.md](PROXMOX_SETUP.md)** - Proxmox API Token erstellen und Integration einrichten

### 🔒 Sicherheit & Verschlüsselung
- **[ENCRYPTION.md](ENCRYPTION.md)** - Token-Verschlüsselung mit Fernet (AES-128) und Security Best Practices
- **[FINAL_SECURITY_CHECK.md](FINAL_SECURITY_CHECK.md)** - Umfassende Sicherheitsanalyse und Production-Readiness

### 🔄 Wartung & Token-Management
- **[TOKEN_ROTATION_GUIDE.md](TOKEN_ROTATION_GUIDE.md)** - Proxmox API Tokens regelmäßig erneuern (alle 60 Tage)
- **[RE_ENCRYPTION_GUIDE.md](RE_ENCRYPTION_GUIDE.md)** - Encryption Key wechseln und Tokens neu verschlüsseln

### 📡 API-Referenz
- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Vollständige API-Dokumentation aller Endpoints

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
- **Frontend**: React 18 + Tailwind CSS + Vite
- **Backend**: FastAPI (Python 3.11) mit modularer Router-Architektur
- **Datenbank**: PostgreSQL 16 mit Connection Pooling
- **Deployment**: Docker + Docker Compose mit Health-Checks
- **Styling**: Tailwind CSS mit Dark Mode Support
- **Icons**: Phosphor Icons + Custom Icon Support
- **Proxmox API**: proxmoxer library mit verschlüsselter Token-Speicherung
- **Security**: cryptography (Fernet AES-128), slowapi (Rate-Limiting), bcrypt (Password-Hashing)

## 📦 Installation

### Voraussetzungen
- Docker & Docker Compose
- Git
- Python 3.11+ (für Key-Generierung)
- Minimum 2GB RAM, 10GB Disk Space

### Schnellstart

1. **Repository klonen**
```bash
git clone https://github.com/yngwizop/servicedock.git
cd servicedock
```

2. **Sicherheits-Keys generieren**
```bash
# ENCRYPTION_KEY generieren
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# JWT_SECRET_KEY generieren
openssl rand -hex 32
```

3. **Umgebungsvariablen konfigurieren**
```bash
# .env Datei erstellen
nano .env
```

**Minimal-Konfiguration (.env):**
```env
# Admin-Login (MINIMUM 8 Zeichen!)
ADMIN_PASSWORD=dein_sicheres_passwort

# Datenbank
POSTGRES_USER=dashboard_user
POSTGRES_PASSWORD=dein_db_passwort
POSTGRES_DB=dashboard
DATABASE_URL=postgresql://dashboard_user:dein_db_passwort@db:5432/dashboard

# Verschlüsselung (NIEMALS ÄNDERN nach erstem Start!)
ENCRYPTION_KEY=<dein_generierter_key>
JWT_SECRET_KEY=<dein_generierter_key>

# Token-Laufzeit (Minuten)
ACCESS_TOKEN_EXPIRE_MINUTES=120

# Frontend-URL für CORS
FRONTEND_URL=http://localhost:3000

# Environment (development oder production)
ENVIRONMENT=development
```

4. **Docker Container starten**
```bash
docker compose up -d --build
```

5. **Dashboard öffnen**
```
http://localhost:3000
```

📖 **Detaillierte Anleitung:** Siehe [INITIAL_SETUP.md](INITIAL_SETUP.md)

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
servicedock/
├── frontend/                    # React Frontend (Vite)
│   ├── src/
│   │   ├── components/         # React-Komponenten
│   │   │   ├── ServiceCard.jsx      # Service-Karte mit Icon & Beschreibung
│   │   │   ├── ServiceGrid.jsx      # Grid-Layout für Services
│   │   │   ├── ShortcutLink.jsx     # Kompakter Shortcut-Link
│   │   │   ├── ShortcutGrid.jsx     # Grid-Layout für Shortcuts
│   │   │   ├── EditModal.jsx        # Modal für Add/Edit
│   │   │   ├── LoginModal.jsx       # Admin-Login
│   │   │   ├── SettingsPanel.jsx    # Settings mit Tabs
│   │   │   ├── ProxmoxCard.jsx      # VM/Container-Karte
│   │   │   ├── ProxmoxGrid.jsx      # Proxmox Monitoring
│   │   │   ├── SecurityDashboard.jsx # Audit-Logs & Stats
│   │   │   ├── ClockWidget.jsx      # Uhrzeit-Widget
│   │   │   └── WeatherWidget.jsx    # Wetter-Widget
│   │   ├── utils/
│   │   │   └── auth.js              # JWT-Token-Verwaltung
│   │   ├── App.jsx                  # Haupt-App-Komponente
│   │   └── index.css                # Tailwind CSS
│   ├── package.json
│   └── Dockerfile
├── backend/                     # FastAPI Backend (Python 3.11)
│   ├── main.py                  # App-Init (131 Zeilen) ⚡
│   ├── config/                  # Konfiguration
│   │   ├── settings.py          # ENV-Variablen & Keys
│   │   └── database.py          # PostgreSQL Connection Pool
│   ├── core/                    # Core-Funktionalität
│   │   ├── security.py          # JWT, Bcrypt, Fernet-Encryption
│   │   ├── audit.py             # Audit-Logging-System
│   │   ├── logging.py           # Custom Logger
│   │   ├── rate_limiting.py     # IP-basierte Rate-Limits
│   │   └── limiter.py           # Shared SlowAPI Limiter
│   ├── middleware/              # FastAPI Middleware
│   │   └── security.py          # Security Headers (CSP, HSTS)
│   ├── models/                  # Pydantic Schemas
│   │   ├── auth.py              # Login-Models
│   │   ├── service.py           # Service-Models
│   │   ├── shortcut.py          # Shortcut-Models
│   │   ├── appearance.py        # Appearance-Settings
│   │   ├── proxmox.py           # Proxmox-Config
│   │   └── reorder.py           # Reorder-Request
│   ├── dependencies/            # FastAPI Dependencies
│   │   └── auth.py              # JWT-Verify, require_role()
│   ├── routers/                 # API-Routers (modular) ⚡
│   │   ├── auth.py              # Login (70 Zeilen)
│   │   ├── shortcuts.py         # Shortcuts CRUD (85 Zeilen)
│   │   ├── services.py          # Services CRUD (88 Zeilen)
│   │   ├── appearance.py        # Appearance Settings (84 Zeilen)
│   │   ├── proxmox.py           # VM-Management (438 Zeilen)
│   │   └── admin.py             # Audit-Logs + Token-Rotation (235 Zeilen)
│   ├── migrate_encrypt_tokens.py # Verschlüsselungs-Migration
│   ├── re_encrypt_tokens.py      # Re-Encryption bei Key-Wechsel
│   ├── requirements.txt
│   └── Dockerfile
├── db/
│   └── init.sql                 # DB-Schema & Dummy-Daten
├── docker-compose.yml           # Docker-Orchestrierung mit Health-Checks
├── .env                         # Umgebungsvariablen (nicht im Repo)
├── .gitignore
└── README.md                    # Diese Datei
```

**Highlights:**
- ⚡ **main.py**: Von 1618 auf 131 Zeilen reduziert (92% Code-Reduktion)
- 🧩 **Modulare Router**: 6 spezialisierte Router für klare Struktur
- 🔒 **Security-First**: Encryption, Audit-Logging, Rate-Limiting
- 📦 **Connection Pooling**: Effizientes PostgreSQL-Handling (min=2, max=10)
- 🏥 **Health-Checks**: Database Health-Check verhindert Backend-Crashes

---

## 🛠️ Entwicklung

### Frontend entwickeln
```bash
cd frontend
npm install
npm run dev  # Development-Server mit Hot-Reload
```

### Backend entwickeln
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Datenbank-Zugriff
```bash
# PostgreSQL Shell
docker compose exec db psql -U dashboard_user -d dashboard

# Audit-Logs anzeigen
SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 10;

# Services/Shortcuts anzeigen
SELECT * FROM services;
SELECT * FROM shortcuts;
```

---

## 🐛 Troubleshooting

### Backend startet nicht
```bash
# Logs prüfen
docker compose logs backend --tail 50

# Häufige Probleme:
# - DATABASE_URL falsch → .env prüfen
# - ENCRYPTION_KEY fehlt → Key generieren
# - DB nicht ready → Health-Check aktivieren
```

### Database Connection Failed
```bash
# Container-Status prüfen
docker compose ps

# Database Health prüfen
docker compose exec db pg_isready -U dashboard_user

# Lösung: Health-Check in docker-compose.yml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
  interval: 5s
  timeout: 5s
  retries: 5
```

### Frontend zeigt keine Daten
```bash
# Backend-Erreichbarkeit testen
curl http://localhost:8000/api/services
curl http://localhost:8000/api/shortcuts

# Browser-Konsole auf CORS-Fehler prüfen
# FRONTEND_URL in .env korrekt setzen
```

### Proxmox Integration funktioniert nicht
```bash
# Token-Verschlüsselung prüfen
docker compose exec backend python3 migrate_encrypt_tokens.py

# Proxmox-Verbindung testen
curl http://localhost:8000/api/proxmox/vms

# Siehe PROXMOX_SETUP.md für Details
```

### Admin-Login schlägt fehl
```bash
# Rate-Limiting prüfen (5 Fehlversuche = 15min Sperre)
# ADMIN_PASSWORD in .env überprüfen (min. 8 Zeichen!)
# Backend-Logs prüfen:
docker compose logs backend | grep "LOGIN"
```

---

## 📝 To-Do / Roadmap

### ✅ Abgeschlossen
- [x] Proxmox Monitoring Integration mit Live-Status
- [x] Token-Verschlüsselung (Fernet AES-128)
- [x] Audit-Logging für alle kritischen Operationen
- [x] Rate-Limiting (SlowAPI + IP-Lockout)
- [x] Token-Rotation Tracking (60 Tage Empfehlung)
- [x] Security Dashboard mit Statistiken & Audit-Logs
- [x] Automatische Audit-Log-Bereinigung (>90 Tage)
- [x] Docker Health-Checks für zuverlässigen Start
- [x] Connection Pooling für bessere Performance
- [x] Modulare Backend-Architektur (92% Code-Reduktion)
- [x] Clock & Weather Widgets
- [x] Re-Encryption Tools bei Key-Wechsel

### 🚧 In Planung
- [ ] Drag & Drop für Service/Shortcut-Reihenfolge
- [ ] Multi-Spalten-Layout mit anpassbaren Grid-Bereichen
- [ ] Export/Import von Konfigurationen (JSON/YAML)
- [ ] Multi-User-Support mit Rollen (Admin/User/Guest)
- [ ] Kategorien/Gruppen für Services & Shortcuts
- [ ] Suchfunktion & Filtering
- [ ] Benachrichtigungen bei VM-Status-Änderungen
- [ ] Container-Statistiken (CPU/RAM-Diagramme)
- [ ] Mobile App (React Native/PWA)
- [ ] Dark/Light Mode Toggle mit Custom Themes
- [ ] Backup & Restore Funktionalität

---

## 🤝 Beitragen

Contributions sind willkommen! Bitte beachte:

1. **Fork** das Repository
2. Erstelle einen **Feature-Branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit** deine Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. **Push** zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen **Pull Request**

### Entwicklungs-Guidelines
- Code sollte den bestehenden Style-Conventions folgen
- Neue Features sollten dokumentiert werden
- Security-kritische Änderungen müssen geprüft werden
- Tests für neue Funktionen sind erwünscht

---

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE) Datei für Details.

---

## 🙏 Danksagungen

- **Icons**: [selfh.st/icons](https://selfh.st/icons/) - Umfangreiche Icon-Sammlung
- **UI-Framework**: [Tailwind CSS](https://tailwindcss.com/) - Utility-First CSS
- **Backend-Framework**: [FastAPI](https://fastapi.tiangolo.com/) - Modernes Python Web-Framework
- **Proxmox**: [Proxmoxer](https://pypi.org/project/proxmoxer/) - Proxmox API Library
- **Encryption**: [Cryptography](https://cryptography.io/) - Fernet AES-128
- **Icon-Library**: [Phosphor Icons](https://phosphoricons.com/) - Modernes Icon-Set

---

## 📊 Status

![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Python_3.11-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Security](https://img.shields.io/badge/Security_Score-10.0/10-success)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

**Made with ❤️ for the self-hosting community**

**Repository**: [github.com/yngwizop/servicedock](https://github.com/yngwizop/servicedock)