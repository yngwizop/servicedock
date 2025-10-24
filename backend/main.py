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
    allow_origins=["*"],  # Für Test, später auf Frontend-URL begrenzen
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Konfiguration & Datenbank ---

# Lade aus .env-Datei (gelesen von Docker Compose)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@db:5432/dashboard"  # Fallback
)
ADMIN_PASSWORD = os.getenv(
    "ADMIN_PASSWORD", 
    "admin123" # Fallback, falls .env fehlt
)

def get_connection():
    try:
        result = urlparse(DATABASE_URL)
        return psycopg2.connect(
            dbname=result.path[1:],  # path beginnt mit '/'
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
    icon: str | None = None # Icon-Feld hinzugefügt, passend zur DB

class Service(BaseModel):
    id: int | None = None
    name: str
    description: str | None = None
    url: str
    icon: str | None = None

# NEU: Modell für Login
class AdminLogin(BaseModel):
    password: str

# NEU: Modell für Aussehen
class Appearance(BaseModel):
    id: int = 1
    bg_color: str | None = None
    bg_image_url: str | None = None
    bg_opacity: float | None = Field(None, ge=0.0, le=1.0) # Wert zwischen 0 und 1


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


# ===== NEU: Appearance =====

@app.get("/api/appearance")
def get_appearance():
    conn = get_connection()
    cur = conn.cursor()
    # Stellt sicher, dass die Default-Zeile (id=1) existiert
    cur.execute(
        "INSERT INTO appearance (id, bg_color, bg_opacity) "
        "VALUES (1, '#f0f2f5', 1.0) "
        "ON CONFLICT (id) DO NOTHING;"
    )
    conn.commit() 
    
    cur.execute("SELECT bg_color, bg_image_url, bg_opacity FROM appearance WHERE id = 1;")
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        # Sollte dank INSERT...ON CONFLICT nie passieren
        raise HTTPException(status_code=404, detail="Appearance settings not found")
    
    return {"bg_color": row[0], "bg_image_url": row[1], "bg_opacity": float(row[2])}

@app.put("/api/appearance")
def update_appearance(appearance: Appearance):
    conn = get_connection()
    cur = conn.cursor()
    
    # Baue die Query dynamisch, um nur gesendete Felder zu updaten
    updates = []
    params = []
    # Nimm den Wert nur, wenn er im Request Body war (Pydantic setzt ihn sonst nicht auf None)
    if appearance.bg_color is not None:
        updates.append("bg_color = %s")
        params.append(appearance.bg_color)
    if appearance.bg_image_url is not None:
        updates.append("bg_image_url = %s")
        params.append(appearance.bg_image_url)
    if appearance.bg_opacity is not None:
        updates.append("bg_opacity = %s")
        params.append(appearance.bg_opacity)

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


# ===== NEU: Auth =====

@app.post("/api/login")
def login(creds: AdminLogin):
    if creds.password == ADMIN_PASSWORD:
        # In einer echten App würden wir hier einen JWT-Token zurückgeben
        return {"success": True, "message": "Login successful"}
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")