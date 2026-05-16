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
- **Appearance-System** — Preset-Wallpaper-Galerie (9 Bilder), Custom-Wallpaper-Upload, Farben, Grid-Spaltenanzahl, Widget-Toggles (Wetter/Uhr/Spotify)
- **Wetter & Uhr** — Open-Meteo API, konfigurierbares 12h/24h Format
- **Config Import/Export** — JSON-Backup/Restore mit Validierung
- **Edit Mode** — Toggle in Sidebar, kontrolliert Sichtbarkeit von Edit/Star/Drag auf Cards + AddItem-FAB
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

**Tests:** Vitest + Testing Library (Baseline-Setup, geringe Abdeckung).

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
| python-multipart | latest | Multipart Form Upload (Wallpapers) |
| ldap3 | ≥2.9.1 | LDAP/Active Directory Authentifizierung |

**Migrations:** Alembic (Baseline-Setup, Raw-SQL Projekt).
**Optional:** Redis (persistente Rate Limits + OAuth state + Login Lockout), psycopg3 Pool (`USE_PSYCOPG3=true` opt-in).

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
| `ldap_config` | Singleton (id=1) — LDAP/AD-Verbindungsdaten, Gruppen-DNs, Bind-PW (Fernet) |
| `proxmox_dashboard_layouts` | react-grid-layout JSON pro Dashboard |

### Infrastruktur
```
┌─────────────────────────────────────────────────┐
│  Docker Compose Stack                           │
│                                                 │
│  ┌──────────┐    ┌──────────┐   ┌────────────┐  │
│  │  nginx   │──▶│frontend  │   │  backend   │  │
│  │ :80/:443 │──▶│ (SPA)    │   │ (FastAPI)  │  │
│  │ reverse  │    │ :80      │   │ :8000      │  │
│  │ proxy    │──▶│          │   │            │  │
│  │ + SSL    │    └──────────┘   └──────┬─────┘  │
│  └──────────┘                          │        │
│                                 ┌──────▼─────┐  │
│                                 │ PostgreSQL │  │
│                                 │ :5432 SSL  │  │
│                                 └────────────┘  │
│                                                 │
│  Externe APIs: Open-Meteo, Spotify, Proxmox VE  │
└─────────────────────────────────────────────────┘
```

- **Hosting:** Self-Hosted (Docker Compose)
- **SSL:** Self-signed Certs (nginx + PostgreSQL)
- **CI/CD:** Kein automatisiertes CI — manuelles `docker compose up --build`
- **Container Registry:** Docker Hub (siehe DOCKERHUB_SETUP.md; GHCR_SETUP.md ist Legacy)

---

## 3. Architektur & Dateistruktur

### Projektstruktur (Zusammenfassung)
- **/backend:** Modulare FastAPI-Anwendung mit Routern für jeden Feature-Bereich, Pydantic-Modellen und Raw-SQL-Datenbankzugriff.
- **/frontend:** Vite-basiertes React-Projekt mit Custom Hooks für das State-Management und Komponenten für die UI.
- **/db:** Enthält das `init.sql`-Skript zur Initialisierung des Datenbankschemas.
- **/nginx:** Konfiguration für den Nginx-Reverse-Proxy.
- **Dokumentation:** Diverse Markdown-Dateien (`*.md`) im Root-Verzeichnis.

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
- **i18n-Konvention:** Alle sichtbaren Strings in `src/i18n/locales/{de,en}.json`. Neue Strings immer in beide Dateien + `t('namespace.key')` in der Komponente. **Keine Emojis in i18n-Keys** — Icons werden ausschließlich über phosphor-react in JSX gerendert (verhindert Doppel-Icons)
- **i18n-Imports:** In `i18n/index.js` als `deLocale`/`enLocale` importiert (nicht `de`/`en`) — vermeidet TDZ-Fehler durch Vite ESM-Minifier
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
- **Animationen (index.css):**
  - `fadeUpIn` — Staggered Card-Entrance (fade + translateY)
  - `slideInLeft` — Stats-Cards fliegen von links ein (translateX(-60px) → 0, 150ms Stagger)
  - `segmentGlow` — Active Segment Pulse
  - `.glass-btn` — Hover-Mikroanimation (translateY(-1px) + Shadow)
  - `useAnimatedCounter` Hook — Zählt Werte hoch (2.2s, ease-out quart, gestaffelte Delays)

---

## 5. AD/LDAP-Authentifizierung

### Architektur
- **Optionales AddOn** — Konfigurierbar über Settings → AddOns → LDAP/AD
- **Dual-Auth:** AD-Login (wenn Username angegeben + AD enabled) mit Fallback auf lokalen Login (nur Passwort)
- **Rollen:** `admin` (lokal + AD) und `viewer` (nur AD), gesteuert über AD-Gruppen (memberOf)
- **Vollständige Doku:** Siehe `LDAP_INTEGRATION.md`

