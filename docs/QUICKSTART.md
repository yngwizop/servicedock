# 🚀 ServiceDock — Quick Start Guide

## Prerequisites
- Docker and Docker Compose installed
- Python 3 (for key generation)

## Installation (about 5 minutes)

### 1. Download and run the setup script
```bash
# Download setup script
curl -o setup-servicedock.sh https://raw.githubusercontent.com/yngwizop/servicedock/main/setup-servicedock.sh
chmod +x setup-servicedock.sh

# Automated install
./setup-servicedock.sh
```

**OR manual installation:**

### 1. Create working directory
```bash
mkdir servicedock && cd servicedock
```

### 2. Download Docker Compose file
```bash
curl -o docker-compose.yml https://raw.githubusercontent.com/yngwizop/servicedock/main/docker-compose.production.yml
```

### 3. Create environment file
```bash
curl -o .env.template https://raw.githubusercontent.com/yngwizop/servicedock/main/.env.template
cp .env.template .env
```

### 4. Generate SSL certificates

**PostgreSQL SSL:**
```bash
mkdir -p db-ssl
openssl req -new -x509 -days 365 -nodes -text \
  -out db-ssl/server.crt \
  -keyout db-ssl/server.key \
  -subj "/CN=postgres"
chmod 600 db-ssl/server.key
```

**Nginx SSL:**
```bash
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/server.key \
  -out ssl/server.crt \
  -subj "/C=DE/ST=State/L=City/O=Organization/CN=localhost"
```

### 5. Download init.sql
```bash
curl -o db-init.sql https://raw.githubusercontent.com/yngwizop/servicedock/main/db/init.sql
```

### 6. Generate security keys

**ENCRYPTION_KEY:**
```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

**JWT_SECRET_KEY:**
```bash
openssl rand -hex 32
```

### 7. Fill in `.env`
Open `.env` and set:
- `POSTGRES_PASSWORD` (e.g. a strong password)
- `ADMIN_PASSWORD` (for admin login)
- `ENCRYPTION_KEY` (from step 6)
- `JWT_SECRET_KEY` (from step 6)
- `FRONTEND_URL` (e.g. `https://10.10.10.50`)
- `DATABASE_URL` using your `POSTGRES_PASSWORD`

### 8. Start
```bash
docker compose up -d
```

### 9. Access
- Browser: `https://localhost` or `https://YOUR_IP`
- Login: `admin` / your `ADMIN_PASSWORD`

## 📦 Directory layout
```
servicedock/
├── docker-compose.yml    # Main config
├── .env                  # Your secrets
├── db-init.sql          # DB schema
├── ssl/                 # Nginx SSL certs
│   ├── server.crt
│   └── server.key
└── db-ssl/              # PostgreSQL SSL certs
    ├── server.crt
    └── server.key
```

## 🔄 Updates
```bash
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
rm -rf servicedock/
```

## 📚 Full documentation
See: https://github.com/yngwizop/servicedock
