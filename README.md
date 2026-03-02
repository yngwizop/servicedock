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

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Git

### 1. Clone & Configure

```bash
git clone https://github.com/yngwizop/servicedock.git
cd servicedock
```

### 2. Generate SSL Certificates

**PostgreSQL SSL:**
```bash
mkdir -p db/ssl
openssl req -new -x509 -days 365 -nodes -text \
  -out db/ssl/server.crt -keyout db/ssl/server.key -subj "/CN=postgres"
chmod 600 db/ssl/server.key
sudo chown 999:999 db/ssl/server.key db/ssl/server.crt
```

**Nginx SSL:**
```bash
./generate-ssl.sh
```
> Or manually: see [HTTPS_SETUP.md](HTTPS_SETUP.md)

### 3. Generate Security Keys

```bash
# Encryption key (Fernet) — never change after first start!
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# JWT secret key
openssl rand -hex 32
```

### 4. Create `.env`

Copy the template and fill in your values:

```bash
cp .env.template .env
nano .env
```

> See [.env.template](.env.template) for all available options with descriptions.

### 5. Start

```bash
docker compose up -d --build
```

### 6. Open

```
https://your-ip
```

> For detailed setup instructions, see [INITIAL_SETUP.md](INITIAL_SETUP.md).

---

## 📚 Documentation

| Guide | Description |
|-------|-------------|
| [INITIAL_SETUP.md](INITIAL_SETUP.md) | Full setup walkthrough |
| [HTTPS_SETUP.md](HTTPS_SETUP.md) | Nginx reverse proxy & SSL certificates |
| [PROXMOX_SETUP.md](PROXMOX_SETUP.md) | Proxmox API token setup |
| [SPOTIFY_ADDON.md](SPOTIFY_ADDON.md) | Spotify widget configuration |
| [ENCRYPTION.md](ENCRYPTION.md) | Token encryption details |
| [API_DOCUMENTATION.md](API_DOCUMENTATION.md) | Full API reference |
| [RATE_LIMITS.md](RATE_LIMITS.md) | Rate limits for all endpoints |
| [TOKEN_ROTATION_GUIDE.md](TOKEN_ROTATION_GUIDE.md) | Proxmox token rotation |
| [RE_ENCRYPTION_GUIDE.md](RE_ENCRYPTION_GUIDE.md) | Encryption key rotation |

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
