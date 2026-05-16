#!/bin/bash
# ServiceDock automated setup script
# Downloads required files and configures a production install

set -e

echo "🚀 Starting ServiceDock setup..."
echo ""

# Output colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed!${NC}"
    echo "Install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed!${NC}"
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed!${NC}"
    exit 1
fi

# Check OpenSSL
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}❌ OpenSSL is not installed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker, Python, and OpenSSL found${NC}"
echo ""

# Create install directory
INSTALL_DIR="servicedock"
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}⚠️  Directory $INSTALL_DIR already exists${NC}"
    read -p "Overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    rm -rf "$INSTALL_DIR"
fi

mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

echo "📁 Creating directory structure..."

# Docker Hub (public images: user/servicedock-<component>)
DEFAULT_DOCKERHUB_USER="${DOCKERHUB_USER:-servicedockapp}"
read -p "Docker Hub username [${DEFAULT_DOCKERHUB_USER}]: " INPUT_HUB_USER
DOCKERHUB_USER="${INPUT_HUB_USER:-$DEFAULT_DOCKERHUB_USER}"
export DOCKERHUB_USER

GITHUB_REPO="yngwizop/servicedock"
GITHUB_RAW="https://raw.githubusercontent.com/${GITHUB_REPO}/main"

# Load from local repo (../ when run from repo root) or download from GitHub
fetch_repo_file() {
    local rel_path="$1"
    local dest="$2"
    if [ -f "../${rel_path}" ]; then
        cp "../${rel_path}" "$dest"
    elif [ -f "${rel_path}" ]; then
        cp "${rel_path}" "$dest"
    else
        curl -sS -f -L -o "$dest" "${GITHUB_RAW}/${rel_path}"
    fi
}

echo "🔐 Checking Docker Hub images (${DOCKERHUB_USER}/servicedock-*)..."
if ! docker pull "${DOCKERHUB_USER}/servicedock-frontend:latest" &>/dev/null; then
    echo -e "${YELLOW}⚠️  Pull failed — private repos or wrong username?${NC}"
    echo "Docker Hub access token: https://hub.docker.com/settings/security"
    echo ""
    read -p "Docker Hub login [${DOCKERHUB_USER}]: " DH_USER
    DH_USER=${DH_USER:-$DOCKERHUB_USER}
    read -sp "Docker Hub token/password: " DH_TOKEN
    echo ""
    echo "$DH_TOKEN" | docker login -u "$DH_USER" --password-stdin
    echo ""
fi

# Download Docker Compose (or use local file when script is run from the repo)
echo "📦 Downloading Docker Compose configuration..."
if [ -f "../docker-compose.production.yml" ]; then
    cp "../docker-compose.production.yml" docker-compose.yml
elif [ -f "docker-compose.production.yml" ]; then
    cp docker-compose.production.yml docker-compose.yml
else
    curl -sS -f -L -o docker-compose.yml "${GITHUB_RAW}/docker-compose.production.yml"
fi

# Directory layout expected by docker-compose.production.yml
mkdir -p db nginx/ssl db/ssl

echo "🗄️  Downloading database schema (db/init.sql)..."
fetch_repo_file "db/init.sql" "db/init.sql"

