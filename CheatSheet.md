
# FastAPI & Python Cheatsheet

## Routing: Reihenfolge ist wichtig!

- **Immer die `spezifischeren Routen` vor den generischen platzieren!**

### Warum?
FastAPI (und viele andere Frameworks) prüfen die Routen in der Reihenfolge, wie sie im Code stehen. Wenn du zuerst eine generische Route wie `/{id}` definierst, fängt diese alles ab – auch spezielle Routen wie `/reorder` oder `/login`.

**Beispiel:**
```python
@router.put("/{service_id}")
def update_service(service_id: int):
		...

@router.put("/reorder")
def reorder_services():
		...
```
**Problem:** `/reorder` wird als `service_id` interpretiert → Fehler!

**Richtig:**
```python
@router.put("/reorder")
def reorder_services():
		...

@router.put("/{service_id}")
def update_service(service_id: int):
		...
```
Jetzt funktioniert `/reorder` wie gewünscht.

---

## Typische Stolperfallen in FastAPI

- **Routenreihenfolge:** Siehe oben!
- **Datenmodelle:** Prüfe, ob dein Pydantic-Model mit dem erwarteten Payload übereinstimmt.
- **Fehlende Felder:** Wenn ein Feld im Model fehlt, gibt FastAPI automatisch einen 422-Error zurück.
- **Datenbank-Transaktionen:** Immer `commit()` und bei Fehlern `rollback()` nicht vergessen.
- **Pydantic v2:** `regex=` heißt jetzt `pattern=` → `Field(..., pattern="^regex$")`

---

## Tipps für Backend & Frontend Zusammenspiel

- **Payload-Format:** Prüfe, ob das Frontend wirklich das schickt, was das Backend erwartet (z.B. `{ "newOrder": [...] }` statt nur ein Array).
- **Fehlerbehandlung:** Im Frontend Fehler abfangen und dem User anzeigen.
- **Optimistisches UI:** Erst UI updaten, dann Backend-Call machen. Bei Fehlern zurückrollen.
- **Synchronisation:** Nach kritischen Änderungen (z.B. Reihenfolge) immer einmal vom Backend nachladen, um sicher zu sein, dass alles passt.

---

## Dashboard-spezifische vs. Globale Features

### Wichtig: Wo gehört ein Feature hin?

**Global (für ALLE Dashboards gleich):**
- Tabelle: `appearance`
- Beispiele: `show_spotify`, `show_weather`, `show_clock`, Farbschema, Spaltenanzahl
- UI: Settings → Appearance Tab

**Pro Dashboard (individuell je Dashboard):**
- Tabelle: `dashboards`
- Beispiele: `show_proxmox`, Services, Shortcuts, Proxmox-Config
- UI: Settings → Dashboards Tab → Dashboard bearbeiten

### Implementierungs-Checkliste für Dashboard-spezifische Features:

**1. Database (db/init.sql):**
```sql
ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS feature_name BOOLEAN DEFAULT TRUE;
-- NICHT in appearance Tabelle!
```

**2. Backend Models (backend/models/dashboard.py):**
```python
class Dashboard(BaseModel):
    feature_name: Optional[bool] = True

class DashboardResponse(BaseModel):
    feature_name: bool = True
```

**3. Backend Router (backend/routers/dashboards.py):**
- SELECT: `d.feature_name` in Query und Response-Mapping
- UPDATE: `feature_name = %s` in UPDATE Statement

**4. Frontend State (frontend/src/App.jsx):**
```javascript
// Zugriff via dashboards Array, NICHT appearance:
{dashboards.find(d => d.id === activeDashboard)?.feature_name && (
  <Component />
)}
```

**5. Frontend Settings (frontend/src/components/SettingsPanel.jsx):**
- Checkbox im **Dashboards Tab** (Dashboard-Bearbeitungsformular)
- State: `dashboardFeatureName` 
- useEffect zum Sync mit aktuellem Dashboard
- NICHT im Appearance Tab!

