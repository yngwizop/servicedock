#!/usr/bin/env python3
"""
Migration Script: Verschlüsselt bestehende Proxmox Token in der Datenbank
"""
import os
import sys
import psycopg2
from cryptography.fernet import Fernet
import base64
import hashlib

def get_encryption_key():
    """Erstellt den Encryption Key (identisch zur main.py Logik)"""
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
    """Verschlüsselt einen String"""
    if not plain_text:
        return plain_text
    encrypted = cipher_suite.encrypt(plain_text.encode())
    return encrypted.decode()

def is_already_encrypted(text):
    """Prüft ob der Text bereits verschlüsselt ist (Fernet-Format)"""
    if not text:
        return False
    try:
        # Fernet verschlüsselte Strings beginnen mit gAAAAA
        return text.startswith('gAAAAA')
    except:
        return False

def main():
    # Hole DB Connection String
    db_url = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/dashboard")
    
    # Parse DB URL
    from urllib.parse import urlparse
    result = urlparse(db_url)
    
    print("🔐 Proxmox Token Encryption Migration")
    print("=" * 50)
    
    # Verbinde zur DB
    try:
        conn = psycopg2.connect(
            dbname=result.path[1:],
            user=result.username,
            password=result.password,
            host=result.hostname,
            port=result.port
        )
        cur = conn.cursor()
        print("✓ Datenbankverbindung erfolgreich")
    except Exception as e:
        print(f"✗ Fehler bei Datenbankverbindung: {e}")
        sys.exit(1)
    
    # Hole den Encryption Key
    cipher_suite = get_encryption_key()
    print("✓ Encryption Key geladen")
    
    # Hole alle Proxmox Configs
    cur.execute("SELECT id, token_value FROM proxmox_config;")
    rows = cur.fetchall()
    
    if not rows:
        print("ℹ Keine Proxmox-Konfiguration gefunden")
        cur.close()
        conn.close()
        return
    
    print(f"\n📋 Gefundene Einträge: {len(rows)}")
    
    # Verschlüssele jeden Token
    encrypted_count = 0
    skipped_count = 0
    
    for row_id, token_value in rows:
        if is_already_encrypted(token_value):
            print(f"  • ID {row_id}: Bereits verschlüsselt - übersprungen")
            skipped_count += 1
            continue
        
        try:
            encrypted_token = encrypt_value(cipher_suite, token_value)
            cur.execute(
                "UPDATE proxmox_config SET token_value = %s WHERE id = %s;",
                (encrypted_token, row_id)
            )
            print(f"  • ID {row_id}: Token verschlüsselt ✓")
            encrypted_count += 1
        except Exception as e:
            print(f"  • ID {row_id}: Fehler - {e}")
    
    # Commit
    conn.commit()
    cur.close()
    conn.close()
    
    print("\n" + "=" * 50)
    print(f"✓ Migration abgeschlossen!")
    print(f"  Verschlüsselt: {encrypted_count}")
    print(f"  Übersprungen:  {skipped_count}")
    print("=" * 50)

if __name__ == "__main__":
    main()
