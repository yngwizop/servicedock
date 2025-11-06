import os
import psycopg2
from urllib.parse import urlparse
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Any
from fastapi import Body
import json
from proxmoxer import ProxmoxAPI
import requests
from requests.packages.urllib3.exceptions import InsecureRequestWarning
from cryptography.fernet import Fernet
import base64
import hashlib
from datetime import datetime
from fastapi import Request
import json as json_lib
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Disable SSL warnings for self-signed certificates
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

# --- Encryption Setup ---
def get_encryption_key():
    """
    Generiert oder lädt den Verschlüsselungs-Key.
    Der Key wird aus ENCRYPTION_KEY Umgebungsvariable geladen,
    oder aus ADMIN_PASSWORD abgeleitet (für Kompatibilität).
    """
    encryption_key = os.getenv("ENCRYPTION_KEY")
    
    if encryption_key:
        # Verwende den expliziten Encryption Key
        key_bytes = encryption_key.encode()
    else:
        # Fallback: Leite Key vom Admin-Passwort ab
        admin_pw = os.getenv("ADMIN_PASSWORD", "admin123")
        key_bytes = admin_pw.encode()
    
    # Erstelle einen 32-Byte Key mit SHA256
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
        print(f"Decryption error: {e}")
        return None

# --- Audit Logging ---
def log_audit(
    action: str,
    status: str = "success",
    user_type: str = "system",
    ip_address: str = None,
    resource_type: str = None,
    resource_id: str = None,
    details: dict = None,
    user_agent: str = None
):
    """
    Schreibt einen Eintrag ins Audit-Log
    """
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        details_json = json_lib.dumps(details) if details else None
        
        cur.execute(
            """INSERT INTO audit_log 
               (timestamp, user_type, ip_address, action, resource_type, resource_id, status, details, user_agent)
               VALUES (NOW(), %s, %s, %s, %s, %s, %s, %s, %s);""",
            (user_type, ip_address, action, resource_type, resource_id, status, details_json, user_agent)
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Audit log error: {e}")
        # Fehler beim Logging sollten nicht die Hauptfunktion blockieren

def get_client_ip(request: Request) -> str:
    """Extrahiert die Client-IP aus dem Request"""
    # Prüfe X-Forwarded-For Header (für Proxy/Load Balancer)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    # Fallback: Direct Client IP
    if request.client:
        return request.client.host
    
    return "unknown"

# --- Initialisierung ---
app = FastAPI()

# Rate Limiter Setup
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# === CORS Middleware ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Startup Event ===
@app.on_event("startup")
async def startup_event():
    """Wird beim Start der Anwendung ausgeführt"""
    try:
        # Automatisches Bereinigen von Audit-Logs älter als 90 Tage
        conn = get_connection()
        cur = conn.cursor()
        
        cur.execute(
            "DELETE FROM audit_log WHERE timestamp < NOW() - INTERVAL '90 days';"
        )
        deleted_count = cur.rowcount
        
        conn.commit()
        cur.close()
        conn.close()
        
        if deleted_count > 0:
            print(f"✓ Startup: {deleted_count} alte Audit-Logs gelöscht (>90 Tage)")
        else:
            print("✓ Startup: Keine alten Audit-Logs zum Löschen")
            
    except Exception as e:
        print(f"⚠ Startup cleanup error: {e}")


# --- Konfiguration & Datenbank ---
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/dashboard")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

def get_connection():
    try:
        result = urlparse(DATABASE_URL)
        return psycopg2.connect(
            dbname=result.path[1:],
            user=result.username,
            password=result.password,
            host=result.hostname,
            port=result.port
        )
    except Exception as e:
        print(f"Fehler bei der Datenbankverbindung: {e}")
        raise HTTPException(status_code=500, detail="Datenbankverbindung fehlgeschlagen")

# --- Pydantic Modelle (Datenstruktur) ---

class Shortcut(BaseModel):
    id: int | None = None
    name: str
    url: str
    icon: str | None = None

class Service(BaseModel):
    id: int | None = None
    name: str
    description: str | None = None
    url: str
    icon: str | None = None

class AdminLogin(BaseModel):
    password: str

# NEU: Appearance-Modell mit Schriftfarben
class Appearance(BaseModel):
    id: int = 1
    bg_color: str | None = None
    bg_image_url: str | None = None
    bg_opacity: float | None = Field(None, ge=0.0, le=1.0)
    shortcut_cols: int | None = Field(None, ge=1, le=12)
    service_cols: int | None = Field(None, ge=1, le=12)
    text_color_light: str | None = None  # NEU
    text_color_dark: str | None = None   # NEU
    clock_format: str | None = None      # NEU: 12h oder 24h
    weather_city: str | None = None      # NEU: Stadt für Wetter-Widget
    weather_fields: list[str] | None = None  # NEU: Liste der anzuzeigenden Wetterfelder

# NEU: Proxmox-Modelle
class ProxmoxConfig(BaseModel):
    id: int | None = None
    host: str
    port: int = 8006
    token_name: str  # z.B. "user@pam!tokenname"
    token_value: str  # Der Secret
    verify_ssl: bool = False
    node: str | None = None  # Optional: spezifischer Node

# --- API Routen ---

@app.get("/")
def root():
    return {"message": "Web Dashboard Backend is running"}

# ===== Shortcuts (CRUD) =====
@app.get("/api/shortcuts")
def get_shortcuts():
    conn = get_connection()
    cur = conn.cursor()
    # Sortiere nach position (persistente Reihenfolge), fallback id
    cur.execute("SELECT id, name, url, icon, position FROM shortcuts ORDER BY position ASC, id ASC;")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [{"id": r[0], "name": r[1], "url": r[2], "icon": r[3], "position": r[4]} for r in rows]

@app.post("/api/shortcuts")
def add_shortcut(shortcut: Shortcut):
    conn = get_connection()
    cur = conn.cursor()
    # Position an das Ende setzen
    cur.execute(
        "INSERT INTO shortcuts (name, url, icon, position) VALUES (%s, %s, %s, (SELECT COALESCE(MAX(position),0)+1 FROM shortcuts)) RETURNING id, position;",
        (shortcut.name, shortcut.url, shortcut.icon)
    )
    row = cur.fetchone()
    new_id = row[0]
    new_pos = row[1]
    conn.commit()
    cur.close()
    conn.close()
    return {"id": new_id, "position": new_pos, **shortcut.dict()}

@app.put("/api/shortcuts/{shortcut_id}")
def update_shortcut(shortcut_id: int, shortcut: Shortcut):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE shortcuts SET name=%s, url=%s, icon=%s WHERE id=%s RETURNING id;",
        (shortcut.name, shortcut.url, shortcut.icon, shortcut_id)
    )
    updated = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not updated:
        raise HTTPException(status_code=404, detail="Shortcut not found")
    return {"message": "updated", "id": shortcut_id, **shortcut.dict()}

