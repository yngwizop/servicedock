# 🎨 ServiceDock Frontend

React-basiertes Frontend für ServiceDock - Ein modernes, selbst-gehostetes Dashboard mit Proxmox-Integration.

**Tech Stack:** React 18, Vite, Tailwind CSS, Phosphor Icons

---

## 📁 Projektstruktur

```
frontend/
├── src/
│   ├── components/           # React-Komponenten
│   │   ├── ServiceCard.jsx       # Service-Karte mit Icon & Beschreibung
│   │   ├── ServiceGrid.jsx       # Grid-Layout für Services
│   │   ├── ShortcutLink.jsx      # Kompakter Shortcut-Link
│   │   ├── ShortcutGrid.jsx      # Grid-Layout für Shortcuts
│   │   ├── EditModal.jsx         # Modal für Add/Edit
│   │   ├── LoginModal.jsx        # Admin-Login
│   │   ├── SettingsPage.jsx      # Settings als Fullscreen-Tab
│   │   ├── AddItemFAB.jsx        # FAB für Service/Shortcut hinzufügen
│   │   ├── ProxmoxCard.jsx       # VM/Container-Karte
│   │   ├── ProxmoxGrid.jsx       # Proxmox Monitoring
│   │   ├── SecurityDashboard.jsx # Audit-Logs & Stats
│   │   ├── ClockWidget.jsx       # Uhrzeit-Widget
│   │   └── WeatherWidget.jsx     # Wetter-Widget
│   ├── utils/
│   │   └── auth.js               # JWT-Token-Management
│   ├── App.jsx                   # Haupt-App-Komponente
│   ├── App.css                   # App-Styles
│   ├── index.css                 # Tailwind Imports
│   └── main.jsx                  # React Entry Point
├── public/                   # Statische Assets
├── index.html                # HTML-Template
├── vite.config.js            # Vite-Konfiguration
├── tailwind.config.js        # Tailwind-Konfiguration
├── postcss.config.js         # PostCSS-Konfiguration
├── eslint.config.js          # ESLint-Konfiguration
├── package.json              # Dependencies
├── Dockerfile                # Docker-Build
└── README.md                 # Diese Datei
```

---

## 🚀 Development Setup

### Voraussetzungen
- Node.js ≥ 20
- npm oder yarn

### Installation

```bash
# Dependencies installieren
npm install

# Development Server starten (mit Hot-Reload)
npm run dev

# Build für Production
npm run build

# Preview Production Build
npm run preview
```

### Verfügbare Scripts

```json
{
  "dev": "vite",                    // Dev-Server auf http://localhost:5173
  "build": "vite build",            // Production-Build
  "preview": "vite preview --host", // Production-Preview
  "lint": "eslint ."                // Code-Linting
}
```

---

## 🎨 Komponenten-Übersicht

### Core Components

#### `App.jsx`
Haupt-App-Komponente mit:
- Authentifizierungs-State-Management
- Grid-Layout für Services & Shortcuts
- Proxmox-Integration
- Settings-Panel
- Widgets (Clock, Weather)

#### `ServiceCard.jsx`
Zeigt einen Service mit:
- Icon (URL oder Emoji)
- Name & Beschreibung
- Link zur Service-URL
- Edit/Delete-Buttons (nur Admin)

#### `ProxmoxCard.jsx`
Zeigt VM/Container mit:
- Status-Indicator (Running/Stopped)
- Ressourcen (CPU, RAM, Disk)
- Uptime
- Control-Buttons (Start/Stop/Reboot)

### Modal Components

#### `LoginModal.jsx`
Admin-Login mit:
- Passwort-Input
- JWT-Token-Verwaltung
- Error-Handling
- Auto-Logout bei Token-Expiration

#### `EditModal.jsx`
Add/Edit Modal für Services/Shortcuts mit:
- Formular-Validierung
- Icon-Preview
- Create/Update/Delete-Actions

#### `SettingsPage.jsx`
Fullscreen Settings-Tab mit 2-Spalten-Grid:
- **Appearance**: Farben, Hintergründe, Layout
- **Dashboards**: Dashboard-Verwaltung
- **Proxmox**: VM/Container-Monitoring
- **Add-Ons**: Config Import/Export, Spotify

#### `AddItemFAB.jsx`
Floating Action Button (unten rechts, erscheint beim Runterscrollen):
- Service hinzufügen
- Shortcut hinzufügen

