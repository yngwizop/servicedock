# ServiceDock — Projekt-Dokumentation & Kontext

## 1. Projektübersicht

### Zweck
ServiceDock ist ein **Self-Hosted Web Dashboard** für Homelabs. Es aggregiert Bookmarks/Services, Proxmox-VM-Verwaltung, Spotify-Integration und systemweite Übersichten in einer einzigen, glasmorphen Web-Oberfläche. Deployed wird es als Docker-Compose-Stack (nginx → React-Frontend + FastAPI-Backend + PostgreSQL).

### Kern-Features
- **Multi-Dashboard** — Mehrere Dashboards mit jeweils eigenen Services/Shortcuts/Proxmox-Konfigurationen
- **Service- & Shortcut-Verwaltung** — CRUD + Drag-and-Drop Reordering + Favoriten
- **Proxmox-Integration** — VM/LXC-Übersicht, Start/Stop/Reboot, Cluster-Stats, Datacenter Status-Dashboard
- **Proxmox Status-Dashboard** — Draggable/Resizable Widget-Grid (react-grid-layout) mit Node-Status, VM/LXC-Status, Top-Usage, Storage, Ceph Health, Task-Übersicht
- **Spotify-AddOn** — OAuth2-Flow, Now-Playing-Anzeige mit Playback-Controls
- **Security Dashboard** — Audit-Log-Viewer, Token-Rotation, Rate-Limit-Monitoring, Threat-Detection
- **Appearance-System** — Hintergrundbilder, Farben, Grid-Spaltenanzahl, Widget-Toggles (Wetter/Uhr/Spotify)
- **Wetter & Uhr** — Open-Meteo API, konfigurierbares 12h/24h Format
- **Config Import/Export** — JSON-Backup/Restore mit Validierung
- **Edit Mode** — Toggle in Sidebar, kontrolliert Sichtbarkeit von Edit/Star/Drag auf Cards
- **Globale Suche** — Ctrl+F Overlay, filtert Services/Shortcuts/Proxmox je nach aktivem Tab

---

## 2. Tech Stack & Abhängigkeiten

### Frontend
| Technologie | Version | Zweck |
|---|---|---|
| React | 19.x | UI Framework |
| Vite | 7.x | Build Tool & Dev Server |
| Tailwind CSS | 3.4 | Utility-First CSS (Glasmorphismus-Design) |
| phosphor-react | 1.4 | Icon Library (Duotone-Stil) |
| react-grid-layout | 1.4 | Draggable/Resizable Grid (Status-Dashboard) |
| DOMPurify | 3.2 | XSS-Schutz für User-Input |

**State Management:** Kein Redux/Zustand — 4 Custom Hooks (`useAuth`, `useDashboards`, `useAppearance`, `useServices`) + lokaler `useState` in `App.jsx`.

### Backend
| Technologie | Version | Zweck |
|---|---|---|
| Python | 3.11 | Runtime |
| FastAPI | latest | Web Framework (async) |
| uvicorn | latest | ASGI Server |
| psycopg2-binary | latest | PostgreSQL Driver (sync, in ThreadPool) |
| python-jose | latest | JWT Token Handling |
| bcrypt | ≥4.0 | Passwort-Hashing (12 Rounds) |
| cryptography (Fernet) | latest | Verschlüsselung sensibler Daten |
| slowapi | latest | Rate Limiting |
| proxmoxer | latest | Proxmox VE API Client |

**API-Struktur:** REST, alle Routen unter `/api/*`, modulares Router-Pattern.

### Datenbank
| Eigenschaft | Wert |
|---|---|
| Typ | PostgreSQL 16 |
| Driver | psycopg2 (ThreadedConnectionPool, min=2, max=10) |
| ORM | Keins — Raw SQL mit Cursor |
| SSL | Aktiv (sslmode=require) |