@app.delete("/api/shortcuts/{shortcut_id}")
def delete_shortcut(shortcut_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM shortcuts WHERE id = %s RETURNING id;", (shortcut_id,)
    )
    deleted = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not deleted:
        raise HTTPException(status_code=404, detail="Shortcut not found")
    return {"message": "deleted"}

# ===== Services (CRUD) =====
@app.get("/api/services")
def get_services():
    conn = get_connection()
    cur = conn.cursor()
    # Sortiere nach position (persistente Reihenfolge), fallback id
    cur.execute("SELECT id, name, description, url, icon, position FROM services ORDER BY position ASC, id ASC;")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [
        {"id": r[0], "name": r[1], "description": r[2], "url": r[3], "icon": r[4], "position": r[5]}
        for r in rows
    ]

@app.post("/api/services")
def add_service(service: Service):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO services (name, description, url, icon, position) VALUES (%s, %s, %s, %s, (SELECT COALESCE(MAX(position),0)+1 FROM services)) RETURNING id, position;",
        (service.name, service.description, service.url, service.icon)
    )
    row = cur.fetchone()
    new_id = row[0]
    new_pos = row[1]
    conn.commit()
    cur.close()
    conn.close()
    return {"id": new_id, "position": new_pos, **service.dict()}

@app.put("/api/services/{service_id}")
def update_service(service_id: int, service: Service):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE services SET name=%s, description=%s, url=%s, icon=%s WHERE id=%s RETURNING id;",
        (service.name, service.description, service.url, service.icon, service_id)
    )
    updated = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not updated:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "updated", "id": service_id, **service.dict()}

@app.delete("/api/services/{service_id}")
def delete_service(service_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM services WHERE id = %s RETURNING id;", (service_id,)
    )
    deleted = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not deleted:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "deleted"}


# ===== Appearance (MIT SCHRIFTFARBEN) =====