# Host / FRONTEND_URL (CORS, nginx certificate, Spotify redirect)
IP_ADDRESS=$(hostname -I | awk '{print $1}')
echo ""
echo -e "${YELLOW}Detected IP address: ${IP_ADDRESS}${NC}"
read -p "IP or domain for HTTPS access (Enter for ${IP_ADDRESS}): " CUSTOM_IP
HOST_INPUT=${CUSTOM_IP:-$IP_ADDRESS}
if [[ "$HOST_INPUT" == http://* ]] || [[ "$HOST_INPUT" == https://* ]]; then
  FRONTEND_URL="$HOST_INPUT"
else
  FRONTEND_URL="https://${HOST_INPUT}"
fi
# Host for certificate SAN (strip scheme/port)
CERT_HOST="${HOST_INPUT#https://}"
CERT_HOST="${CERT_HOST#http://}"
CERT_HOST="${CERT_HOST%%/*}"
CERT_HOST="${CERT_HOST%%:*}"

# PostgreSQL SSL (path: db/ssl — matches docker-compose.production.yml)
echo "🔐 Generating PostgreSQL SSL certificates (db/ssl/)..."
openssl req -new -x509 -days 365 -nodes \
  -out db/ssl/server.crt \
  -keyout db/ssl/server.key \
  -subj "/CN=postgres"
chmod 600 db/ssl/server.key
chmod 644 db/ssl/server.crt
chown 999:999 db/ssl/server.key db/ssl/server.crt 2>/dev/null || sudo chown 999:999 db/ssl/server.key db/ssl/server.crt 2>/dev/null || true

# Nginx SSL (path: nginx/ssl/cert.pem + key.pem — matches nginx/nginx.conf in the image)
echo "🔐 Generating Nginx SSL certificates (nginx/ssl/)..."
OPENSSL_SAN=()
if openssl req -help 2>&1 | grep -q addext; then
  if [[ "$CERT_HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    OPENSSL_SAN=(-addext "subjectAltName=IP:${CERT_HOST},IP:127.0.0.1,DNS:localhost")
  else
    OPENSSL_SAN=(-addext "subjectAltName=DNS:${CERT_HOST},DNS:localhost,IP:127.0.0.1")
  fi
fi
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/CN=${CERT_HOST}" \
  "${OPENSSL_SAN[@]}"
chmod 644 nginx/ssl/cert.pem
chmod 600 nginx/ssl/key.pem

# Generate secrets
echo "🔑 Generating security keys..."
ENCRYPTION_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
JWT_SECRET_KEY=$(openssl rand -hex 32)

echo ""
echo -e "${YELLOW}Enter the database password:${NC}"
read -sp "Database password: " DB_PASSWORD
echo ""
echo ""

# Create .env
echo "📝 Creating .env file..."
cat > .env <<EOF
# ServiceDock environment configuration
# Generated on $(date)

# Docker Hub image prefix (user/servicedock-backend, etc.)
DOCKERHUB_USER=${DOCKERHUB_USER}

# Database (compose builds DATABASE_URL from POSTGRES_*)
POSTGRES_USER=servicedock
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=servicedock

# Encryption and security keys
ENCRYPTION_KEY=${ENCRYPTION_KEY}
JWT_SECRET_KEY=${JWT_SECRET_KEY}

# Frontend URL
FRONTEND_URL=${FRONTEND_URL}

# Environment
ENVIRONMENT=production

# Token configuration
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Security configuration
MAX_FAILED_LOGIN_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=15

# Redis (required in production — rate limits, lockout, refresh rotation, Spotify OAuth state)
REDIS_URL=redis://redis:6379/0

# Behind bundled nginx: real client IP for lockout/audit
TRUST_FORWARDED_HEADERS=true
TRUSTED_PROXIES=172.16.0.0/12,10.0.0.0/8,192.168.0.0/16
EOF

chmod 600 .env

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "📦 Pulling Docker images and starting containers..."
echo ""

docker compose pull
docker compose up -d

echo ""
echo -e "${GREEN}🎉 ServiceDock is running!${NC}"
echo ""
echo "🌐 Access:"
echo "   Browser: ${FRONTEND_URL}"
echo "   First login: admin / changeme (change password in the UI)"
echo "   (Accept the self-signed certificate warning in your browser)"
echo ""
echo "🎵 Spotify redirect URI (developer dashboard):"
echo "   ${FRONTEND_URL}/api/spotify/callback"
echo ""
echo "📊 Check status:"
echo "   docker compose logs -f"
echo ""
echo "🛑 Stop:"
echo "   docker compose down"
echo ""
echo "📚 Documentation:"
echo "   https://github.com/yngwizop/servicedock"
echo ""