**Schema-Tabellen:**
| Tabelle | Zweck |
|---|---|
| `services` | Bookmarks mit Name, URL, Icon, Position, Favorite, Dashboard-FK |
| `shortcuts` | Kompakte Links mit Name, URL, Icon, Position, Dashboard-FK |
| `appearance` | Singleton (id=1) — Hintergrund, Farben, Widget-Toggles, Wetter-Config |
| `proxmox_config` | Proxmox-Verbindungsdaten pro Dashboard (Token verschlüsselt) |
| `dashboards` | Multi-Dashboard-Definitionen mit Name, Typ, show_proxmox |
| `audit_log` | Sicherheits-Audit-Trail (Action, IP, Status, Details, User-Agent) |
| `spotify_config` | Singleton (id=1) — OAuth-Tokens (verschlüsselt), Client-Credentials |
| `proxmox_dashboard_layouts` | react-grid-layout JSON pro Dashboard |

### Infrastruktur
```
┌─────────────────────────────────────────────────┐
│  Docker Compose Stack                           │
│                                                 │
│  ┌──────────┐    ┌──────────┐   ┌────────────┐  │
│  │  nginx   │──▶│frontend │   │  backend   │  │
│  │ :80/:443 │──▶│ (SPA)    │   │ (FastAPI)  │  │
│  │ reverse  │   │ :80      │   │ :8000      │  │
│  │ proxy    │──▶│          │   │            │  │
│  │ + SSL    │    └──────────┘   └──────┬─────┘  │
│  └──────────┘                         │        │
│                                ┌──────▼─────┐  │
│                                │ PostgreSQL │  │
│                                │ :5432 SSL  │  │
│                                └────────────┘  │
│                                                 │
│  Externe APIs: Open-Meteo, Spotify, Proxmox VE  │
└─────────────────────────────────────────────────┘
```

- **Hosting:** Self-Hosted (Docker Compose)
- **SSL:** Self-signed Certs (nginx + PostgreSQL)
- **CI/CD:** Kein automatisiertes CI — manuelles `docker compose up --build`
- **Container Registry:** GHCR (optional, siehe GHCR_SETUP.md)

---

## 3. Architektur & Dateistruktur

