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
- **Internationalisierung (i18n)** — Deutsch/Englisch mit react-i18next, Browser-Erkennung, Sprachwahl in Settings

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
| i18next + react-i18next | 24.x / 15.x | Internationalisierung (DE/EN) |
| i18next-browser-languagedetector | 8.x | Automatische Spracherkennung |

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
│       │   │   ├── ConfigAddon.jsx
│       │   │   └── LanguageCard.jsx
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
│       ├── i18n/
│       │   ├── index.js             # i18n Config (LanguageDetector, fallback: de)
│       │   └── locales/
│       │       ├── de.json           # Deutsche Übersetzungen (~420 Keys)
│       │       └── en.json           # Englische Übersetzungen (~420 Keys)
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
- **Auth:** httpOnly Cookie (JWT) → `verify_token()` / `require_role("admin")`
- **DB:** psycopg2 ThreadedConnectionPool → PostgreSQL :5432 (SSL)
- **Extern:** Proxmox VE API (proxmoxer), Spotify Web API (requests), Open-Meteo (fetch)
- **Rate Limiting:** slowapi (request-level) + Custom IP-Tracker (login-level)
- **Audit:** Sicherheitsrelevante Aktionen → `audit_log` Tabelle (sensible Daten redacted)

---

## 4. Wichtige Konventionen & Regeln

### Coding Guidelines
- **Sprache:** Code auf Englisch, Kommentare auf Deutsch. UI-Texte über i18n-Keys (`t('namespace.key')`) — nie hardcoded
- **Backend-Dateibenennung:** snake_case (`proxmox_stats.py`, `rate_limiting.py`)
- **Frontend-Dateibenennung:** PascalCase für Komponenten (`ServiceCard.jsx`), camelCase für Hooks (`useAuth.js`) und Utils (`auth.js`)
- **Komponenten-Struktur:** Functional Components mit Hooks, keine Klassen (außer ErrorBoundary)
- **API-Aufrufe im Frontend:** Immer via `authenticatedFetch()` aus `utils/auth.js` (Cookie-basiert, Auto-Refresh)
- **DB-Aufrufe im Backend:** Sync psycopg2 in `run_in_threadpool()` für async Kompatibilität
- **Fehlerbehandlung:** Backend gibt HTTP-Statuscodes zurück (401, 403, 404, 500), Frontend zeigt lokalisierte Fehlermeldungen via `t()`
- **i18n-Konvention:** Alle sichtbaren Strings in `src/i18n/locales/{de,en}.json`. Neue Strings immer in beide Dateien + `t('namespace.key')` in der Komponente
- **Verschlüsselung:** Alle sensiblen Daten (Proxmox Token, Spotify Secrets) werden mit Fernet verschlüsselt in DB gespeichert
- **Audit:** Sicherheitsrelevante Aktionen werden in `audit_log` geschrieben, sensible Daten automatisch redacted

### Type Safety
- **Kein TypeScript** — Reines JavaScript (JSX) im Frontend
- **Pydantic Models** im Backend für Request/Response-Validierung (`models/` Ordner)
- **prop-types** Package installiert, aber nicht durchgehend verwendet

### Styling
- **Tailwind CSS** als primäres Styling-System (Utility Classes)
- **Design-Sprache:** Glasmorphismus — `bg-white/70 dark:bg-gray-900/70 backdrop-blur-md rounded-2xl border shadow-xl` + `textShadow`
- **Dark/Light Mode:** Via `document.documentElement.classList` + Body-Background-Gradients in `useAppearance.js`
- **Icons:** phosphor-react (Duotone weight), teilweise Emoji für Service-Icons
- **Proxmox VM Cards:** `border-left: 3px solid` mit Status-Farbe (grün/rot) via inline style

---

## 5. Proxmox Status-Dashboard (Kurzübersicht)

Das Status-Dashboard (`ProxmoxStatusDashboard.jsx`) zeigt aggregierte Cluster-Statistiken in einem **draggable & resizable Widget-Grid** (react-grid-layout) — erreichbar über den "Status-Übersicht" Sub-Tab in Proxmox.

- **12 Widget-Cards:** Node-Status, VM/LXC-Status, Task-Summary, Top CPU/Memory/Disk, Storage (Total/byNode/byType), Ceph Health/OSD
- **Layout:** 4-Spalten Grid, Drag & Drop + Resize, pro Dashboard persistiert in `proxmox_dashboard_layouts`
- **Card Visibility:** Gear-Dropdown im Header zum Ein-/Ausblenden einzelner Cards. Ceph-Cards werden bei Nicht-Ceph-Setups automatisch ausgeblendet. Persistiert in DB (`proxmox_dashboard_layouts.visible_cards` JSONB) + localStorage-Cache
- **Dynamische Höhen:** Storage/Task-Cards passen sich automatisch an Cluster-Größe an (`getDynamicCardHeight()`)
- **Tab-Persistenz:** Status-Dashboard bleibt gemounted beim Tab-Wechsel (VM/LXC ↔ Status) — kein Neuladen beim Zurückwechseln
- **Refresh:** Manueller Refresh-Button mit Spin-Animation, Auto-Refresh (konfigurierbar, Default 30s)
- **Save-Detection:** "Save Layout"-Button erscheint nur bei echten Drag/Resize-Änderungen (Baseline-Vergleich via `savedLayoutRef`)
- **Settings:** `localStorage` Keys: `proxmox_top_items` (Default: 10), `proxmox_task_hours` (48h), `proxmox_refresh_interval` (30s)
- **API:** `GET /api/proxmox/cluster-stats?dashboard_id=X&top_n=10&task_hours=48` — Cluster-Modus oder Standalone-Modus
- **Layout-API:** `GET/PUT/DELETE /api/dashboards/{id}/proxmox-layout`
- **Visibility-API:** `GET/PUT /api/dashboards/{id}/proxmox-visible-cards`
- **Komponente:** `CardVisibilityPanel.jsx` (stats/) — Dropdown mit kategorisierten Checkboxen (Status/Usage/Storage/Ceph), Show All/Hide All

---

## 6. Aktueller Status & Besonderheiten

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
- **i18n via react-i18next** — Browser-Sprache wird automatisch erkannt (`i18next-browser-languagedetector`), Fallback auf Deutsch. Sprachwahl in Settings > Language Tab, persistiert in `localStorage` (`servicedock_language`)