@app.get("/api/appearance")
def get_appearance():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT bg_color, bg_image_url, bg_opacity, shortcut_cols, service_cols, text_color_light, text_color_dark, clock_format, weather_city, weather_fields FROM appearance WHERE id = 1;")
    row = cur.fetchone()
    cur.close()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Appearance settings not found")
    
    return {
        "bg_color": row[0], 
        "bg_image_url": row[1], 
        "bg_opacity": float(row[2]),
        "shortcut_cols": row[3],
        "service_cols": row[4],
        "text_color_light": row[5] if row[5] else "#1f2937",
        "text_color_dark": row[6] if row[6] else "#e5e7eb",
        "clock_format": row[7] if row[7] else "24h",
        "weather_city": row[8] if row[8] else "Berlin",
        "weather_fields": row[9] if row[9] else ["temperature", "humidity"]
    }

@app.put("/api/appearance")
def update_appearance(appearance: Appearance):
    conn = get_connection()
    cur = conn.cursor()
    
    updates = []
    params = []
    
    if appearance.bg_color is not None:
        updates.append("bg_color = %s")
        params.append(appearance.bg_color)
    if appearance.bg_image_url is not None:
        updates.append("bg_image_url = %s")
        params.append(appearance.bg_image_url)
    if appearance.bg_opacity is not None:
        updates.append("bg_opacity = %s")
        params.append(appearance.bg_opacity)
    if appearance.shortcut_cols is not None:
        updates.append("shortcut_cols = %s")
        params.append(appearance.shortcut_cols)
    if appearance.service_cols is not None:
        updates.append("service_cols = %s")
        params.append(appearance.service_cols)
    # NEU: Schriftfarben hinzugefügt
    if appearance.text_color_light is not None:
        updates.append("text_color_light = %s")
        params.append(appearance.text_color_light)
    if appearance.text_color_dark is not None:
        updates.append("text_color_dark = %s")
        params.append(appearance.text_color_dark)
    # NEU: Uhrenformat hinzugefügt
    if appearance.clock_format is not None:
        updates.append("clock_format = %s")
        params.append(appearance.clock_format)
    # NEU: Wetterstadt hinzugefügt
    if appearance.weather_city is not None:
        updates.append("weather_city = %s")
        params.append(appearance.weather_city)
    # NEU: Wetterfelder hinzugefügt
    if appearance.weather_fields is not None:
        updates.append("weather_fields = %s")
        params.append(json.dumps(appearance.weather_fields))  # JSON speichern

    if not updates:
        return {"message": "No changes provided"}

    params.append(1) # für WHERE id = %s
    query = f"UPDATE appearance SET {', '.join(updates)} WHERE id = %s RETURNING id;"
    
    cur.execute(query, tuple(params))
    updated = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if not updated:
        raise HTTPException(status_code=404, detail="Appearance settings (id=1) not found")

    return {"message": "Appearance updated"}


# ===== Auth =====
@app.post("/api/login")
def login(creds: AdminLogin):
    if creds.password == ADMIN_PASSWORD:
        return {"success": True, "message": "Login successful"}
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

# NEU: Endpunkte zum Setzen der Reihenfolge
@app.put("/api/admin/services/reorder")
def reorder_services(body: Any = Body(...)):
    # akzeptiere entweder ein rohes Array oder ein Objekt { "ids": [...] }
    ids = None
    if isinstance(body, dict) and "ids" in body:
        ids = body["ids"]
    elif isinstance(body, list):
        ids = body
    else:
        raise HTTPException(status_code=422, detail="Expected JSON array or object with 'ids' key")

    # Validieren: Liste von Integern
    try:
        ids_clean = [int(x) for x in ids]
    except Exception:
        raise HTTPException(status_code=422, detail="IDs must be integers")

    if not ids_clean:
        return {"message": "no ids provided"}

    conn = get_connection()
    cur = conn.cursor()
    try:
        # atomisches UPDATE via CASE ... END
        cases = []
        params = []
        for idx, s_id in enumerate(ids_clean, start=1):
            cases.append("WHEN %s THEN %s")
            params.extend([s_id, idx])
        case_sql = " ".join(cases)
        in_placeholders = ", ".join(["%s"] * len(ids_clean))
        params.extend(ids_clean)
        sql = f"UPDATE services SET position = CASE id {case_sql} END WHERE id IN ({in_placeholders});"
        cur.execute(sql, tuple(params))
        conn.commit()
    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to reorder services: {e}")
    cur.close()
    conn.close()
    return {"message": "services reordered"}

