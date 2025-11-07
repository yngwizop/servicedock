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

# Token-Laufzeit - von ENV laden mit sicherem Default (2 Stunden)
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))

# --- Encryption Configuration ---
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    raise ValueError(
        "ENCRYPTION_KEY environment variable is required! "
        "Generate one with: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
    )

# --- Admin Configuration ---
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
if not ADMIN_PASSWORD:
    raise ValueError(
        "ADMIN_PASSWORD environment variable is required! "
        "Set a secure password in .env file."
    )

# --- Rate Limiting Configuration ---
MAX_FAILED_ATTEMPTS = int(os.getenv("MAX_FAILED_LOGIN_ATTEMPTS", "5"))
LOCKOUT_DURATION_MINUTES = int(os.getenv("LOGIN_LOCKOUT_MINUTES", "15"))
LOCKOUT_RESET_MINUTES = 60  # Nach 60min ohne Versuch → Reset Counter

# --- CORS Configuration ---
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
ENVIRONMENT = os.getenv("ENVIRONMENT", "production")  # Fail-safe Default

# --- Database Configuration ---
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required!")