**Typischer Fehler:**
❌ Feature in `appearance` Tabelle → gilt global für alle Dashboards
✅ Feature in `dashboards` Tabelle → individuell pro Dashboard

---

## Häufige Fehler & Lösungen

- **422 Unprocessable Entity:**
	- Prüfe, ob alle Felder im Request-Body vorhanden und korrekt benannt sind.
- **404 Not Found:**
	- Prüfe, ob die Route wirklich existiert und die Reihenfolge stimmt.
- **500 Internal Server Error:**
	- Im Backend-Log nachschauen! Oft Tippfehler, DB-Fehler oder falsche Payloads.

---

## Debugging: Temporäre Logs für Fehlersuche

Wenn du komplexe Bugs debuggen musst (z.B. warum etwas doppelt läuft oder welche API verwendet wird), kannst du temporäre Debug-Logs hinzufügen:

```python
logger.info(f"🔧 function_name called with param={value}")
logger.info(f"🔧 is_cluster={is_cluster}, configured_node={configured_node}")
```

**Nach dem Debugging:**
- Debug-Logs wieder entfernen (Performance & Log-Spam)
- Nur wichtige Logs behalten (Fehler, Start/Stop Events, kritische Operationen)

**Tipp:** Nutze einzigartige Emoji-Präfixe (🔧, 🎯) um Debug-Logs schnell zu finden:
```bash
docker compose logs backend | grep "🔧"
```

---

## Nützliche Links

