import os
import psycopg2
from urllib.parse import urlparse
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

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

# --- API Routen ---

@app.get("/")
def root():
    return {"message": "Web Dashboard Backend is running"}

# ===== Shortcuts (CRUD) =====
@app.get("/api/shortcuts")
def get_shortcuts():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name, url, icon FROM shortcuts ORDER BY id;")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [{"id": r[0], "name": r[1], "url": r[2], "icon": r[3]} for r in rows]

@app.post("/api/shortcuts")
def add_shortcut(shortcut: Shortcut):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO shortcuts (name, url, icon) VALUES (%s, %s, %s) RETURNING id;",
        (shortcut.name, shortcut.url, shortcut.icon)
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return {"id": new_id, **shortcut.dict()}

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
    cur.execute("SELECT id, name, description, url, icon FROM services ORDER BY id;")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [
        {"id": r[0], "name": r[1], "description": r[2], "url": r[3], "icon": r[4]}
        for r in rows
    ]

@app.post("/api/services")
def add_service(service: Service):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO services (name, description, url, icon) VALUES (%s, %s, %s, %s) RETURNING id;",
        (service.name, service.description, service.url, service.icon)
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return {"id": new_id, **service.dict()}

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
    
    # Stellt sicher, dass die Default-Zeile (id=1) existiert - MIT SCHRIFTFARBEN
    cur.execute(
        "INSERT INTO appearance (id, bg_color, bg_opacity, shortcut_cols, service_cols, text_color_light, text_color_dark) "
        "VALUES (1, '#f0f2f5', 1.0, 6, 6, '#1f2937', '#e5e7eb') "
        "ON CONFLICT (id) DO NOTHING;"
    )
    conn.commit() 
    
    # NEU: text_color_light und text_color_dark hinzugefügt
    cur.execute(
        "SELECT bg_color, bg_image_url, bg_opacity, shortcut_cols, service_cols, text_color_light, text_color_dark "
        "FROM appearance WHERE id = 1;"
    )
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
        "text_color_light": row[5] if row[5] else "#1f2937",  # NEU mit Fallback
        "text_color_dark": row[6] if row[6] else "#e5e7eb"    # NEU mit Fallback
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