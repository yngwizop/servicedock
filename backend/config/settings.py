"""Application settings and environment variables"""
import os

# --- Security Configuration ---
# JWT Secret Key - MUSS aus ENV kommen, kein Fallback!
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError(
        "JWT_SECRET_KEY environment variable is required! "
        "Generate one with: openssl rand -hex 32"
    )

ALGORITHM = "HS256"

# Token-Laufzeit - von ENV laden mit sicherem Default (15 Minuten für Access, 7 Tage für Refresh)
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# --- Encryption Configuration ---
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    raise ValueError(
        "ENCRYPTION_KEY environment variable is required! "
        "Generate one with: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
    )

# --- Rate Limiting Configuration ---
MAX_FAILED_ATTEMPTS = int(os.getenv("MAX_FAILED_LOGIN_ATTEMPTS", "5"))
LOCKOUT_DURATION_MINUTES = int(os.getenv("LOGIN_LOCKOUT_MINUTES", "15"))
LOCKOUT_RESET_MINUTES = 60  # Nach 60min ohne Versuch → Reset Counter

# --- CORS Configuration ---
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
ENVIRONMENT = os.getenv("ENVIRONMENT", "production").strip().lower()  # Fail-safe Default

# --- Redis (rate limits, login lockout, refresh jti, Spotify OAuth state) ---
REDIS_URL = os.getenv("REDIS_URL", "").strip()

if ENVIRONMENT == "production":
    if not REDIS_URL:
        raise ValueError(
            "REDIS_URL is required when ENVIRONMENT=production. "
            "In Docker Compose use: REDIS_URL=redis://redis:6379/0"
        )
    _frontend_lower = FRONTEND_URL.lower()
    if "localhost" in _frontend_lower or "127.0.0.1" in _frontend_lower:
        raise ValueError(
            "FRONTEND_URL must be your public HTTPS origin in production (not localhost). "
            "Example: https://dashboard.example.com"
        )

# --- Database Configuration ---
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required!")