- [FastAPI Routing Docs](https://fastapi.tiangolo.com/tutorial/path-params/#order-matters)
- [Pydantic Models](https://docs.pydantic.dev/usage/models/)
- [React useEffect Guide](https://react.dev/reference/react/useEffect)

---

**Merksatz:**
> Immer erst die spezifischen, dann die generischen Routen definieren!

---

## React Grid Layout Integration für Drag & Drop

### Setup & Installation

**1. Package installieren:**
```bash
npm install react-grid-layout --save
```

**2. CSS-Dateien erstellen (`frontend/src/styles/grid-layout.css`):**
```css
.react-grid-layout {
  position: relative;
  transition: height 200ms ease;
  min-height: 400px;
}

.react-grid-item {
  transition: all 200ms ease;
  transition-property: left, top, width, height;
  box-sizing: border-box;
  position: absolute !important;
}

.react-grid-item > div {
  width: 100%;
  height: 100%;
  overflow: visible;
  position: relative;
}

/* Drag Handle Styles */
.drag-handle {
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.drag-handle:active {
  cursor: grabbing;
}
```

**3. Component-Struktur:**
```jsx
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import '../styles/grid-layout.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Default Layout definieren
const getDefaultLayout = () => {
  return [
    { i: 'card1', x: 0, y: 0, w: 1, h: 2, minW: 1, maxW: 4, minH: 2, maxH: 4 },
    { i: 'card2', x: 1, y: 0, w: 2, h: 3, minW: 2, maxW: 4, minH: 3, maxH: 8 }
  ];
};

// Im Component
<ResponsiveGridLayout
  className="layout"
  layouts={{ lg: layout }}
  breakpoints={{ lg: 1024, md: 768, sm: 640, xs: 0 }}
  cols={{ lg: 4, md: 2, sm: 1, xs: 1 }}
  rowHeight={75}  // Feinere Höhenabstufungen (75-100px empfohlen)
  isDraggable={true}
  isResizable={true}
  onLayoutChange={handleLayoutChange}
  draggableHandle=".drag-handle"
  compactType="vertical"
>
  {layout.map(item => (
    <div key={item.i}>
      <YourCard />
    </div>
  ))}
</ResponsiveGridLayout>
```

**4. Drag-Handle in Cards:**
```jsx
import { DotsSixVertical } from 'phosphor-react';

<div className="drag-handle cursor-grab active:cursor-grabbing">
  <DotsSixVertical size={20} weight="bold" />
</div>
```

### Backend: Layout Speicherung

**5. Datenbank-Tabelle erstellen:**
```sql
CREATE TABLE IF NOT EXISTS proxmox_dashboard_layouts (
    dashboard_id INT PRIMARY KEY REFERENCES dashboards(id) ON DELETE CASCADE,
    layout JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**6. Backend-Routen (`backend/routers/dashboards.py`):**
```python
import json

@router.get("/{dashboard_id}/proxmox-layout")
async def get_proxmox_layout(request: Request, dashboard_id: int, db = Depends(get_db)):
    """Get saved layout"""
    cur = db.cursor()
    try:
        cur.execute("SELECT layout FROM proxmox_dashboard_layouts WHERE dashboard_id = %s;", (dashboard_id,))
        row = cur.fetchone()
        return {"layout": row[0] if row else None}
    finally:
        cur.close()

@router.put("/{dashboard_id}/proxmox-layout")
async def save_proxmox_layout(request: Request, dashboard_id: int, db = Depends(get_db)):
    """Save layout - parse JSON body manually"""
    layout = await request.json()  # Wichtig: await request.json() statt layout: list Parameter
    
    cur = db.cursor()
    try:
        cur.execute(
            """
            INSERT INTO proxmox_dashboard_layouts (dashboard_id, layout, updated_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (dashboard_id) 
            DO UPDATE SET layout = EXCLUDED.layout, updated_at = NOW();
            """,
            (dashboard_id, json.dumps(layout))
        )
        db.commit()
        return {"message": "Layout saved"}
    finally:
        cur.close()
```

**Wichtig:** Bei FastAPI den Request-Body mit `await request.json()` parsen, nicht als `layout: list` Parameter!

### Frontend: Layout Laden & Speichern

**7. State & Funktionen:**
```jsx
const [layout, setLayout] = useState(getDefaultLayout());
const [layoutModified, setLayoutModified] = useState(false);

// Layout vom Backend laden
const loadLayout = async () => {
  const res = await fetch(`/api/dashboards/${dashboardId}/proxmox-layout`);
  const data = await res.json();
  if (data.layout) {
    setLayout(data.layout);
  }
};

// Layout speichern
const saveLayout = async () => {
  await fetch(`/api/dashboards/${dashboardId}/proxmox-layout`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(layout)
  });
  setLayoutModified(false);
};

// Bei Layout-Änderung
const handleLayoutChange = (newLayout) => {
  setLayout(newLayout);
  setLayoutModified(true);
};
```

### Dynamische Höhenanpassung

**8. Höhen basierend auf Einstellungen berechnen:**
```jsx
const getCardHeight = () => {
  const itemCount = parseInt(localStorage.getItem('items_count') || '10');
  // rowHeight=75px: h:5 = 375px, h:10 = 750px, h:15 = 1125px
  if (itemCount <= 5) return 5;
  if (itemCount <= 10) return 10;
  if (itemCount <= 15) return 15;
  return 20;
};

// Beim Laden: Höhen dynamisch anpassen
const loadLayout = async () => {
  const res = await fetch(`/api/dashboards/${dashboardId}/proxmox-layout`);
  const data = await res.json();
  if (data.layout) {
    const cardHeight = getCardHeight();
    const updated = data.layout.map(item => {
      if (item.i === 'dynamic-card') {
        return { ...item, h: cardHeight };
      }
      return item;
    });
    setLayout(updated);
  }
};
```

### Troubleshooting

**Problem: Cards überlappen sich**
- Lösung: `position: absolute !important;` in `.react-grid-item` CSS

**Problem: 404 bei Save/Load**
- Backend neu bauen: `docker compose build backend`
- Prüfen ob Route eingebunden: `app.include_router(dashboards_router)`

**Problem: Layout wird nicht gespeichert**
- Request-Body prüfen: `await request.json()` statt Parameter
- Datenbank prüfen: `SELECT * FROM proxmox_dashboard_layouts;`

**Problem: Zu viel/wenig Platz in Cards**
- `rowHeight` anpassen (75-100px für feinere Abstufungen)
- `h` (Höhe) in Layout-Definition anpassen

---