@app.put("/api/admin/shortcuts/reorder")
def reorder_shortcuts(body: Any = Body(...)):
    if isinstance(body, dict) and "ids" in body:
        ids = body["ids"]
    elif isinstance(body, list):
        ids = body
    else:
        raise HTTPException(status_code=422, detail="Expected JSON array or object with 'ids' key")

    try:
        ids_clean = [int(x) for x in ids]
    except Exception:
        raise HTTPException(status_code=422, detail="IDs must be integers")

    if not ids_clean:
        return {"message": "no ids provided"}

    conn = get_connection()
    cur = conn.cursor()
    try:
        cases = []
        params = []
        for idx, s_id in enumerate(ids_clean, start=1):
            cases.append("WHEN %s THEN %s")
            params.extend([s_id, idx])
        case_sql = " ".join(cases)
        in_placeholders = ", ".join(["%s"] * len(ids_clean))
        params.extend(ids_clean)
        sql = f"UPDATE shortcuts SET position = CASE id {case_sql} END WHERE id IN ({in_placeholders});"
        cur.execute(sql, tuple(params))
        conn.commit()
    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to reorder shortcuts: {e}")
    cur.close()
    conn.close()
    return {"message": "shortcuts reordered"}


# ===== Proxmox Integration =====

def get_proxmox_connection():
    """Holt Proxmox-Konfiguration aus DB und erstellt API-Verbindung"""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT host, port, token_name, token_value, verify_ssl, node FROM proxmox_config WHERE id = 1;"
    )
    row = cur.fetchone()
    cur.close()
    conn.close()
    
    if not row:
        return None, None
    
    host, port, token_name, token_value_encrypted, verify_ssl, node = row
    
    # Entschlüssele den Token
    token_value = decrypt_value(token_value_encrypted)
    
    if not token_value:
        print("Failed to decrypt Proxmox token")
        return None, None
    
    try:
        # Token Format: "user@realm!tokenname"
        # Proxmoxer erwartet user und token_name getrennt
        if '!' in token_name:
            user_part = token_name.split('!')[0]  # z.B. "root@pam"
            token_id = token_name.split('!')[1]   # z.B. "mytoken"
        else:
            # Fallback wenn kein ! vorhanden
            user_part = token_name
            token_id = 'default'
        
        # Proxmox API Connection erstellen
        proxmox = ProxmoxAPI(
            host,
            port=port,
            user=user_part,
            token_name=token_id,
            token_value=token_value,
            verify_ssl=verify_ssl
        )
        return proxmox, node
    except Exception as e:
        # Keine Details loggen, um Token-Leaks zu vermeiden
        print(f"Proxmox connection error (check config)")
        return None, None


@app.get("/api/proxmox/config")
def get_proxmox_config():
    """Gibt Proxmox-Konfiguration zurück (ohne Secret, token_name maskiert)"""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, host, port, token_name, verify_ssl, node FROM proxmox_config WHERE id = 1;"
    )
    row = cur.fetchone()
    cur.close()
    conn.close()
    
    if not row:
        return {
            "configured": False,
            "host": None,
            "port": 8006,
            "token_name": None,
            "verify_ssl": False,
            "node": None
        }
    
    # Maskiere token_name: zeige nur user@realm!*** statt vollem Token-Namen
    token_name = row[3]
    masked_token_name = None
    if token_name and '!' in token_name:
        user_realm = token_name.split('!')[0]  # z.B. "lxc-creator@pve"
        masked_token_name = f"{user_realm}!***"
    elif token_name:
        masked_token_name = "***"
    
    return {
        "configured": True,
        "id": row[0],
        "host": row[1],
        "port": row[2],
        "token_name": masked_token_name,
        "verify_ssl": row[4],
        "node": row[5]
    }


@app.put("/api/proxmox/config")
def update_proxmox_config(config: ProxmoxConfig):
    """Speichert Proxmox-Konfiguration (Token wird verschlüsselt)"""
    conn = get_connection()
    cur = conn.cursor()
    
    # Verschlüssele den Token-Wert
    encrypted_token = encrypt_value(config.token_value)
    
    # Prüfe ob Eintrag existiert
    cur.execute("SELECT id, token_value FROM proxmox_config WHERE id = 1;")
    existing = cur.fetchone()
    
    # Wenn kein neuer Token angegeben wurde, behalte den alten
    token_was_updated = bool(config.token_value)
    if not config.token_value and existing:
        encrypted_token = existing[1]  # Behalte den alten verschlüsselten Token
    
    if existing:
        # Wenn ein neuer Token gesetzt wurde, aktualisiere token_created_at
        if token_was_updated:
            cur.execute(
                """UPDATE proxmox_config 
                   SET host=%s, port=%s, token_name=%s, token_value=%s, verify_ssl=%s, node=%s, token_created_at=NOW() 
                   WHERE id=1 
                   RETURNING id;""",
                (config.host, config.port, config.token_name, encrypted_token, config.verify_ssl, config.node)
            )
        else:
            cur.execute(
                """UPDATE proxmox_config 
                   SET host=%s, port=%s, token_name=%s, token_value=%s, verify_ssl=%s, node=%s 
                   WHERE id=1 
                   RETURNING id;""",
                (config.host, config.port, config.token_name, encrypted_token, config.verify_ssl, config.node)
            )
    else:
        cur.execute(
            """INSERT INTO proxmox_config (id, host, port, token_name, token_value, verify_ssl, node) 
               VALUES (1, %s, %s, %s, %s, %s, %s) 
               RETURNING id;""",
            (config.host, config.port, config.token_name, encrypted_token, config.verify_ssl, config.node)
        )
    
    updated = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to save Proxmox configuration")
    
    return {"message": "Proxmox configuration saved"}