### Verzeichnisbaum
```
/home/servicedock/
├── docker-compose.yml              # Dev Compose (4 Services)
├── docker-compose.production.yml   # Production Override
├── .env.template                   # Env-Vorlage (→ cp zu .env)
├── generate-ssl.sh                 # Nginx SSL-Cert Generator
│
├── backend/
│   ├── Dockerfile                  # Python 3.11-slim, non-root user
│   ├── main.py                     # FastAPI App, Router-Registration, Startup
│   ├── requirements.txt            # 10 Dependencies
│   ├── config/
│   │   ├── settings.py             # ENV-Vars laden + validieren
│   │   └── database.py             # ThreadedConnectionPool + get_db()
│   ├── core/
│   │   ├── security.py             # JWT, bcrypt, Fernet encrypt/decrypt
│   │   ├── audit.py                # Audit-Log Schreiben (sanitized)
│   │   ├── rate_limiting.py        # IP-basierter Failed-Login-Tracker
│   │   ├── limiter.py              # Shared slowapi Limiter-Instanz
│   │   └── logging.py              # Logger-Config
│   ├── dependencies/
│   │   └── auth.py                 # verify_token, require_role, IP-Trust
│   ├── middleware/
│   │   └── security.py             # Security Headers (CSP, HSTS, etc.)
│   ├── models/                     # Pydantic Request/Response Models
│   │   ├── auth.py, service.py, shortcut.py, appearance.py,
│   │   ├── proxmox.py, spotify.py, dashboard.py, config.py,
│   │   ├── reorder.py, refresh_token.py, responses.py
│   │   └── ...
│   └── routers/                    # API-Endpunkte (modular)
│       ├── auth.py                 # Login/Refresh/Logout
│       ├── services.py             # Service CRUD + Reorder
│       ├── shortcuts.py            # Shortcut CRUD + Reorder
│       ├── appearance.py           # Get/Update Appearance
│       ├── proxmox.py              # Proxmox Config + VM-Control
│       ├── proxmox_stats.py        # Cluster-Stats API
│       ├── admin.py                # Audit, Token-Rotation, Rate-Limits
│       ├── spotify.py              # Spotify OAuth + Now-Playing
│       ├── dashboards.py           # Multi-Dashboard CRUD + Layouts
│       └── config.py               # Import/Export
│
├── frontend/
│   ├── Dockerfile                  # Multi-Stage: Node 20 Build → nginx:alpine
│   ├── package.json                # React 19, Vite 7, Tailwind 3.4
│   ├── vite.config.js              # Vite Config
│   ├── tailwind.config.js          # Tailwind Config
│   ├── nginx-frontend.conf         # SPA-Routing für Frontend-nginx
│   └── src/
│       ├── App.jsx                 # Root (~378 Zeilen) — Hooks, Routing, Layout
│       ├── main.jsx                # React DOM Entry
│       ├── index.css               # Tailwind Imports + Custom CSS
│       ├── hooks/
│       │   ├── useAuth.js          # Login/Logout State + Client Rate-Limit
│       │   ├── useDashboards.js    # Dashboard-Liste + Active Selection
│       │   ├── useAppearance.js    # Theme + Appearance Settings
│       │   └── useServices.js      # Services/Shortcuts CRUD + Reorder
│       ├── utils/
│       │   ├── auth.js             # authenticatedFetch (Cookie-Auth + Auto-Refresh)
│       │   └── sanitize.js         # DOMPurify Wrapper (HTML, Text, URL, Object)
│       ├── components/
│       │   ├── Sidebar.jsx         # Navigation, Theme, Search, Edit-Mode
│       │   ├── ServiceGrid.jsx     # Draggable Service Cards
│       │   ├── ServiceCard.jsx     # Einzelne Service-Karte
│       │   ├── ShortcutGrid.jsx    # Draggable Shortcut Links
│       │   ├── ShortcutLink.jsx    # Einzelner Shortcut
│       │   ├── ProxmoxGrid.jsx     # Proxmox-Hauptview (Filter, Tabs)
│       │   ├── ProxmoxCard.jsx     # VM/CT Karte (Glasmorphismus + Akzent)
│       │   ├── ProxmoxStatsCards.jsx  # Übersichts-Statistikkarten
│       │   ├── ProxmoxStatusDashboard.jsx  # react-grid-layout Dashboard
│       │   ├── SecurityDashboard.jsx   # Audit-Logs + Analytics
│       │   ├── SpotifyCard.jsx     # Now-Playing mit Controls
│       │   ├── ClockWidget.jsx     # Live-Uhr
│       │   ├── WeatherWidget.jsx   # Open-Meteo Wetter
│       │   ├── LoginModal.jsx      # Login-Dialog
│       │   ├── EditModal.jsx       # Service/Shortcut Edit-Dialog
│       │   ├── SettingsPage.jsx    # Settings-Container (Tabs)
│       │   ├── AddItemFAB.jsx      # Floating Action Button
│       │   ├── CustomSelect.jsx    # Portal-basiertes Dropdown
│       │   ├── ErrorBoundary.jsx   # React Error Boundary
│       │   ├── settings/           # Settings Sub-Komponenten
│       │   │   ├── AppearanceTab.jsx
│       │   │   ├── ProxmoxConnectionCard.jsx
│       │   │   ├── ProxmoxDashboardSettingsCard.jsx
│       │   │   ├── ProxmoxTab.jsx
│       │   │   ├── DashboardsCard.jsx
│       │   │   ├── AddOnsCard.jsx
│       │   │   ├── SpotifyAddon.jsx
│       │   │   └── ConfigAddon.jsx
│       │   └── stats/              # Proxmox Status-Dashboard Widgets
│       │       ├── StatCard.jsx (Base)
│       │       ├── NodeStatusCard.jsx
│       │       ├── VMStatusCard.jsx
│       │       ├── TopUsageCard.jsx
│       │       ├── TopDiskUsageCard.jsx
│       │       ├── TaskSummaryCard.jsx
│       │       ├── StorageByNodeCard.jsx
│       │       ├── StorageByTypeCard.jsx
│       │       ├── StorageTotalCard.jsx
│       │       ├── CephHealthCard.jsx
│       │       └── CephOSDCard.jsx
│       └── styles/
│           └── grid-layout.css     # react-grid-layout Overrides
│
├── db/
│   ├── init.sql                    # Schema + Defaults + Indizes
│   └── ssl/                        # PostgreSQL SSL Certs
│
├── nginx/
│   ├── Dockerfile                  # (nicht genutzt, nginx:alpine direkt)
│   ├── nginx.conf                  # Reverse Proxy (HTTP→HTTPS, Frontend+API)
│   └── ssl/                        # Nginx SSL Certs
│
└── *.md                            # Dokumentation (README, Setup-Guides, etc.)
```