### Kernmodule
| Datei | Funktion |
|-------|----------|
| `backend/core/ldap_auth.py` | Config-Cache (60s TTL), `ldap_authenticate()` (4-Schritt-Flow), `_determine_role()`, `test_ldap_connection()` |
| `backend/routers/auth.py` | `POST /api/login` (AD+Local), `GET /api/auth/mode` (public) |
| `backend/routers/admin.py` | LDAP Config CRUD unter `/api/ldap/*` |
| `backend/dependencies/auth.py` | `require_any_role("admin", "viewer")` — erlaubt Viewer auf GET-Endpunkte |
| `frontend/src/hooks/useAuth.js` | `adEnabled`, `adDomain`, `userRole`, `isAdmin`, `isViewer`, `displayName`, `authMethod` |
| `frontend/src/components/settings/LdapAddon.jsx` | Glasmorphismus-Konfigformular (Test/Save/Uninstall/Toggle) |

### JWT-Payload (erweitert)
```json
{
  "sub": "username",
  "type": "admin|viewer",
  "auth_method": "ad|local",
  "display_name": "John Doe"
}
```

### Wichtige Patterns
- **DB-Pool Zugriff:** `import config.database as database_module` → `database_module.db_pool` zur Laufzeit (nicht Import-Zeit, da Pool dann noch `None`)
- **UPN-Domain-Strip:** Wenn User `jdoe@domain.local` eingibt, wird `@domain.local` vor der sAMAccountName-Suche entfernt
- **Relative Search Base:** `CN=Users` wird automatisch zu `CN=Users,DC=domain,DC=local` kombiniert
- **Bind-Passwort:** Fernet-verschlüsselt in `ldap_config.bind_password`, entschlüsselt via `decrypt_value()` vor LDAP-Bind
- **Cache-Invalidierung:** `invalidate_ldap_cache()` wird nach Config-Änderungen (Save/Delete/Toggle) aufgerufen
- **Öffentliche Endpunkte:** `/api/auth/mode` (AD-Status für Login-Modal) und `/api/appearance/wallpaper` (Hintergrundbild für Login-Seite)
- **Viewer-Guards Frontend:** `isAdmin` Prop → Edit Mode, FAB, Sidebar-Tabs (Proxmox, Security, Settings) werden für Viewer ausgeblendet
- **Tab-Reset:** Bei jedem Login wird `activeTab="services"` und `editMode=false` gesetzt (verhindert Tab-Flash beim User-Wechsel)

---

## 6. Proxmox Status-Dashboard (Kurzübersicht)

Das Status-Dashboard (`ProxmoxStatusDashboard.jsx`) zeigt aggregierte Cluster-Statistiken in einem **draggable & resizable Widget-Grid** (react-grid-layout) — erreichbar über den "Status-Übersicht" Sub-Tab in Proxmox.

- **Glass Segment Control** (`ProxmoxGrid.jsx`) — Glasmorphe Tab-Leiste mit dynamisch gemessener Sliding-Pill (ref callback + `data-view` Attribute + `getBoundingClientRect()`). Cluster-Badge mit Live-Green-Dot.
- **12 Widget-Cards:** Node-Status, VM/LXC-Status, Task-Summary, Top CPU/Memory/Disk, Storage (Total/byNode/byType), Ceph Health/OSD
- **Layout:** 4-Spalten Grid, Drag & Drop + Resize, pro Dashboard persistiert in `proxmox_dashboard_layouts`
- **Card Visibility:** Gear-Dropdown (z-50, Toolbar hat `relative z-50`) zum Ein-/Ausblenden einzelner Cards. Ceph-Cards werden bei Nicht-Ceph-Setups automatisch ausgeblendet. Persistiert in DB (`proxmox_dashboard_layouts.visible_cards` JSONB) + localStorage-Cache
- **Dynamische Höhen:** Storage/Task-Cards passen sich automatisch an Cluster-Größe an (`getDynamicCardHeight()`)
- **Tab-Persistenz:** Beide Views (VM/LXC + Status) bleiben permanent gemounted via `display:none/block` — kein Neuladen beim Tab-Wechsel
- **Unified Glass Toolbars** — Alle Buttons in Glass-Bar-Containern (`bg-white/30 backdrop-blur-md border rounded-xl`) mit `.glass-btn` Hover-Effekt und vertikalen Dividers
- **Stats-Cards Animationen** (`ProxmoxStatsCards.jsx`) — `useAnimatedCounter` Hook (2.2s ease-out quart, gestaffelte Delays 100-700ms), `StatCard` als `React.memo` exterrn definiert (verhindert Remount-Flicker), Slide-in von links (`.animate-slide-in-left`, 150ms Stagger)
- **Refresh:** Manueller Refresh-Button mit Spin-Animation, Auto-Refresh (konfigurierbar, Default 30s)
- **Save-Detection:** "Save Layout"-Button erscheint nur bei echten Drag/Resize-Änderungen (Baseline-Vergleich via `savedLayoutRef`)
- **Settings:** `localStorage` Keys: `proxmox_top_items` (Default: 10), `proxmox_task_hours` (48h), `proxmox_refresh_interval` (30s)
- **API:** `GET /api/proxmox/cluster-stats?dashboard_id=X&top_n=10&task_hours=48` — Cluster-Modus oder Standalone-Modus
- **Layout-API:** `GET/PUT/DELETE /api/dashboards/{id}/proxmox-layout`
- **Visibility-API:** `GET/PUT /api/dashboards/{id}/proxmox-visible-cards`
- **Komponente:** `CardVisibilityPanel.jsx` (stats/) — Dropdown mit kategorisierten Checkboxen (Status/Usage/Storage/Ceph), Show All/Hide All

