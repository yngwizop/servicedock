# 🌐 Web Dashboard

Ein modernes, selbst gehostetes Dashboard zum Verwalten und Organisieren deiner Web-Services und Shortcuts. Perfekt für Homelab-Setups, Self-Hosting-Enthusiasten oder als persönliche Startseite.


## ✨ Features

### 🎨 Anpassbares Design
- **Light/Dark Mode** mit automatischer Theme-Erkennung
- Anpassbare Hintergrundfarben und Hintergrundbilder
- Einstellbare Schriftfarben für Light und Dark Mode
- Flexible Grid-Layouts (2-12 Spalten)
- Backdrop-Blur-Effekte und moderne Glasmorphism-Optik

### 📱 Services & Shortcuts
- **Services**: Detaillierte Karten mit Name, Beschreibung, URL und Icon
- **Shortcuts**: Kompakte Links für schnellen Zugriff
- Icon-Support via URL oder Emoji
- Externe Icons können von [selfh.st/icons](https://selfh.st/icons/) verwendet werden

### 🔐 Admin-Bereich
- Passwortgeschützter Login
- Intuitives Edit-Modal für Services und Shortcuts
- Live-Bearbeitung mit sofortiger Vorschau
- Settings-Panel mit Tabs für bessere Organisation

### 🚀 Technologie-Stack
- **Frontend**: React 18 + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Datenbank**: PostgreSQL
- **Deployment**: Docker + Docker Compose
- **Styling**: Tailwind CSS mit Dark Mode Support

## 📦 Installation

### Voraussetzungen
- Docker & Docker Compose
- Git

### Setup

1. **Repository klonen**
```bash
git clone <dein-repo-url>
cd web-dashboard
```

2. **Umgebungsvariablen konfigurieren**
```bash
# .env Datei erstellen
DATABASE_URL=postgresql://user:password@db:5432/dashboard
ADMIN_PASSWORD=dein-sicheres-passwort
```

3. **Docker Container starten**
```bash
docker-compose up -d --build
```

4. **Dashboard öffnen**
```
http://localhost:3000
```

## 🎯 Verwendung

### Services hinzufügen
1. Admin-Login (🔒 Button unten rechts)
2. Settings öffnen (⚙️ Button)
3. Tab "Services & Shortcuts" auswählen
4. Service-Formular ausfüllen und "Hinzufügen" klicken

### Services bearbeiten
1. Im eingeloggten Zustand über eine Service-Card hovern
2. ✏️-Button klicken
3. Im Modal bearbeiten und "Speichern" klicken

### Design anpassen
1. Settings öffnen
2. Tab "Appearance" auswählen
3. Farben, Hintergründe und Layout anpassen
4. "Save Changes" klicken

## 🎨 Appearance-Optionen

- **Background Color**: Hintergrundfarbe des Dashboards
- **Background Image**: URL zu einem Hintergrundbild
- **Background Opacity**: Transparenz des Hintergrundbildes (0-1)
- **Text Colors**: Separate Schriftfarben für Light und Dark Mode
- **Service Columns**: Anzahl der Spalten für Services (2-10)
- **Shortcut Columns**: Anzahl der Spalten für Shortcuts (2-8)

## 🔧 Backend-API

### Endpoints

**Services**
- `GET /api/services` - Alle Services abrufen
- `POST /api/services` - Service hinzufügen
- `PUT /api/services/{id}` - Service aktualisieren
- `DELETE /api/services/{id}` - Service löschen

**Shortcuts**
- `GET /api/shortcuts` - Alle Shortcuts abrufen
- `POST /api/shortcuts` - Shortcut hinzufügen
- `PUT /api/shortcuts/{id}` - Shortcut aktualisieren
- `DELETE /api/shortcuts/{id}` - Shortcut löschen

**Appearance**
- `GET /api/appearance` - Design-Einstellungen abrufen
- `PUT /api/appearance` - Design-Einstellungen aktualisieren

**Auth**
- `POST /api/login` - Admin-Login

## 📂 Projektstruktur

```
web-dashboard/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ServiceCard.jsx
│   │   │   ├── ServiceGrid.jsx
│   │   │   ├── ShortcutLink.jsx
│   │   │   ├── ShortcutGrid.jsx
│   │   │   ├── EditModal.jsx
│   │   │   ├── LoginModal.jsx
│   │   │   └── SettingsPanel.jsx
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## 🛠️ Entwicklung

### Frontend entwickeln
```bash
cd frontend
npm install
npm start
```

### Backend entwickeln
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```


## 🐛 Troubleshooting

### Backend startet nicht
```bash
docker-compose logs backend
```

### Datenbank-Verbindungsfehler
- Überprüfe `DATABASE_URL` in der `.env` Datei
- Stelle sicher, dass PostgreSQL Container läuft: `docker ps`

### Frontend zeigt keine Daten
- Überprüfe `BACKEND_URL` in `App.jsx`
- Stelle sicher, dass Backend erreichbar ist

## 📝 To-Do / Roadmap

- [ ] Drag & Drop für Service-Reihenfolge
- [ ] Multiple Spalten Support zur besseren Organisation der Services/Shortcuts
- [ ] Export/Import von Konfigurationen
- [ ] Multi-User-Support
- [ ] Kategorien/Gruppen für Services
- [ ] Suchfunktion
- [ ] Mobile App (React Native)

## 🤝 Beitragen

Contributions sind willkommen! Bitte erstelle einen Pull Request oder öffne ein Issue für Vorschläge und Bug-Reports.

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE) Datei für Details.

## 🙏 Danksagungen

- Icons von [selfh.st/icons](https://selfh.st/icons/)
- UI-Framework: [Tailwind CSS](https://tailwindcss.com/)
- Backend-Framework: [FastAPI](https://fastapi.tiangolo.com/)

---

**Made with ❤️ for the self-hosting community**