### Design Patterns
- **Custom Hooks Pattern** — State-Management in `useAuth`, `useDashboards`, `useAppearance`, `useServices`
- **Router Pattern** (Backend) — Jeder Feature-Bereich hat eigenen FastAPI Router
- **Dependency Injection** — `Depends(get_db)`, `Depends(require_role("admin"))`, `Depends(verify_token)`
- **Singleton** — `appearance` Tabelle (id=1), `spotify_config` (id=1), globaler `cipher_suite`
- **Connection Pool** — ThreadedConnectionPool als globale Variable
- **Middleware Chain** — SecurityHeadersMiddleware + CORSMiddleware
- **Dual-Layer Rate Limiting** — slowapi (request-level) + Custom IP-Tracker (login-level)
- **Token Rotation** — Refresh Tokens werden bei jedem Refresh erneuert

### Datenfluss
```
User Browser
    │
    ├──[HTTPS]──▶ nginx :443
    │               ├──▶ frontend :80 (Static SPA)
    │               └──▶ backend :8000 /api/*
    │                       │
    │                       ├── Auth: httpOnly Cookie (JWT)
    │                       ├── verify_token() / require_role("admin")
    │                       ├── Rate Limit Check (slowapi + custom)
    │                       ├── Audit Log (alle Aktionen)
    │                       ├── DB: psycopg2 ThreadedConnectionPool
    │                       │     └──▶ PostgreSQL :5432 (SSL)
    │                       ├── Proxmox: proxmoxer
    │                       │     └──▶ Proxmox VE API :8006
    │                       └── Spotify: requests
    │                             └──▶ Spotify Web API
    │
    ◀── JSON Response + Set-Cookie
```

---

## 4. Wichtige Konventionen & Regeln

### Coding Guidelines
- **Sprache:** Code auf Englisch, UI-Texte & Kommentare auf Deutsch
- **Backend-Dateibenennung:** snake_case (`proxmox_stats.py`, `rate_limiting.py`)
- **Frontend-Dateibenennung:** PascalCase für Komponenten (`ServiceCard.jsx`), camelCase für Hooks (`useAuth.js`) und Utils (`auth.js`)
- **Komponenten-Struktur:** Functional Components mit Hooks, keine Klassen (außer ErrorBoundary)
- **API-Aufrufe im Frontend:** Immer via `authenticatedFetch()` aus `utils/auth.js` (Cookie-basiert, Auto-Refresh)
- **DB-Aufrufe im Backend:** Sync psycopg2 in `run_in_threadpool()` für async Kompatibilität
- **Fehlerbehandlung:** Backend gibt HTTP-Statuscodes zurück (401, 403, 404, 500), Frontend zeigt deutsche Fehlermeldungen
- **Verschlüsselung:** Alle sensiblen Daten (Proxmox Token, Spotify Secrets) werden mit Fernet verschlüsselt in DB gespeichert
- **Audit:** Sicherheitsrelevante Aktionen werden in `audit_log` geschrieben, sensible Daten automatisch redacted

### Type Safety
- **Kein TypeScript** — Reines JavaScript (JSX) im Frontend
- **Pydantic Models** im Backend für Request/Response-Validierung (`models/` Ordner)
- **prop-types** Package installiert, aber nicht durchgehend verwendet

### Styling
- **Tailwind CSS** als primäres Styling-System (Utility Classes)
- **Design-Sprache:** Glasmorphismus (Dark Mode)
  - Cards: `bg-white/70 dark:bg-gray-900/70 backdrop-blur-md rounded-2xl border border-gray-300/50 dark:border-white/[0.12] shadow-xl`
  - Proxmox VM Cards: Zusätzlich `border-left: 3px solid` mit Status-Farbe (grün=running, rot=stopped) via inline style
  - Stats Cards: `bg-white/70 dark:bg-gray-900/70 backdrop-blur-md` mit farbigen Icon-Akzenten
  - Text-Schatten: Auf allen glasmorphen Cards via inline `textShadow` Styles
- **Dark/Light Mode:** Via `document.documentElement.classList` + Body-Background-Gradients in `useAppearance.js`
- **Keine CSS-Module** — Tailwind + wenig Custom CSS (`index.css`, `grid-layout.css`)
- **Icons:** phosphor-react (Duotone weight), teilweise Emoji für Service-Icons