---

## 7. Aktueller Status & Besonderheiten

### API-Endpunkte (Übersicht)
| Router | Prefix | Endpunkte | Auth |
|---|---|---|---|
| auth | `/api/` | login, refresh, logout, auth/mode | Nein (Login, auth/mode) |
| services | `/api/services` | CRUD + Reorder | GET: Admin+Viewer, Write: Admin |
| shortcuts | `/api/shortcuts` | CRUD + Reorder | GET: Admin+Viewer, Write: Admin |
| appearance | `/api/appearance` | Get/Update + /wallpaper (public) | Admin (GET: Admin+Viewer) |
| proxmox | `/api/proxmox` | Config, Test, VMs, Start/Stop/Reboot | Admin |
| proxmox_stats | `/api/proxmox/cluster-stats` | Aggregierte Cluster-Stats | Admin |
| admin | `/api/admin` | Audit-Logs, Token-Rotation, Rate-Limits | Admin |
| spotify | `/api/spotify` | OAuth, Now-Playing, Install/Uninstall | Admin |
| dashboards | `/api/dashboards` | CRUD + Layouts | GET: Admin+Viewer, Write: Admin |
| config | `/api/config` | Export/Import/Validate | Admin |
| wallpapers | `/api/wallpapers` | Upload, List, Serve, Delete | Serve: Public, List: Admin+Viewer, Upload/Delete: Admin |
| admin (ldap) | `/api/ldap` | Config CRUD, Test, Toggle | Admin |

### Bekannte technische Schulden
1. **Kein ORM** — Raw SQL überall. Funktioniert, aber Schema-Änderungen brauchen diszipliniertes Migrations-Handling (siehe unten).
2. **Single-/Few-User Modell** — Lokale User + optionale AD-User, Rollen `admin`/`viewer`. Kein „echtes“ User-Management (bewusstes Produkt-Design).
3. **Tests sind nur ein Baseline-Setup** — pytest/vitest sind vorhanden, aber Testabdeckung ist noch gering und es gibt kein CI, das sie automatisch erzwingt.
4. **Migrationen sind eingeführt, aber noch nicht “voll” genutzt** — Alembic Baseline existiert; neue Schema-Änderungen müssen ab jetzt als Migrations kommen (statt nur `init.sql`).
5. **DB-Stack: sync-first** — Default bleibt psycopg2 Pool; es gibt einen opt-in Pfad für psycopg3 (`USE_PSYCOPG3=true`), aber kein kompletter async DB Rewrite.
6. **Redis ist optional, aber empfohlen** — Wenn Redis nicht läuft, fällt einiges auf in-memory fallback zurück (z.B. OAuth state / Login-Lockout / slowapi storage).
7. **Type Safety im Frontend** — Kein TypeScript; `prop-types` nicht flächendeckend. (Optional: später inkrementell TS oder konsequent JSDoc/prop-types.)
8. **Backend URL Konfiguration** — Standardisiert via `VITE_BACKEND_URL` (Vite) + same-origin fallback; ältere `REACT_APP_BACKEND_URL` Logik ist obsolet.

