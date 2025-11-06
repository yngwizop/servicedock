#!/usr/bin/env python3
"""
Re-Encryption Script für Proxmox Tokens
Verwendung: Wenn ADMIN_PASSWORD geändert wurde und Tokens neu verschlüsselt werden müssen
"""

import os
import sys
import psycopg2
from cryptography.fernet import Fernet
import base64
import hashlib

def get_encryption_key(password: str):
    """Generiert Fernet Key aus Passwort"""
    key_bytes = password.encode()
    hash_digest = hashlib.sha256(key_bytes).digest()
    fernet_key = base64.urlsafe_b64encode(hash_digest)
    return Fernet(fernet_key)

def get_db_connection():
    """Erstellt Datenbankverbindung"""
    db_url = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/dashboard")
    
    # Parse DATABASE_URL
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
    Re-encrypted alle Tokens mit neuem Passwort
    
    Args:
        old_password: Altes ADMIN_PASSWORD
        new_password: Neues ADMIN_PASSWORD
    """
    
    print("🔐 Token Re-Encryption Script")
    print("=" * 50)
    
    # Erstelle Cipher für altes und neues Passwort
    old_cipher = get_encryption_key(old_password)
    new_cipher = get_encryption_key(new_password)
    
    # Verbinde zur Datenbank
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Hole aktuellen verschlüsselten Token
        cur.execute("SELECT id, token_value FROM proxmox_config WHERE id = 1;")
        row = cur.fetchone()
        
        if not row:
            print("❌ Keine Proxmox-Konfiguration gefunden!")
            return False
        
        config_id, encrypted_token = row
        
        print(f"📋 Config ID: {config_id}")
        print(f"📦 Verschlüsselter Token (alt): {encrypted_token[:30]}...")
        
        # Entschlüssele mit ALTEM Passwort
        try:
            decrypted_token = old_cipher.decrypt(encrypted_token.encode()).decode()
            print(f"✅ Entschlüsselung mit altem Passwort erfolgreich")
            print(f"🔓 Token: {decrypted_token[:10]}...{decrypted_token[-10:]}")
        except Exception as e:
            print(f"❌ Entschlüsselung fehlgeschlagen: {e}")
            print("💡 Tipp: Überprüfe ob das alte Passwort korrekt ist!")
            return False
        
        # Verschlüssele mit NEUEM Passwort
        try:
            new_encrypted_token = new_cipher.encrypt(decrypted_token.encode()).decode()
            print(f"✅ Verschlüsselung mit neuem Passwort erfolgreich")
            print(f"🔒 Neuer Token: {new_encrypted_token[:30]}...")
        except Exception as e:
            print(f"❌ Verschlüsselung fehlgeschlagen: {e}")
            return False
        
        # Update in Datenbank
        cur.execute(
            "UPDATE proxmox_config SET token_value = %s WHERE id = %s;",
            (new_encrypted_token, config_id)
        )
        conn.commit()
        
        print(f"✅ Token erfolgreich re-encrypted!")
        
        # Verifikation
        cur.execute("SELECT token_value FROM proxmox_config WHERE id = 1;")
        verified_token = cur.fetchone()[0]
        
        try:
            verified_decrypted = new_cipher.decrypt(verified_token.encode()).decode()
            if verified_decrypted == decrypted_token:
                print("✅ Verifikation erfolgreich!")
                print("🎉 Token kann jetzt mit neuem ADMIN_PASSWORD entschlüsselt werden")
                return True
            else:
                print("❌ Verifikation fehlgeschlagen!")
                return False
        except Exception as e:
            print(f"❌ Verifikation fehlgeschlagen: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Datenbankfehler: {e}")
        return False
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

def main():
    """Hauptfunktion"""
    print()
    print("=" * 60)
    print("  PROXMOX TOKEN RE-ENCRYPTION SCRIPT")
    print("=" * 60)
    print()
    print("⚠️  WICHTIG: Backup der Datenbank erstellen vor Ausführung!")
    print()
    print("Verwendung:")
    print("  Wenn du dein ADMIN_PASSWORD geändert hast, müssen die")
    print("  verschlüsselten Tokens mit dem neuen Passwort re-encrypted werden.")
    print()
    
    # Frage nach Passwörtern
    old_password = input("Altes ADMIN_PASSWORD: ").strip()
    if not old_password:
        print("❌ Kein Passwort eingegeben!")
        sys.exit(1)
    
    new_password = input("Neues ADMIN_PASSWORD: ").strip()
    if not new_password:
        print("❌ Kein Passwort eingegeben!")
        sys.exit(1)
    
    confirm_password = input("Neues ADMIN_PASSWORD bestätigen: ").strip()
    if new_password != confirm_password:
        print("❌ Passwörter stimmen nicht überein!")
        sys.exit(1)
    
    print()
    print("🔄 Starte Re-Encryption...")
    print()
    
    success = re_encrypt_tokens(old_password, new_password)
    
    print()
    if success:
        print("=" * 60)
        print("  ✅ RE-ENCRYPTION ERFOLGREICH!")
        print("=" * 60)
        print()
        print("Nächste Schritte:")
        print("1. Setze die neue ADMIN_PASSWORD in docker-compose.yml:")
        print(f"   ADMIN_PASSWORD={new_password}")
        print()
        print("2. Starte Backend neu:")
        print("   docker compose restart backend")
        print()
        print("3. Teste ob Proxmox Monitoring funktioniert")
        print()
    else:
        print("=" * 60)
        print("  ❌ RE-ENCRYPTION FEHLGESCHLAGEN!")
        print("=" * 60)
        print()
        print("Mögliche Ursachen:")
        print("- Altes Passwort ist falsch")
        print("- Datenbank ist nicht erreichbar")
        print("- Token wurde bereits mit anderem Key verschlüsselt")
        print()
        sys.exit(1)

if __name__ == "__main__":
    main()
