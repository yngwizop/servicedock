
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

