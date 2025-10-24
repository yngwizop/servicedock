Perfekt 👍
Hier ist deine vollständige, geprüfte **`README.md`** — exakt so formatiert, dass du sie direkt mit

```bash
nano /home/webdashboard/README.md
```

einfügen und speichern kannst.
Danach kannst du sie jederzeit per `cat README.md` oder im VS Code öffnen.

---

```markdown
# 🚀 Web-Dashboard — Installations- & Betriebsanleitung

Dieses Projekt besteht aus einem **Backend (FastAPI)**, einem **Frontend (React / Vite)** und einer **PostgreSQL-Datenbank** — alles läuft in **Docker-Containern** auf einem Proxmox-LXC (Debian-basiert).

---

## 📁 Projektstruktur

```

/home/webdashboard/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── db/
│   └── init.sql
├── frontend/
│   ├── src/
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml

````

---

## ⚙️ Voraussetzungen

- Debian LXC mit `nesting=1` aktiviert
- Docker & Docker Compose installiert
- Mind. **2 vCores**, **1 GB RAM**, **10–15 GB Speicher**
- Node.js ≥ 20 (für das Frontend)
- Python 3.11 (wird im Container installiert)

---

## 🧩 Inhalt der wichtigsten Dateien

### `db/init.sql`

Diese Datei sorgt dafür, dass beim ersten Start der Datenbank automatisch die Tabelle erstellt wird:

```sql
CREATE TABLE IF NOT EXISTS shortcuts (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL
);
````

> ⚠️ Wird **nur beim ersten Start** ausgeführt, wenn das Volume `postgres_data` leer ist.

---

### `backend/main.py` (Kurzversion)

```python
from fastapi import FastAPI
import psycopg2
import os

app = FastAPI()

DB_HOST = os.getenv("DB_HOST", "db")
DB_NAME = os.getenv("DB_NAME", "dashboard")
DB_USER = os.getenv("DB_USER", "user")
DB_PASS = os.getenv("DB_PASS", "password")

@app.get("/")
def root():
    return {"message": "Backend läuft"}

@app.get("/shortcuts")
def get_shortcuts():
    conn = psycopg2.connect(host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASS)
    cur = conn.cursor()
    cur.execute("SELECT id, name, url FROM shortcuts;")
    data = cur.fetchall()
    cur.close()
    conn.close()
    return [{"id": d[0], "name": d[1], "url": d[2]} for d in data]
```

---

### `frontend/vite.config.js`

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});
```

---

### `docker-compose.yml`

```yaml
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:4173"
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/dashboard
      - DB_HOST=db
      - DB_NAME=dashboard
      - DB_USER=user
      - DB_PASS=password
    depends_on:
      - db

  db:
    image: postgres:16
    container_name: webdashboard-db
    restart: always
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: dashboard
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

---

## ▶️ Starten des Projekts

1. Gehe in den Projektordner:

   ```bash
   cd /home/webdashboard
   ```

2. Starte alles neu (inklusive Build):

   ```bash
   DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 docker compose up -d --build
   ```

3. Prüfe, ob alles läuft:

   ```bash
   docker ps
   ```

   Du solltest 3 Container sehen:

   ```
   webdashboard-frontend-1
   webdashboard-backend-1
   webdashboard-db
   ```

4. Prüfe die Datenbank:

   ```bash
   docker exec -it webdashboard-db psql -U user -d dashboard -c "\d shortcuts"
   ```

---

## 🌐 Aufrufen im Browser

* Frontend: [http://localhost:3000](http://localhost:3000)
* Backend API: [http://localhost:8000/docs](http://localhost:8000/docs)

Wenn du auf einem LXC arbeitest, ersetze `localhost` ggf. durch die **LXC-IP**, z. B.:

```
http://192.168.178.83:3000
```

---

## 🛠️ Nützliche Docker-Befehle

| Zweck                      | Befehl                                                                   |
| -------------------------- | ------------------------------------------------------------------------ |
| Logs vom Backend ansehen   | `docker logs -f webdashboard-backend-1`                                  |
| Logs vom Frontend ansehen  | `docker logs -f webdashboard-frontend-1`                                 |
| Logs der DB ansehen        | `docker logs -f webdashboard-db`                                         |
| DB-Shell öffnen            | `docker exec -it webdashboard-db psql -U user -d dashboard`              |
| Manuell init.sql ausführen | `docker exec -i webdashboard-db psql -U user -d dashboard < db/init.sql` |

---

## 💾 Backups & Restore

**Backup:**

```bash
docker exec -t webdashboard-db pg_dump -U user dashboard > /home/webdashboard/backups/dashboard_$(date +%F).sql
```

**Wiederherstellen:**

```bash
cat /home/webdashboard/backups/dashboard_<DATUM>.sql | docker exec -i webdashboard-db psql -U user -d dashboard
```

---

## ⚠️ Typische Stolperfallen

1. **`init.sql` wird nicht mehr ausgeführt:**
   Das ist normal, sobald das Volume `postgres_data` existiert.
   → Manuell ausführen mit:
   `docker exec -i webdashboard-db psql -U user -d dashboard < db/init.sql`

2. **"no space left on device"**
   → LXC-Disk vergrößern (`pct resize <ID> +10G`) und ggf. `df -h` prüfen.

3. **`permission denied` beim Docker Build**
   → Prüfen, ob LXC `nesting=1` aktiviert hat:

   ```
   pct set <ID> -features nesting=1
   ```

4. **Daten weg nach Neustart:**
   → Volume `postgres_data` wurde gelöscht. Nicht mit `docker compose down -v` stoppen, wenn du Daten behalten willst.

---

## ✅ Systemprüfung

Nach erfolgreichem Start:

```bash
docker ps
```

Ergebnis:

```
CONTAINER ID   IMAGE                   PORTS
xxxxxxx        webdashboard-frontend   0.0.0.0:3000->4173/tcp
xxxxxxx        webdashboard-backend    0.0.0.0:8000->8000/tcp
xxxxxxx        postgres:16             0.0.0.0:5432->5432/tcp
```

---

## 💡 Tipp

Wenn du später die Datenbank automatisch neu aufbauen willst:

```bash
docker compose down -v
docker compose up -d
```

Das löscht alles, führt `init.sql` wieder aus und erstellt eine frische Tabelle.

---

📦 **Letzter Stand:**
System läuft stabil — Datenbank initialisiert, Backend erreichbar auf Port 8000, Frontend auf Port 3000, persistente Datenbank mit automatischem Tabellenerstellungsskript.

```