---

## 5. Setup & Befehle

### Development
```bash
# 1. Repository klonen
git clone <repo-url> /home/servicedock && cd /home/servicedock

# 2. SSL-Zertifikate generieren
cd db/ssl && openssl req -new -x509 -days 3650 -nodes -out server.crt -keyout server.key -subj "/CN=postgres" && chmod 600 server.key && cd ../..
./generate-ssl.sh   # Nginx SSL

# 3. Environment konfigurieren
cp .env.template .env   # Werte anpassen!

# 4. Stack starten
docker compose up --build -d

# 5. Frontend Rebuild (nach Änderungen)
docker compose up --build -d frontend
```

### Wichtige Scripts (Frontend)
| Script | Befehl | Zweck |
|---|---|---|
| `dev` | `vite` | Dev Server (:5173) |
| `build` | `vite build` | Production Build |
| `lint` | `eslint .` | Linting |
| `preview` | `vite preview` | Preview Production Build |

### Umgebungsvariablen (.env)
| Variable | Pflicht | Beschreibung |
|---|---|---|
| `ADMIN_PASSWORD` | ✅ | Admin-Login Passwort (min. 8 Zeichen) |
| `POSTGRES_USER` | ✅ | DB Username |
| `POSTGRES_PASSWORD` | ✅ | DB Passwort |
| `POSTGRES_DB` | ✅ | DB Name |
| `DATABASE_URL` | ✅ | Vollständige PostgreSQL Connection URL (?sslmode=require) |
| `ENCRYPTION_KEY` | ✅ | Fernet Key für Token-Verschlüsselung (⚠️ NIEMALS ändern!) |
| `JWT_SECRET_KEY` | ✅ | JWT Signing Key (kann rotiert werden) |
| `FRONTEND_URL` | ✅ (Prod) | CORS Origin URL |
| `ENVIRONMENT` | ❌ | `development` oder `production` (Default: production) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | ❌ | JWT Access Token Laufzeit (Default: 15) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | ❌ | JWT Refresh Token Laufzeit (Default: 7) |
| `MAX_FAILED_LOGIN_ATTEMPTS` | ❌ | Login-Versuche vor Sperre (Default: 5) |
| `LOGIN_LOCKOUT_MINUTES` | ❌ | Sperrdauer in Minuten (Default: 15) |
| `TRUST_FORWARDED_HEADERS` | ❌ | X-Forwarded-For vertrauen (Default: false) |
| `TRUSTED_PROXIES` | ❌ | Komma-separierte Proxy-IPs |

---

## 6. Proxmox Status-Dashboard (Datacenter-Übersicht)

### Überblick
Das Status-Dashboard (`ProxmoxStatusDashboard.jsx`, ~532 Zeilen) ist eine zweite Ansicht im Proxmox-Tab (erreichbar via "Status-Übersicht" Sub-Tab). Es zeigt aggregierte Cluster-Statistiken in einem **draggable & resizable Widget-Grid** (react-grid-layout).

### Architektur
```
ProxmoxGrid.jsx (Tab-Container)
  └── activeView === 'status'
        └── ProxmoxStatusDashboard.jsx
              ├── ResponsiveGridLayout (4-Spalten, rowHeight=75px)
              │   ├── StatCard.jsx (Base-Wrapper mit Drag-Handle)
              │   │   ├── NodeStatusCard
              │   │   ├── VMStatusCard (×2: VMs + LXCs)
              │   │   ├── TaskSummaryCard
              │   │   ├── TopUsageCard (×2: CPU + Memory)
              │   │   ├── TopDiskUsageCard
              │   │   ├── StorageTotalCard
              │   │   ├── StorageByNodeCard
              │   │   ├── StorageByTypeCard
              │   │   ├── CephHealthCard
              │   │   └── CephOSDCard
              └── API: GET /api/proxmox/cluster-stats
```