---

## 🔧 Konfiguration

### API-Endpoint

In `App.jsx`:
```javascript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

Environment-Variable setzen:
```bash
# .env.local erstellen
VITE_API_URL=http://deine-backend-url:8000
```

### Tailwind Customization

`tailwind.config.js`:
```javascript
export default {
  darkMode: 'class',  // Dark Mode über CSS-Klasse
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom-Colors, Fonts, etc.
    },
  },
}
```

---

## 🏗️ Docker Build

### Development
```bash
docker build -t servicedock-frontend:dev .
docker run -p 3000:4173 servicedock-frontend:dev
```

### Production (via docker-compose)
```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
  ports:
    - "3000:4173"
  depends_on:
    - backend
```

### Dockerfile-Details

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
EXPOSE 4173
CMD ["npm", "run", "preview"]
```

**Multi-Stage Build:**
- ✅ Builder-Stage für kompakte Dependencies
- ✅ Production-Stage nur mit nötigen Files
- ✅ Kleineres Image (~200MB statt ~800MB)

---

## 📦 Dependencies

### Production Dependencies
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "@phosphor-icons/react": "^2.1.7"  // Icon-Library
}
```

### Development Dependencies
```json
{
  "@vitejs/plugin-react": "^4.3.3",
  "vite": "^5.4.10",
  "tailwindcss": "^3.4.14",
  "postcss": "^8.4.47",
  "autoprefixer": "^10.4.20",
  "eslint": "^9.13.0"
}
```

---

## 🎯 Features

### Implementiert ✅
- ✅ Responsive Design (Mobile/Tablet/Desktop)
- ✅ Dark Mode Support
- ✅ JWT-basierte Authentifizierung
- ✅ Service & Shortcut Management
- ✅ Proxmox VM-Monitoring mit Live-Status
- ✅ Audit-Log-Viewer
- ✅ Settings-Panel mit Tabs
- ✅ Clock & Weather Widgets
- ✅ Icon-Support (URL & Emoji)

### In Planung 🚧
- [ ] Drag & Drop für Reordering
- [ ] Multi-Spalten-Layout
- [ ] Suchfunktion & Filtering
- [ ] Benachrichtigungen (Toast/Snackbar)
- [ ] PWA-Support (Offline-Mode)
- [ ] Custom Themes
- [ ] Export/Import-Funktionen

---

## 🐛 Troubleshooting

### CORS-Fehler
```
Access to fetch at 'http://localhost:8000/api/...' from origin 'http://localhost:5173' has been blocked
```

**Lösung:** Backend muss `FRONTEND_URL` in `.env` konfiguriert haben:
```env
FRONTEND_URL=http://localhost:5173
```

### Build schlägt fehl
```bash
# Cache löschen
rm -rf node_modules package-lock.json
npm install

# Oder mit clean install
npm ci
```

### Hot-Reload funktioniert nicht
```bash
# Vite-Cache löschen
rm -rf node_modules/.vite
npm run dev
```

### Production-Build ist zu groß
```bash
# Analyze Bundle
npm run build -- --mode analyze

# Tree-Shaking prüfen
npm run build -- --debug
```

---

## 🔐 Security

### JWT-Token-Speicherung
- Tokens werden in `localStorage` gespeichert
- Auto-Logout bei Expiration (120min default)
- Token wird bei jedem API-Call im Header mitgeschickt

### HTTPS-Empfehlung
Für Production immer HTTPS nutzen:
```nginx
# Nginx Reverse-Proxy
location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

---

## 📚 Weiterführende Dokumentation

- **Backend-API**: [API_DOCUMENTATION.md](../API_DOCUMENTATION.md)
- **Setup**: [INITIAL_SETUP.md](../INITIAL_SETUP.md)
- **Proxmox**: [PROXMOX_SETUP.md](../PROXMOX_SETUP.md)

---

## 🤝 Contributing

1. Fork das Repository
2. Feature-Branch erstellen (`git checkout -b feature/AmazingFeature`)
3. Änderungen committen (`git commit -m 'Add AmazingFeature'`)
4. Branch pushen (`git push origin feature/AmazingFeature`)
5. Pull Request öffnen

### Code-Style
- ESLint-Regeln beachten (`npm run lint`)
- Komponenten in PascalCase
- Funktionen in camelCase
- CSS-Klassen mit Tailwind

---

**Made with ⚛️ React & ❤️**