@app.get("/api/proxmox/vms")
@limiter.limit("30/minute")  # Max 30 Anfragen pro Minute
def get_proxmox_vms(request: Request):
    """Holt alle VMs und LXCs von Proxmox"""
    client_ip = get_client_ip(request)
    
    proxmox, configured_node = get_proxmox_connection()
    
    if not proxmox:
        log_audit(
            action="VIEW_VMS",
            status="failed",
            user_type="guest",
            ip_address=client_ip,
            details={"error": "Proxmox not configured"}
        )
        raise HTTPException(status_code=404, detail="Proxmox not configured")
    
    try:
        all_resources = []
        
        # Hole alle Nodes
        nodes = proxmox.nodes.get()
        
        for node_data in nodes:
            node_name = node_data['node']
            
            # Wenn ein spezifischer Node konfiguriert ist, nur diesen abfragen
            if configured_node and node_name != configured_node:
                continue
            
            try:
                # Hole QEMUs (VMs)
                qemus = proxmox.nodes(node_name).qemu.get()
                for vm in qemus:
                    all_resources.append({
                        "id": f"qemu-{node_name}-{vm['vmid']}",
                        "vmid": vm['vmid'],
                        "name": vm.get('name', f"VM {vm['vmid']}"),
                        "type": "qemu",
                        "status": vm.get('status', 'unknown'),
                        "cpu": vm.get('cpu', 0),
                        "mem": vm.get('mem', 0),
                        "maxmem": vm.get('maxmem', 0),
                        "disk": vm.get('disk', 0),
                        "maxdisk": vm.get('maxdisk', 0),
                        "uptime": vm.get('uptime', 0),
                        "node": node_name
                    })
                
                # Hole LXCs (Container)
                lxcs = proxmox.nodes(node_name).lxc.get()
                for container in lxcs:
                    all_resources.append({
                        "id": f"lxc-{node_name}-{container['vmid']}",
                        "vmid": container['vmid'],
                        "name": container.get('name', f"CT {container['vmid']}"),
                        "type": "lxc",
                        "status": container.get('status', 'unknown'),
                        "cpu": container.get('cpu', 0),
                        "mem": container.get('mem', 0),
                        "maxmem": container.get('maxmem', 0),
                        "disk": container.get('disk', 0),
                        "maxdisk": container.get('maxdisk', 0),
                        "uptime": container.get('uptime', 0),
                        "node": node_name
                    })
            except Exception as e:
                print(f"Error fetching resources from node {node_name}: {e}")
                continue
        
        # Log erfolgreichen Zugriff
        log_audit(
            action="VIEW_VMS",
            status="success",
            user_type="guest",
            ip_address=client_ip,
            details={"count": len(all_resources)}
        )
        
        return {"resources": all_resources}
        
    except Exception as e:
        print(f"Proxmox API error: {e}")
        log_audit(
            action="VIEW_VMS",
            status="failed",
            user_type="guest",
            ip_address=client_ip,
            details={"error": str(e)}
        )
        raise HTTPException(status_code=500, detail=f"Failed to fetch Proxmox resources: {str(e)}")


