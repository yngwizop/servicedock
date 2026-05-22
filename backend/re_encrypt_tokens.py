#!/usr/bin/env python3
"""
Re-encryption script for Proxmox tokens.
Use this when ADMIN_PASSWORD has been changed and the stored tokens need to
be re-encrypted with the new key.
"""

import os
import sys
import psycopg2
from cryptography.fernet import Fernet
import base64
import hashlib

def get_encryption_key(password: str):
    """Build a Fernet key from a password."""
    key_bytes = password.encode()
    hash_digest = hashlib.sha256(key_bytes).digest()
    fernet_key = base64.urlsafe_b64encode(hash_digest)
    return Fernet(fernet_key)

def get_db_connection():
    """Create a database connection from DATABASE_URL."""
    db_url = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/dashboard")

    from urllib.parse import urlparse
    result = urlparse(db_url)

    return psycopg2.connect(
        host=result.hostname,
        port=result.port,
        user=result.username,
        password=result.password,
        database=result.path[1:]
    )

def re_encrypt_tokens(old_password: str, new_password: str):
    """
    Re-encrypt all tokens with a new password.

    Args:
        old_password: previous ADMIN_PASSWORD used to encrypt the tokens
        new_password: new ADMIN_PASSWORD used to re-encrypt the tokens
    """

    print("Proxmox Token Re-Encryption Script")
    print("=" * 50)

    old_cipher = get_encryption_key(old_password)
    new_cipher = get_encryption_key(new_password)

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT id, token_value FROM proxmox_config WHERE id = 1;")
        row = cur.fetchone()

        if not row:
            print("[ERR] No Proxmox configuration found.")
            return False

        config_id, encrypted_token = row

        print(f"Config ID: {config_id}")
        print(f"Encrypted token (old): {encrypted_token[:30]}...")

        try:
            decrypted_token = old_cipher.decrypt(encrypted_token.encode()).decode()
            print("[OK] Decryption with old password succeeded")
            print(f"Token: {decrypted_token[:10]}...{decrypted_token[-10:]}")
        except Exception as e:
            print(f"[ERR] Decryption failed: {e}")
            print("Hint: check that the old password is correct.")
            return False

        try:
            new_encrypted_token = new_cipher.encrypt(decrypted_token.encode()).decode()
            print("[OK] Encryption with new password succeeded")
            print(f"New token: {new_encrypted_token[:30]}...")
        except Exception as e:
            print(f"[ERR] Encryption failed: {e}")
            return False

        cur.execute(
            "UPDATE proxmox_config SET token_value = %s WHERE id = %s;",
            (new_encrypted_token, config_id)
        )
        conn.commit()

        print("[OK] Token successfully re-encrypted.")

        cur.execute("SELECT token_value FROM proxmox_config WHERE id = 1;")
        verified_token = cur.fetchone()[0]

        try:
            verified_decrypted = new_cipher.decrypt(verified_token.encode()).decode()
            if verified_decrypted == decrypted_token:
                print("[OK] Verification succeeded.")
                print("Token can now be decrypted with the new ADMIN_PASSWORD.")
                return True
            else:
                print("[ERR] Verification failed (mismatch).")
                return False
        except Exception as e:
            print(f"[ERR] Verification failed: {e}")
            return False

    except Exception as e:
        print(f"[ERR] Database error: {e}")
        return False
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

def main():
    """Entry point for interactive re-encryption."""
    print()
    print("=" * 60)
    print("  PROXMOX TOKEN RE-ENCRYPTION SCRIPT")
    print("=" * 60)
    print()
    print("IMPORTANT: create a database backup before running this script!")
    print()
    print("Usage:")
    print("  If you changed ADMIN_PASSWORD, the encrypted tokens must be")
    print("  re-encrypted with the new password.")
    print()

    old_password = input("Old ADMIN_PASSWORD: ").strip()
    if not old_password:
        print("[ERR] No password provided.")
        sys.exit(1)

    new_password = input("New ADMIN_PASSWORD: ").strip()
    if not new_password:
        print("[ERR] No password provided.")
        sys.exit(1)

    confirm_password = input("Confirm new ADMIN_PASSWORD: ").strip()
    if new_password != confirm_password:
        print("[ERR] Passwords do not match.")
        sys.exit(1)

    print()
    print("Starting re-encryption...")
    print()

    success = re_encrypt_tokens(old_password, new_password)

    print()
    if success:
        print("=" * 60)
        print("  RE-ENCRYPTION SUCCEEDED")
        print("=" * 60)
        print()
        print("Next steps:")
        print("1. Set the new ADMIN_PASSWORD in docker-compose.yml:")
        print(f"   ADMIN_PASSWORD={new_password}")
        print()
        print("2. Restart the backend:")
        print("   docker compose restart backend")
        print()
        print("3. Verify that Proxmox monitoring still works.")
        print()
    else:
        print("=" * 60)
        print("  RE-ENCRYPTION FAILED")
        print("=" * 60)
        print()
        print("Possible causes:")
        print("- The old password is incorrect")
        print("- The database is unreachable")
        print("- The token was already encrypted with a different key")
        print()
        sys.exit(1)

if __name__ == "__main__":
    main()
