# 🚀 Servicedock — Quick Start Guide

## Prerequisites

- Docker and Docker Compose installed
- Python 3 with `cryptography` (`pip3 install cryptography` or `apt install python3-cryptography`)
- OpenSSL

## Installation (about 5 minutes)

### Recommended: setup script

```bash
curl -fsSL https://raw.githubusercontent.com/yngwizop/servicedock/main/setup-servicedock.sh -o setup-servicedock.sh
chmod +x setup-servicedock.sh
./setup-servicedock.sh
```

The script creates `servicedock/`, generates TLS certs, writes `.env`, pulls Docker Hub images, and starts the stack.

**Login after install:** `admin` / `changeme` (change password when prompted in the UI).

**Optional:**

```bash
SERVICEDOCK_URL=https://dashboard.example.com ./setup-servicedock.sh
SERVICEDOCK_FORCE=1 ./setup-servicedock.sh
DOCKERHUB_USER=servicedockapp ./setup-servicedock.sh
```

---

### Manual installation

Use this only if you cannot run the setup script. Paths match `docker-compose.yml` on `main`.

#### 1. Create working directory

```bash
mkdir servicedock && cd servicedock
mkdir -p db/ssl nginx/ssl
```

#### 2. Download files

```bash
curl -fsSL -o docker-compose.yml https://raw.githubusercontent.com/yngwizop/servicedock/main/docker-compose.yml
curl -fsSL -o .env.template https://raw.githubusercontent.com/yngwizop/servicedock/main/.env.template
curl -fsSL -o db/init.sql https://raw.githubusercontent.com/yngwizop/servicedock/main/db/init.sql
cp .env.template .env
```

#### 3. Generate SSL certificates

**PostgreSQL** (`db/ssl/` — UID 999 in the container):

```bash
openssl req -new -x509 -days 365 -nodes \
  -out db/ssl/server.crt \
  -keyout db/ssl/server.key \
  -subj "/CN=postgres"
chmod 600 db/ssl/server.key
chmod 644 db/ssl/server.crt
sudo chown 999:999 db/ssl/server.key db/ssl/server.crt 2>/dev/null || true
```

**Nginx** (`nginx/ssl/cert.pem` + `key.pem`):

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/CN=localhost"
chmod 600 nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem
```

#### 4. Generate security keys

```bash
# ENCRYPTION_KEY
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# JWT_SECRET_KEY
openssl rand -hex 32
```

#### 5. Edit `.env`

Set at least:

- `DOCKERHUB_USER=servicedockapp` (required for image names in compose)
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` (e.g. `servicedock` / strong password / `servicedock`)
- `ENCRYPTION_KEY` and `JWT_SECRET_KEY` from step 4
- `FRONTEND_URL` (e.g. `https://10.10.10.50` — same host you open in the browser)
- `ENVIRONMENT=production`
- `REDIS_URL=redis://redis:6379/0`

Do **not** set `DATABASE_URL` manually — compose builds it from `POSTGRES_*`.

Admin password is **not** in `.env`; default DB user is `admin` / `changeme` until changed in the UI.

#### 6. Start

```bash
docker compose pull
docker compose up -d
```

#### 7. Access

- Browser: your `FRONTEND_URL` (or `https://<server-ip>`)
- Login: `admin` / `changeme`
- Accept the self-signed certificate warning if you used the OpenSSL commands above

---

## 📦 Directory layout

```
servicedock/
├── docker-compose.yml
├── .env
├── db/
│   ├── init.sql              # schema (mounted into Postgres)
│   └── ssl/
│       ├── server.crt
│       └── server.key
└── nginx/
    └── ssl/
        ├── cert.pem
        └── key.pem
```

## 🔄 Updates

```bash
cd servicedock
docker compose pull
docker compose up -d
```

## 🛑 Stop / start

```bash
# Stop
docker compose down

# Start
docker compose up -d

# Logs
docker compose logs -f
```

## 🗑️ Full removal (including data!)

```bash
docker compose down -v
cd .. && rm -rf servicedock/
```

## 📚 Full documentation

See the [README](../README.md) and [docs/](.) folder on GitHub: https://github.com/yngwizop/servicedock