### Widget-Karten (12 Stück)
| Widget | Datei | Daten | Visualisierung |
|---|---|---|---|
| **Node Status** | `NodeStatusCard.jsx` | online/offline/total, Health-Label | Farbige Health-Badge, Check/X Icons |
| **VM Status** | `VMStatusCard.jsx` | running/stopped/total, Activity-Label | Activity-Badge, Play/Stop Icons |
| **LXC Status** | `VMStatusCard.jsx` | (gleiche Komponente, anderer Typ) | (gleich, mit HardDrives-Icon) |
| **Task Summary** | `TaskSummaryCard.jsx` | failed/running/success pro Node | Per-Node-Zeilen, 3-Spalten (X/↻/✓), Total-Zeile |
| **Top CPU** | `TopUsageCard.jsx` | Ranked Liste mit Name, %, Cores | Nummerierte Liste, Farbcodes (<60 grün, <80 orange, ≥80 rot) |
| **Top Memory** | `TopUsageCard.jsx` | Ranked Liste mit Name, %, GB | (gleich wie CPU) |
| **Top Disk** | `TopDiskUsageCard.jsx` | Ranked Liste mit Name, %, used/total | Nummerierte Liste, GB-Anzeige |
| **Storage Total** | `StorageTotalCard.jsx` | used/total/available, % | **SVG Donut-Chart** (Farbring), 3-Spalten-Grid |
| **Storage by Node** | `StorageByNodeCard.jsx` | Pro Node: used/total, Storage-Namen | Progress-Bars, blaue Storage-Tags |
| **Storage by Type** | `StorageByTypeCard.jsx` | Pro Typ: used/total, %, Anzahl | Emoji-Icons (💾/📀/🌐/🔷), Progress-Bars |
| **Ceph Health** | `CephHealthCard.jsx` | Status (OK/WARN/ERR), OSD-Übersicht | Großes Status-Icon, Farb-Badge, 2×2 OSD-Grid |
| **Ceph OSD** | `CephOSDCard.jsx` | total/up/in/down/out, healthyPercent | Große Zahl, 2×2 Farb-Grid, Legende |

### Layout-System
- **Default:** 4-Spalten, 5 Zeilen (Status → Top-Usage → Disk+Storage → Storage-Detail → Ceph)
- **Drag & Drop:** Via `draggableHandle=".drag-handle"` (DotsSixVertical-Icon in StatCard)
- **Resize:** Alle Karten haben `minW/maxW/minH/maxH` Constraints
- **Persistenz:** Layout wird pro Dashboard in `proxmox_dashboard_layouts` gespeichert (JSON, max 100KB)
- **API:** `GET/PUT/DELETE /api/dashboards/{id}/proxmox-layout`
- **Save-Flow:** Layout-Änderung → "Layout speichern" Button erscheint → Manuelles Speichern → Toast-Feedback
- **Reset:** "Layout zurücksetzen" löscht gespeichertes Layout, lädt Defaults

### Konfigurierbare Parameter (in Settings)
| Parameter | localStorage Key | Default | Effekt |
|---|---|---|---|
| Top-Items Anzahl | `proxmox_top_items` | 10 | Anzahl Einträge in Top-CPU/Memory/Disk Listen |
| Task-Zeitraum | `proxmox_task_hours` | 48h | Zeitfenster für Task-Summary |
| Refresh-Intervall | `proxmox_refresh_interval` | 30s | Auto-Refresh Interval |

### Backend-Endpunkt
`GET /api/proxmox/cluster-stats?dashboard_id=X&top_n=10&task_hours=48`

Zwei Code-Pfade:
- **Cluster-Modus:** `/cluster/resources`, `/cluster/tasks`, `/cluster/status` APIs
- **Standalone-Modus:** Iteriert einzelne Node-APIs (`/nodes/<node>/qemu`, `/lxc`, `/status`, `/tasks`)

Response-Model `ClusterStats`: `nodes`, `vms`, `lxcs`, `top_cpu_usage`, `top_memory_usage`, `top_disk_usage`, `tasks` (mit `by_node`), `storage_total`, `storage_by_node`, `storage_by_type`, `ceph`, `cluster_name`, `is_cluster`

### Styling
- **StatCard (Base):** `bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-xl shadow-lg border-slate-200 dark:border-slate-700`
- Alle Karten erben dieses Styling — **abweichend** vom VM/LXC-Cards-Stil (`dark:bg-gray-900/70`)
- Ceph-Karten zeigen Placeholder-UI wenn kein Ceph im Cluster vorhanden

---

## 7. Aktueller Status & Besonderheiten

