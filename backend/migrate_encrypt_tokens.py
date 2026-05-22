#!/usr/bin/env python3
"""
Migration script: encrypt existing Proxmox tokens in the database.
"""
import os
import sys
import psycopg2
from cryptography.fernet import Fernet
import base64
import hashlib

def get_encryption_key():
    """Build the Fernet encryption key (identical to main.py logic)."""
    encryption_key = os.getenv("ENCRYPTION_KEY")

    if encryption_key:
        key_bytes = encryption_key.encode()
    else:
        admin_pw = os.getenv("ADMIN_PASSWORD", "admin123")
        key_bytes = admin_pw.encode()

    hash_digest = hashlib.sha256(key_bytes).digest()
    fernet_key = base64.urlsafe_b64encode(hash_digest)
    return Fernet(fernet_key)

def encrypt_value(cipher_suite, plain_text):
    """Encrypt a string value."""
    if not plain_text:
        return plain_text
    encrypted = cipher_suite.encrypt(plain_text.encode())
    return encrypted.decode()

def is_already_encrypted(text):
    """Return True if the value is already in Fernet format."""
    if not text:
        return False
    try:
        # Fernet encrypted strings always start with gAAAAA
        return text.startswith('gAAAAA')
    except Exception:
        return False

def main():
    db_url = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/dashboard")

    from urllib.parse import urlparse
    result = urlparse(db_url)

    print("Proxmox Token Encryption Migration")
    print("=" * 50)

    try:
        conn = psycopg2.connect(
            dbname=result.path[1:],
            user=result.username,
            password=result.password,
            host=result.hostname,
            port=result.port
        )
        cur = conn.cursor()
        print("[OK] Database connection established")
    except Exception as e:
        print(f"[ERR] Database connection failed: {e}")
        sys.exit(1)

    cipher_suite = get_encryption_key()
    print("[OK] Encryption key loaded")

    cur.execute("SELECT id, token_value FROM proxmox_config;")
    rows = cur.fetchall()

    if not rows:
        print("[INFO] No Proxmox configuration found")
        cur.close()
        conn.close()
        return

    print(f"\nEntries found: {len(rows)}")

    encrypted_count = 0
    skipped_count = 0

    for row_id, token_value in rows:
        if is_already_encrypted(token_value):
            print(f"  - ID {row_id}: already encrypted, skipped")
            skipped_count += 1
            continue

        try:
            encrypted_token = encrypt_value(cipher_suite, token_value)
            cur.execute(
                "UPDATE proxmox_config SET token_value = %s WHERE id = %s;",
                (encrypted_token, row_id)
            )
            print(f"  - ID {row_id}: token encrypted")
            encrypted_count += 1
        except Exception as e:
            print(f"  - ID {row_id}: error - {e}")

    conn.commit()
    cur.close()
    conn.close()

    print("\n" + "=" * 50)
    print("Migration finished.")
    print(f"  Encrypted: {encrypted_count}")
    print(f"  Skipped:   {skipped_count}")
    print("=" * 50)

if __name__ == "__main__":
    main()
