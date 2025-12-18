
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

## Nützliche Links

- [FastAPI Routing Docs](https://fastapi.tiangolo.com/tutorial/path-params/#order-matters)
- [Pydantic Models](https://docs.pydantic.dev/usage/models/)
- [React useEffect Guide](https://react.dev/reference/react/useEffect)

---

**Merksatz:**
> Immer erst die spezifischen, dann die generischen Routen definieren!