### API-Endpunkte (Übersicht)
| Router | Prefix | Endpunkte | Auth |
|---|---|---|---|
| auth | `/api/` | login, refresh, logout | Nein (Login) |
| services | `/api/services` | CRUD + Reorder | Admin |
| shortcuts | `/api/shortcuts` | CRUD + Reorder | Admin |
| appearance | `/api/appearance` | Get/Update | Admin |
| proxmox | `/api/proxmox` | Config, Test, VMs, Start/Stop/Reboot | Admin |
| proxmox_stats | `/api/proxmox/cluster-stats` | Aggregierte Cluster-Stats | Admin |
| admin | `/api/admin` | Audit-Logs, Token-Rotation, Rate-Limits | Admin |
| spotify | `/api/spotify` | OAuth, Now-Playing, Install/Uninstall | Admin |
| dashboards | `/api/dashboards` | CRUD + Layouts | Admin |
| config | `/api/config` | Export/Import/Validate | Admin |

### Bekannte technische Schulden
1. **Kein ORM** — Raw SQL überall. Funktioniert, aber Schema-Migrationen sind manuell (`init.sql` anpassen, Container neu starten).
2. **Single-User-System** — Nur ein Admin-Account (Passwort aus ENV). Kein User-Management, keine Rollen außer "admin".
3. **In-Memory Rate-Limiting** — `failed_login_attempts` Dict geht bei Backend-Restart verloren. slowapi speichert ebenfalls in-memory.
4. **Kein TypeScript** — Keine Compile-Zeit-Typprüfung im Frontend. prop-types installiert aber nicht flächendeckend genutzt.
5. **Sync DB in Async Framework** — psycopg2 ist synchron, wird in `run_in_threadpool` gewrapped. Funktioniert, aber nicht ideal für hohe Concurrency.
6. **Backend-URL Detection** — Frontend erkennt Backend-URL automatisch via `window.location`. Funktioniert in Docker, aber fragil bei komplexen Proxy-Setups.
7. **Keine Tests** — Kein Test-Framework konfiguriert (weder Backend noch Frontend).
8. **Keine DB-Migrationen** — Schema-Änderungen erfordern manuelles SQL in `init.sql` + `docker compose down -v` oder manuelle ALTER TABLEs.

### Komplexe/Fragile Bereiche
- **`ProxmoxGrid.jsx`** (~540 Zeilen) — Größte Einzelkomponente. Vereint Tabs, Filter, Sortierung, Auto-Refresh, VM-Actions, Cluster/Standalone-Detection. Refactoring-Kandidat.
- **`ProxmoxStatusDashboard.jsx`** — react-grid-layout mit persistentem Layout. Viele Stats-Widgets, komplexer Datenfluss.
- **`routers/proxmox.py`** — Dual-Modus (Cluster vs Standalone) mit verschiedenen API-Pfaden. Fehlerbehandlung für SSL/Auth/Token-Format komplex.
- **`routers/spotify.py`** — OAuth2-Flow mit Thread-sicherem Token-Refresh + Double-Checked-Locking. CSRF-State-Token in Memory.
- **`authenticatedFetch()`** — Automatischer Token-Refresh mit Retry-Logic. Wenn Refresh fehlschlägt, wird Session cleared → User muss neu einloggen. Keine Queue für parallele 401s.
- **Verschlüsselungs-Key** — ENCRYPTION_KEY darf NIEMALS geändert werden, sonst sind Proxmox-Tokens und Spotify-Secrets nicht mehr lesbar. Re-Encryption-Script vorhanden (`re_encrypt_tokens.py`).

### Design-Entscheidungen
- **Cookie-basierte Auth** statt localStorage (httpOnly, Secure, SameSite=Strict) — besserer XSS-Schutz
- **Glasmorphismus-Design** — Durchgängig `backdrop-blur + semi-transparent backgrounds + text-shadow`
- **Farbige Akzent-Ränder** bei Proxmox Cards (grün/rot per inline style, da Tailwind Border-Utilities von Dark-Mode überschrieben werden)
- **Edit Mode Toggle** — Sidebar-Button statt permanent sichtbare Edit-Controls
- **Keine SPA-Routing-Library** — Tab-basierte Navigation via `activeTab` State (services, monitoring, security, settings)
