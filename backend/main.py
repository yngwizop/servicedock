import os
import psycopg2
from urllib.parse import urlparse
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Any
from fastapi import Body

# --- Initialisierung ---
app = FastAPI()

# === CORS Middleware ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    cur.execute("SELECT bg_color, bg_image_url, bg_opacity, shortcut_cols, service_cols, text_color_light, text_color_dark, clock_format, weather_city FROM appearance WHERE id = 1;")
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
        "weather_city": row[8] if row[8] else "Berlin"
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