### Komplexe/Fragile Bereiche
- **`ProxmoxGrid.jsx`** (~591 Zeilen) — Glass Segment Control mit Sliding Pill, Filter, Sortierung, Auto-Refresh, VM-Actions, Cluster/Standalone-Detection, display:none/block Tab-Persistenz.
- **`ProxmoxStatusDashboard.jsx`** — react-grid-layout mit persistentem Layout. Viele Stats-Widgets, komplexer Datenfluss.
- **`routers/proxmox.py`** — Dual-Modus (Cluster vs Standalone) mit verschiedenen API-Pfaden. Fehlerbehandlung für SSL/Auth/Token-Format komplex.
- **`routers/spotify.py`** — OAuth2-Flow mit Thread-sicherem Token-Refresh + Double-Checked-Locking. CSRF-State-Token in Memory.
- **`authenticatedFetch()`** — Automatischer Token-Refresh mit Retry-Logic. Wenn Refresh fehlschlägt, wird Session cleared → User muss neu einloggen. Keine Queue für parallele 401s.
- **Verschlüsselungs-Key** — ENCRYPTION_KEY darf NIEMALS geändert werden, sonst sind Proxmox-Tokens und Spotify-Secrets nicht mehr lesbar. Re-Encryption-Script vorhanden (`re_encrypt_tokens.py`).

### Neu hinzugekommen / verbessert (Stand 2026-05)
- **Tests**: pytest (Backend) und vitest (Frontend) sind gebootstrapped. Das ist noch keine vollständige Abdeckung, aber ein Sicherheitsnetz für weitere Refactors.
- **Migrations**: Alembic ist eingeführt (Baseline). `db/init.sql` ist weiterhin für frische Volumes, Schema-Änderungen gehen ab jetzt über Migrations.
- **Rate Limiting & Lockout**: kann via Redis persistent sein (`REDIS_URL`), statt bei Backend-Restart zu verlieren.
- **Spotify OAuth state**: nicht mehr nur in-memory, sondern Redis+TTL (Fallback in-memory für dev).
- **Token Refresh**: `authenticatedFetch` hat jetzt Single-Flight Refresh (keine parallelen Refresh-Stürme).
- **Backend URL**: zentral über `frontend/src/utils/backendUrl.js` (`VITE_BACKEND_URL` oder same-origin).

### Design-Entscheidungen
- **Cookie-basierte Auth** statt localStorage (httpOnly, Secure, SameSite=Strict) — besserer XSS-Schutz
- **Glasmorphismus-Design** — Durchgängig `backdrop-blur + semi-transparent backgrounds + text-shadow`
- **Farbige Akzent-Ränder** bei Proxmox Cards (grün/rot per inline style, da Tailwind Border-Utilities von Dark-Mode überschrieben werden)
- **Edit Mode Toggle** — Sidebar-Button statt permanent sichtbare Edit-Controls. FAB (AddItemFAB) wird nur im Edit Mode gerendert (kein Scroll-basiertes Einblenden mehr)
- **Keine SPA-Routing-Library** — Tab-basierte Navigation via `activeTab` State (services, monitoring, security, settings)
- **i18n via react-i18next** — Browser-Sprache wird automatisch erkannt (`i18next-browser-languagedetector`), Fallback auf Deutsch. Sprachwahl in Settings > Language Tab, persistiert in `localStorage` (`servicedock_language`)
- **Settings Tab-Navigation** — `SettingsPage.jsx` rendert nur die aktive Section via Conditional Rendering (`{activeSection === 'xxx' && ...}`), keine Scroll-Spy. Sidebar-Buttons setzen `activeSection` direkt. Sections: appearance, dashboards, proxmox, addons, language
- **Settings Glasmorphism-Redesign** — `AppearanceTab.jsx` mit 5 Glasmorphismus-Sektionskarten. Wiederverwendbare `SectionHeader` (phosphor-Icon + Titel) und `ToggleSwitch` Helper-Komponenten. Einheitliche Konstanten: `sectionCard`, `inputClass`, `labelClass` für konsistentes Styling
- **Settings Icon-Konvention** — Icons nur in JSX via phosphor-react (z.B. `Image`, `Palette`, `SquaresFour`, `Eye`, `CloudSun`), nie als Emoji in i18n-Strings
- **Wallpaper-System** — 9 gebundelte Preset-Wallpapers in `frontend/public/wallpapers/` (Unsplash, 1920×1080, ~3.4MB gesamt). Custom-Upload via `POST /api/wallpapers/upload` (max 10MB, JPG/PNG/WEBP). Uploaded Files auf Docker Volume (`wallpaper_uploads:/app/uploads`). Serve-Endpoint public (kein Auth, für Login-Screen). Dateinamen: `custom-{md5hash12}{ext}` (Duplikat-Vermeidung). `_ensure_upload_dir()` lazy statt module-level (wegen `read_only: true` Container). Backend Dockerfile erstellt `/app/uploads/wallpapers` vor `chown` für korrekte Volume-Init.
- **authenticatedFetch FormData-Handling** — Wenn `body instanceof FormData`, wird `Content-Type` Header gelöscht, damit der Browser automatisch `multipart/form-data; boundary=...` setzt
