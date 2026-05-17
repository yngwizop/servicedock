# 🌐 ServiceDock

**A modern, self-hosted dashboard for managing your web services, shortcuts, Proxmox VMs, and more.**

Built for homelab enthusiasts and self-hosters — a sleek personal start page with glassmorphism design, real-time VM management, and Spotify integration.

![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)
![Security](https://img.shields.io/badge/Security-Hardened-success)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## ✨ Features

### 🎨 Customizable Design
- Light & Dark mode with automatic detection
- Custom background colors, images, and opacity
- Glassmorphism UI with backdrop-blur effects
- Flexible grid layouts (2–12 columns)
- Per-mode text color settings

### 📱 Services & Shortcuts
- Service cards with name, description, URL, and icon
- Compact shortcut links for quick access
- Drag & drop reordering
- Emoji and URL-based icon support ([selfh.st/icons](https://selfh.st/icons/))

### 📊 Multi-Dashboard
- Create and switch between multiple dashboards
- Each dashboard has its own services, shortcuts, and layout
- Full config export & import (JSON) with merge or replace modes

### 🖥️ Proxmox Monitoring
- Live VM and LXC container overview with status indicators
- Remote control: start, stop, reboot directly from the dashboard
- Sorting, filtering by type and status
- Encrypted API token storage (Fernet AES-128)
- Token rotation tracking with 60-day reminders

### 🎵 Spotify Integration
- Now Playing widget with real-time song info and album cover
- Progress bar and auto-refresh
- OAuth 2.0 with encrypted token storage
- Easy setup via the Settings panel

### 🛡️ Security
- Password-protected admin login with JWT (httpOnly cookies)
- Rate limiting on all endpoints (SlowAPI + IP lockout)
- Audit logging with 6 filter types and auto-cleanup
- Security Dashboard with threat tracking and live rate limit monitoring
- Fernet encryption for all stored API tokens
- HTTPS via nginx reverse proxy with CSP, HSTS, and security headers
- RBAC — all API endpoints require authentication

### ⚙️ Settings Panel
- Tabbed interface: Appearance, Services & Shortcuts, Proxmox, Spotify, Security
- Live preview for design changes
- Proxmox connection management with multi-node support
- Config export/import with password confirmation for destructive operations

---

## 🚀 Installation

ServiceDock ships as **pre-built Docker images** on [Docker Hub](https://hub.docker.com/u/servicedockapp) (`servicedockapp/servicedock-*`).  
You do **not** need to clone the repo or edit `.env` by hand — one setup script does everything.

### Prerequisites

- **Docker** and **Docker Compose** ([install guide](https://docs.docker.com/get-docker/))
- **Python 3** with the `cryptography` package (`pip3 install cryptography` or `apt install python3-cryptography`)
- **OpenSSL**
- Ports **80** and **443** available on the host

### One-command install

Run on any Linux host (creates a `servicedock/` folder in your current directory):

```bash
curl -fsSL https://raw.githubusercontent.com/yngwizop/servicedock/main/setup-servicedock.sh -o setup-servicedock.sh
chmod +x setup-servicedock.sh
./setup-servicedock.sh
```

The script automatically:

- Downloads `docker-compose.yml` and `db/init.sql`
- Generates **PostgreSQL** TLS certs (`db/ssl/`) and **Nginx** HTTPS certs (`nginx/ssl/`)
- Creates a complete `.env` (secrets, database password, `FRONTEND_URL`, Docker Hub image prefix)
- Pulls images from Docker Hub and runs `docker compose up -d`

When it finishes, open the URL shown in the terminal (your machine’s IP over HTTPS).

| | |
|--|--|
| **Dashboard login** | `admin` / `changeme` — you will be prompted to change the password in the UI |
| **Browser** | Accept the self-signed certificate warning (normal for local HTTPS) |
| **Secrets** | Stored in `servicedock/.env` (mode `600`) — no manual editing required |

### Optional environment variables

```bash
# Use a hostname instead of auto-detected IP
SERVICEDOCK_URL=https://dashboard.homelab.local ./setup-servicedock.sh

# Overwrite existing ./servicedock without confirmation
SERVICEDOCK_FORCE=1 ./setup-servicedock.sh

# Different Docker Hub namespace (default: servicedockapp)
DOCKERHUB_USER=servicedockapp ./setup-servicedock.sh
```

### After install

```bash
cd servicedock
docker compose ps          # check containers
docker compose logs -f     # follow logs
docker compose down        # stop
```

**Spotify:** add this redirect URI in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard):  
`https://<your-host>/api/spotify/callback` (same host as `FRONTEND_URL` in `.env`).

More detail: [docs/QUICKSTART.md](docs/QUICKSTART.md) · HTTPS: [docs/HTTPS_SETUP.md](docs/HTTPS_SETUP.md)

---

## 📚 Documentation

| Guide | Description |
|-------|-------------|
| [docs/](docs/) | All guides (install, addons, API, security) |
| [QUICKSTART.md](docs/QUICKSTART.md) | Install (`setup-servicedock.sh`, images: `servicedockapp` on Docker Hub) |
| [HTTPS_SETUP.md](docs/HTTPS_SETUP.md) | Nginx reverse proxy & SSL certificates |
| [PROXMOX_SETUP.md](docs/PROXMOX_SETUP.md) | Proxmox API token setup |
| [SPOTIFY_ADDON.md](docs/SPOTIFY_ADDON.md) | Spotify widget configuration |
| [ENCRYPTION.md](docs/ENCRYPTION.md) | Token encryption details |
| [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | Full API reference |
| [RATE_LIMITS.md](docs/RATE_LIMITS.md) | Rate limits for all endpoints |
| [TOKEN_ROTATION_GUIDE.md](docs/TOKEN_ROTATION_GUIDE.md) | Proxmox token rotation |
| [RE_ENCRYPTION_GUIDE.md](docs/RE_ENCRYPTION_GUIDE.md) | Encryption key rotation |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, Tailwind CSS |
| Backend | FastAPI (Python), modular router architecture |
| Database | PostgreSQL 16 with connection pooling |
| Auth | JWT (httpOnly cookies), bcrypt, Fernet AES-128 |
| Deployment | Docker Compose with health checks |
| Proxy | Nginx with HTTPS, CSP, HSTS |
| Icons | Phosphor Icons + custom URL/emoji support |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

## 📷 Photo Credits

Bundled preset wallpapers are sourced from [Unsplash](https://unsplash.com) (free license):

| Wallpaper | Photographer |
|-----------|-------------|
| Mountains | [Samuel Ferrara](https://unsplash.com/@samferrara) |
| Ocean | [Sean Oulashin](https://unsplash.com/@oulashin) |
| Forest | [Casey Horner](https://unsplash.com/@mischievous_penguins) |
| Northern Lights | [Jonatan Pie](https://unsplash.com/@r3dmax) |
| Starry Sky | [Benjamin Voros](https://unsplash.com/@vorosbenisop) |
| Dark Peaks | [Nathan Anderson](https://unsplash.com/@nathananderson) |
| Green Hills | [Qingbao Meng](https://unsplash.com/@ideasboom) |
| Summit | [Daniel Leone](https://unsplash.com/@danielleone) |
| Desert | [Keith Hardy](https://unsplash.com/@keithhardy2001) |

---

**Made with ❤️ for the self-hosting community**
