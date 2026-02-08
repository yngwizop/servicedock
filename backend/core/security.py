"""Security functions: JWT, bcrypt, encryption"""
import bcrypt
from jose import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
import base64
import hashlib
from cryptography.fernet import Fernet

from config.settings import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, ENCRYPTION_KEY
from core.logging import logger

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifiziert ein Passwort gegen einen Hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    """Erstellt einen Hash aus einem Passwort"""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Erstellt ein JWT-Token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- Encryption ---
def get_encryption_key():
    """
    Lädt den Verschlüsselungs-Key aus der ENCRYPTION_KEY Umgebungsvariable.
    """
    if not ENCRYPTION_KEY:
        raise ValueError(
            "ENCRYPTION_KEY environment variable is required! "
            "Generate one with: python3 -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    
    # Erstelle einen 32-Byte Key mit SHA256
    key_bytes = ENCRYPTION_KEY.encode()
    hash_digest = hashlib.sha256(key_bytes).digest()
    # Fernet benötigt Base64-kodierten Key
    fernet_key = base64.urlsafe_b64encode(hash_digest)
    return Fernet(fernet_key)

# Globale Fernet-Instanz
cipher_suite = get_encryption_key()

def encrypt_value(plain_text: str) -> str:
    """Verschlüsselt einen String"""
    if not plain_text:
        return plain_text
    encrypted = cipher_suite.encrypt(plain_text.encode())
    return encrypted.decode()

def decrypt_value(encrypted_text: str) -> str:
    """Entschlüsselt einen String"""
    if not encrypted_text:
        return encrypted_text
    try:
        decrypted = cipher_suite.decrypt(encrypted_text.encode())
        return decrypted.decode()
    except Exception as e:
        logger.error("Decryption failed", exc_info=False)
        return None