@app.post("/api/proxmox/vm/{vmid}/start")
@limiter.limit("10/minute")  # Max 10 Start-Befehle pro Minute
def start_proxmox_vm(vmid: int, vm_type: str = "qemu", request: Request = None):
    """Startet eine VM oder LXC"""
    client_ip = get_client_ip(request) if request else "unknown"
    
    proxmox, _ = get_proxmox_connection()
    
    if not proxmox:
        log_audit(
            action="START_VM",
            status="failed",
            user_type="admin",
            ip_address=client_ip,
            resource_type=vm_type,
            resource_id=str(vmid),
            details={"error": "Proxmox not configured"}
        )
        raise HTTPException(status_code=404, detail="Proxmox not configured")
    
    try:
        # Finde den richtigen Node für diese VM/LXC
        nodes = proxmox.nodes.get()
        
        for node_data in nodes:
            node_name = node_data['node']
            
            if vm_type == "qemu":
                vms = proxmox.nodes(node_name).qemu.get()
                if any(vm['vmid'] == vmid for vm in vms):
                    proxmox.nodes(node_name).qemu(vmid).status.start.post()
                    log_audit(
                        action="START_VM",
                        status="success",
                        user_type="admin",
                        ip_address=client_ip,
                        resource_type=vm_type,
                        resource_id=str(vmid),
                        details={"node": node_name}
                    )
                    return {"message": f"VM {vmid} started"}
            else:  # lxc
                containers = proxmox.nodes(node_name).lxc.get()
                if any(ct['vmid'] == vmid for ct in containers):
                    proxmox.nodes(node_name).lxc(vmid).status.start.post()
                    log_audit(
                        action="START_LXC",
                        status="success",
                        user_type="admin",
                        ip_address=client_ip,
                        resource_type=vm_type,
                        resource_id=str(vmid),
                        details={"node": node_name}
                    )
                    return {"message": f"Container {vmid} started"}
        
        log_audit(
            action="START_VM",
            status="failed",
            user_type="admin",
            ip_address=client_ip,
            resource_type=vm_type,
            resource_id=str(vmid),
            details={"error": "VM not found"}
        )
        raise HTTPException(status_code=404, detail=f"VM/Container {vmid} not found")
        
    except Exception as e:
        log_audit(
            action="START_VM",
            status="failed",
            user_type="admin",
            ip_address=client_ip,
            resource_type=vm_type,
            resource_id=str(vmid),
            details={"error": str(e)}
        )
        raise HTTPException(status_code=500, detail=f"Failed to start: {str(e)}")


@app.post("/api/proxmox/vm/{vmid}/stop")
@limiter.limit("10/minute")  # Max 10 Stop-Befehle pro Minute
def stop_proxmox_vm(vmid: int, vm_type: str = "qemu", request: Request = None):
    """Stoppt eine VM oder LXC"""
    client_ip = get_client_ip(request) if request else "unknown"
    proxmox, _ = get_proxmox_connection()
    
    if not proxmox:
        log_audit(action="STOP_VM", status="failed", user_type="admin", ip_address=client_ip,
                  resource_type=vm_type, resource_id=str(vmid), details={"error": "Proxmox not configured"})
        raise HTTPException(status_code=404, detail="Proxmox not configured")
    
    try:
        nodes = proxmox.nodes.get()
        
        for node_data in nodes:
            node_name = node_data['node']
            
            if vm_type == "qemu":
                vms = proxmox.nodes(node_name).qemu.get()
                if any(vm['vmid'] == vmid for vm in vms):
                    proxmox.nodes(node_name).qemu(vmid).status.stop.post()
                    log_audit(action="STOP_VM", status="success", user_type="admin", ip_address=client_ip,
                              resource_type=vm_type, resource_id=str(vmid), details={"node": node_name})
                    return {"message": f"VM {vmid} stopped"}
            else:  # lxc
                containers = proxmox.nodes(node_name).lxc.get()
                if any(ct['vmid'] == vmid for ct in containers):
                    proxmox.nodes(node_name).lxc(vmid).status.stop.post()
                    log_audit(action="STOP_LXC", status="success", user_type="admin", ip_address=client_ip,
                              resource_type=vm_type, resource_id=str(vmid), details={"node": node_name})
                    return {"message": f"Container {vmid} stopped"}
        
        log_audit(action="STOP_VM", status="failed", user_type="admin", ip_address=client_ip,
                  resource_type=vm_type, resource_id=str(vmid), details={"error": "VM not found"})
        raise HTTPException(status_code=404, detail=f"VM/Container {vmid} not found")
        
    except Exception as e:
        log_audit(action="STOP_VM", status="failed", user_type="admin", ip_address=client_ip,
                  resource_type=vm_type, resource_id=str(vmid), details={"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Failed to stop: {str(e)}")


@app.post("/api/proxmox/vm/{vmid}/reboot")
@limiter.limit("10/minute")  # Max 10 Reboot-Befehle pro Minute
def reboot_proxmox_vm(vmid: int, vm_type: str = "qemu", request: Request = None):
    """Startet eine VM oder LXC neu"""
    client_ip = get_client_ip(request) if request else "unknown"
    proxmox, _ = get_proxmox_connection()
    
    if not proxmox:
        log_audit(action="REBOOT_VM", status="failed", user_type="admin", ip_address=client_ip,
                  resource_type=vm_type, resource_id=str(vmid), details={"error": "Proxmox not configured"})
        raise HTTPException(status_code=404, detail="Proxmox not configured")
    
    try:
        nodes = proxmox.nodes.get()
        
        for node_data in nodes:
            node_name = node_data['node']
            
            if vm_type == "qemu":
                vms = proxmox.nodes(node_name).qemu.get()
                if any(vm['vmid'] == vmid for vm in vms):
                    proxmox.nodes(node_name).qemu(vmid).status.reboot.post()
                    log_audit(action="REBOOT_VM", status="success", user_type="admin", ip_address=client_ip,
                              resource_type=vm_type, resource_id=str(vmid), details={"node": node_name})
                    return {"message": f"VM {vmid} rebooting"}
            else:  # lxc
                containers = proxmox.nodes(node_name).lxc.get()
                if any(ct['vmid'] == vmid for ct in containers):
                    proxmox.nodes(node_name).lxc(vmid).status.reboot.post()
                    log_audit(action="REBOOT_LXC", status="success", user_type="admin", ip_address=client_ip,
                              resource_type=vm_type, resource_id=str(vmid), details={"node": node_name})
                    return {"message": f"Container {vmid} rebooting"}
        
        log_audit(action="REBOOT_VM", status="failed", user_type="admin", ip_address=client_ip,
                  resource_type=vm_type, resource_id=str(vmid), details={"error": "VM not found"})
        raise HTTPException(status_code=404, detail=f"VM/Container {vmid} not found")
        
    except Exception as e:
        log_audit(action="REBOOT_VM", status="failed", user_type="admin", ip_address=client_ip,
                  resource_type=vm_type, resource_id=str(vmid), details={"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Failed to reboot: {str(e)}")


# ===== Audit Log Endpoints =====

@app.get("/api/admin/audit-logs")
def get_audit_logs(limit: int = 100, offset: int = 0):
    """Holt die neuesten Audit-Log-Einträge (Admin-only)"""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute(
        """SELECT id, timestamp, user_type, ip_address, action, resource_type, 
                  resource_id, status, details, user_agent
           FROM audit_log
           ORDER BY timestamp DESC
           LIMIT %s OFFSET %s;""",
        (limit, offset)
    )
    
    rows = cur.fetchall()
    
    # Zähle total Einträge
    cur.execute("SELECT COUNT(*) FROM audit_log;")
    total = cur.fetchone()[0]
    
    cur.close()
    conn.close()
    
    logs = []
    for row in rows:
        logs.append({
            "id": row[0],
            "timestamp": row[1].isoformat() if row[1] else None,
            "user_type": row[2],
            "ip_address": row[3],
            "action": row[4],
            "resource_type": row[5],
            "resource_id": row[6],
            "status": row[7],
            "details": json_lib.loads(row[8]) if row[8] else None,
            "user_agent": row[9]
        })
    
    return {
        "logs": logs,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@app.get("/api/admin/audit-stats")
def get_audit_stats():
    """Holt Statistiken über Audit-Logs (Admin-only)"""
    conn = get_connection()
    cur = conn.cursor()
    
    # Aktionen der letzten 24h
    cur.execute("""
        SELECT action, COUNT(*) as count
        FROM audit_log
        WHERE timestamp > NOW() - INTERVAL '24 hours'
        GROUP BY action
        ORDER BY count DESC;
    """)
    actions_24h = [{"action": row[0], "count": row[1]} for row in cur.fetchall()]
    
    # Top IPs der letzten 7 Tage
    cur.execute("""
        SELECT ip_address, COUNT(*) as count
        FROM audit_log
        WHERE timestamp > NOW() - INTERVAL '7 days'
        GROUP BY ip_address
        ORDER BY count DESC
        LIMIT 10;
    """)
    top_ips = [{"ip": row[0], "count": row[1]} for row in cur.fetchall()]
    
    # Fehlerrate
    cur.execute("""
        SELECT 
            COUNT(CASE WHEN status = 'success' THEN 1 END) as success_count,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
            COUNT(*) as total_count
        FROM audit_log
        WHERE timestamp > NOW() - INTERVAL '24 hours';
    """)
    row = cur.fetchone()
    error_stats = {
        "success": row[0] or 0,
        "failed": row[1] or 0,
        "total": row[2] or 0
    }
    
    cur.close()
    conn.close()
    
    return {
        "actions_24h": actions_24h,
        "top_ips": top_ips,
        "error_stats": error_stats
    }


@app.post("/api/admin/audit-logs/cleanup")
def cleanup_old_audit_logs(days: int = 90):
    """Löscht Audit-Logs die älter als X Tage sind (Standard: 90 Tage)"""
    conn = get_connection()
    cur = conn.cursor()
    
    # Zähle wie viele gelöscht werden
    cur.execute(
        "SELECT COUNT(*) FROM audit_log WHERE timestamp < NOW() - INTERVAL '%s days';",
        (days,)
    )
    count_to_delete = cur.fetchone()[0]
    
    # Lösche alte Einträge
    cur.execute(
        "DELETE FROM audit_log WHERE timestamp < NOW() - INTERVAL '%s days';",
        (days,)
    )
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        "message": f"Alte Audit-Logs gelöscht",
        "deleted_count": count_to_delete,
        "older_than_days": days
    }


class DeleteLogsRequest(BaseModel):
    password: str


@app.post("/api/admin/audit-logs/delete-all")
def delete_all_audit_logs(request: DeleteLogsRequest):
    """Löscht ALLE Audit-Logs (Admin-Passwort erforderlich)"""
    
    # Prüfe Admin-Passwort
    admin_password = os.getenv("ADMIN_PASSWORD", "admin")
    if request.password != admin_password:
        raise HTTPException(status_code=403, detail="Falsches Admin-Passwort")
    
    conn = get_connection()
    cur = conn.cursor()
    
    # Zähle wie viele gelöscht werden
    cur.execute("SELECT COUNT(*) FROM audit_log;")
    count_to_delete = cur.fetchone()[0]
    
    # Lösche alle Einträge
    cur.execute("DELETE FROM audit_log;")
    
    # Setze Auto-Increment zurück
    cur.execute("ALTER SEQUENCE audit_log_id_seq RESTART WITH 1;")
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        "message": "Alle Audit-Logs gelöscht",
        "deleted_count": count_to_delete
    }


# ===== Token Rotation =====

@app.get("/api/admin/proxmox/token-info")
def get_token_info():
    """Gibt Informationen über das Alter des aktuellen Tokens zurück"""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT token_created_at, token_last_rotated, token_name
        FROM proxmox_config
        WHERE id = 1;
    """)
    row = cur.fetchone()
    cur.close()
    conn.close()
    
    if not row:
        return {"configured": False}
    
    created_at, last_rotated, token_name = row
    
    # Berechne Alter
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    
    if last_rotated:
        age_days = (now - last_rotated.replace(tzinfo=timezone.utc)).days
        last_rotated_str = last_rotated.isoformat()
    elif created_at:
        age_days = (now - created_at.replace(tzinfo=timezone.utc)).days
        last_rotated_str = None
    else:
        age_days = None
        last_rotated_str = None
    
    # Empfehlung
    rotation_recommended = age_days and age_days > 60  # Empfehle Rotation nach 60 Tagen
    
    return {
        "configured": True,
        "token_name": token_name,
        "created_at": created_at.isoformat() if created_at else None,
        "last_rotated": last_rotated_str,
        "age_days": age_days,
        "rotation_recommended": rotation_recommended
    }


@app.post("/api/admin/proxmox/rotate-token")
def rotate_token(config: ProxmoxConfig):
    """
    Rotiert den Proxmox-Token (speichert neuen Token und updated Zeitstempel)
    """
    conn = get_connection()
    cur = conn.cursor()
    
    # Verschlüssele den neuen Token
    encrypted_token = encrypt_value(config.token_value)
    
    # Update mit neuem Token und setze Rotations-Zeitstempel
    cur.execute("""
        UPDATE proxmox_config 
        SET token_value = %s,
            token_name = %s,
            token_last_rotated = NOW()
        WHERE id = 1
        RETURNING id;
    """, (encrypted_token, config.token_name))
    
    updated = cur.fetchone()
    conn.commit()
    
    # Log die Rotation
    log_audit(
        action="ROTATE_TOKEN",
        status="success" if updated else "failed",
        user_type="admin",
        details={"token_name": config.token_name}
    )
    
    cur.close()
    conn.close()
    
    if not updated:
        raise HTTPException(status_code=404, detail="Proxmox config not found")
    
    return {"message": "Token rotated successfully", "timestamp": datetime.now().isoformat()}