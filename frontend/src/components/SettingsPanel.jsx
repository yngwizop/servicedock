import React from 'react';
import { Pencil, Moon, Sun } from 'phosphor-react';

// Wetter-Widget Felder für SettingsPanel
const WEATHER_FIELDS = [
  { key: 'temperature', label: 'Temperatur', api: 'temperature_2m', icon: '🌡️' },
  { key: 'humidity', label: 'Luftfeuchtigkeit', api: 'relative_humidity_2m', icon: '💧' },
  { key: 'wind', label: 'Wind', api: 'wind_speed_10m', icon: '🌀' },
  { key: 'precipitation', label: 'Niederschlag', api: 'precipitation', icon: '🌧️' },
  { key: 'cloudCover', label: 'Bewölkung', api: 'cloud_cover', icon: '☁️' },
  { key: 'pressure', label: 'Luftdruck', api: 'surface_pressure', icon: '🔽' },
];

function SettingsPanel({
  onClose,
  activeTab,
  setActiveTab,
  onAddService,
  serviceName, setServiceName, serviceDesc, setServiceDesc, serviceUrl, setServiceUrl, serviceIcon, setServiceIcon,
  onAddShortcut,
  shortcutName, setShortcutName, shortcutUrl, setShortcutUrl, shortcutIcon, setShortcutIcon,
  editAppearance, setEditAppearance, onSaveAppearance,
  isSavingAppearance, showSaved,
  currentTheme, // NEU: Aktuelles Theme
  weatherLocationInfo // NEU: Geocoding Info Objekt { name, country, latitude, longitude, postal_code }
}) {
  // NEU: State für Proxmox-Konfiguration
  const [proxmoxConfig, setProxmoxConfig] = React.useState({
    host: '',
    port: 8006,
    token_name: '',
    token_value: '',
    verify_ssl: false,
    node: ''
  });
  const [isSavingProxmox, setIsSavingProxmox] = React.useState(false);
  const [proxmoxSaved, setProxmoxSaved] = React.useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:8000`;

  // Lade Proxmox-Konfiguration beim Öffnen
  React.useEffect(() => {
    const fetchProxmoxConfig = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/proxmox/config`);
        const data = await res.json();
        if (data.configured) {
          setProxmoxConfig({
            host: data.host || '',
            port: data.port || 8006,
            token_name: data.token_name || '',
            token_value: '', // Secret wird aus Sicherheitsgründen nicht zurückgegeben
            verify_ssl: data.verify_ssl || false,
            node: data.node || ''
          });
        }
      } catch (err) {
        console.error('Failed to load Proxmox config:', err);
      }
    };
    
    if (activeTab === 'proxmox') {
      fetchProxmoxConfig();
    }
  }, [activeTab]);

  // Speichere Proxmox-Konfiguration
  const handleSaveProxmox = async (e) => {
    e.preventDefault();
    setIsSavingProxmox(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/proxmox/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proxmoxConfig)
      });

      if (res.ok) {
        setProxmoxSaved(true);
        setTimeout(() => setProxmoxSaved(false), 2000);
      } else {
        alert('Fehler beim Speichern der Proxmox-Konfiguration');
      }
    } catch (err) {
      console.error('Failed to save Proxmox config:', err);
      alert('Fehler beim Speichern der Proxmox-Konfiguration');
    } finally {
      setIsSavingProxmox(false);
    }
  };
  return (
    <div
      className="fixed right-0 top-0 h-screen w-96 bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg z-30 shadow-2xl dark:shadow-blue-900/50 p-6 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent dark:[&::-webkit-scrollbar-thumb]:bg-gray-600"
      role="region"
      aria-label="Dashboard Einstellungen"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Dashboard Settings</h2>
        <button onClick={onClose} className="text-3xl text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors" aria-label="Panel schließen">&times;</button>
      </div>

      {/* Tab-Navigation */}
      <div className="flex mb-6 -mx-6 px-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("services")}
          className={`flex-1 py-3 px-4 transition-all duration-300 relative whitespace-nowrap ${
            activeTab === "services"
              ? "text-blue-600 dark:text-blue-400 font-semibold after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100"
          }`}
        >
          Services
        </button>
        <button
          onClick={() => setActiveTab("appearance")}
          className={`flex-1 py-3 px-4 transition-all duration-300 relative whitespace-nowrap ${
            activeTab === "appearance"
              ? "text-blue-600 dark:text-blue-400 font-semibold after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100"
          }`}
        >
          Appearance
        </button>
        <button
          onClick={() => setActiveTab("proxmox")}
          className={`flex-1 py-3 px-4 transition-all duration-300 relative whitespace-nowrap ${
            activeTab === "proxmox"
              ? "text-blue-600 dark:text-blue-400 font-semibold after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100"
          }`}
        >
          Proxmox
        </button>
      </div>

      {/* === Tab-Inhalt: Services === */}
      {activeTab === "services" && (
        <div className="space-y-6">
          <form
            onSubmit={onAddService}
            className="p-4 bg-white dark:bg-gray-700/50 shadow-inner rounded-lg border border-gray-200 dark:border-gray-600"
          >
            <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Neuen Service hinzufügen</h3>
            <div className="space-y-3">
              <input placeholder="Name" value={serviceName} onChange={(e) => setServiceName(e.target.value)} className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
              <input placeholder="Beschreibung" value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)} className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
              <input placeholder="URL" value={serviceUrl} onChange={(e) => setServiceUrl(e.target.value)} className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
              <input
                placeholder="Icon URL oder Emoji ✉️"
                value={serviceIcon} onChange={(e) => setServiceIcon(e.target.value)} className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md font-medium w-full transition-colors">Hinzufügen</button>
            </div>
          </form>

          <form
            onSubmit={onAddShortcut}
            className="p-4 bg-white dark:bg-gray-700/50 shadow-inner rounded-lg border border-gray-200 dark:border-gray-600"
          >
            <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Neuen Shortcut hinzufügen</h3>
            <div className="space-y-3">
              <input placeholder="Name" value={shortcutName} onChange={(e) => setShortcutName(e.target.value)} className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
              <input placeholder="URL" value={shortcutUrl} onChange={(e) => setShortcutUrl(e.target.value)} className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
              <input
                placeholder="Icon URL oder Emoji 🔗"
                value={shortcutIcon}
                onChange={(e) => setShortcutIcon(e.target.value)}
                className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md font-medium w-full transition-colors">Hinzufügen</button>
            </div>
          </form>

          {/* Info-Hinweis für Icons */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              💡 <strong>Tipp:</strong> Icons können von{' '}
              <a
                href="https://selfh.st/icons/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-600 dark:hover:text-blue-200 font-medium"
              >
                selfh.st/icons
              </a>
              {' '}bezogen werden.
            </p>
          </div>
        </div>
      )}

      {/* === Tab-Inhalt: Appearance === */}
      {activeTab === "appearance" && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Aussehen anpassen</h3>
          
          {/* Sektion: Hintergrund */}
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              🎨 Hintergrund
            </h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hintergrundfarbe
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={editAppearance.bg_color || "#ffffff"}
                  onChange={(e) => setEditAppearance({ ...editAppearance, bg_color: e.target.value })}
                  className="w-16 h-10 p-1 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"
                />
                <input
                  type="text"
                  value={editAppearance.bg_color || "#ffffff"}
                  onChange={(e) => setEditAppearance({ ...editAppearance, bg_color: e.target.value })}
                  className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hintergrundbild URL
              </label>
              <input
                type="text"
                placeholder="https://..."
                value={editAppearance.bg_image_url || ""}
                onChange={(e) => setEditAppearance({ ...editAppearance, bg_image_url: e.target.value })}
                className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bild-Deckkraft: <span className="font-mono text-blue-600 dark:text-blue-400">{editAppearance.bg_opacity}</span>
              </label>
              <input
                type="range"
                min="0" max="1" step="0.05"
                value={editAppearance.bg_opacity}
                onChange={(e) => setEditAppearance({ ...editAppearance, bg_opacity: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>
          </div>

          {/* Sektion: Schriftfarben */}
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              ✏️ Schriftfarben
            </h4>
            
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-700">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                💡 Aktuell im <strong>{currentTheme === 'light' ? 'Light' : 'Dark'} Mode</strong>.{' '}
                Wechsle den Modus mit dem{' '}
                <span className="inline-flex items-center gap-1 whitespace-nowrap" aria-hidden="true">
                  <Moon size={12} />
                  <span className="text-gray-600 dark:text-gray-400">/</span>
                  <Sun size={12} />
                </span>
                <span className="sr-only"> Theme-Umschalter (Mond und Sonne)</span>
                {' '}Button, um die Farben zu testen.
              </p>
            </div>

            {/* Light Mode Schriftfarbe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Light Mode
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={editAppearance.text_color_light || "#1f2937"}
                  onChange={(e) => setEditAppearance({ ...editAppearance, text_color_light: e.target.value })}
                  className="w-16 h-10 p-1 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"
                />
                <input
                  type="text"
                  value={editAppearance.text_color_light || "#1f2937"}
                  onChange={(e) => setEditAppearance({ ...editAppearance, text_color_light: e.target.value })}
                  className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                  placeholder="#1f2937"
                />
              </div>
            </div>

            {/* Dark Mode Schriftfarbe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dark Mode
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={editAppearance.text_color_dark || "#e5e7eb"}
                  onChange={(e) => setEditAppearance({ ...editAppearance, text_color_dark: e.target.value })}
                  className="w-16 h-10 p-1 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"
                />
                <input
                  type="text"
                  value={editAppearance.text_color_dark || "#e5e7eb"}
                  onChange={(e) => setEditAppearance({ ...editAppearance, text_color_dark: e.target.value })}
                  className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                  placeholder="#e5e7eb"
                />
              </div>
            </div>
          </div>

          {/* Sektion: Layout */}
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              📐 Layout & Spalten
            </h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Service-Spalten (Desktop): <span className="font-mono text-blue-600 dark:text-blue-400">{editAppearance.service_cols}</span>
              </label>
              <input
                type="range"
                min="2" max="10" step="1"
                value={editAppearance.service_cols}
                onChange={(e) => setEditAppearance({ ...editAppearance, service_cols: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Shortcut-Spalten (Desktop): <span className="font-mono text-blue-600 dark:text-blue-400">{editAppearance.shortcut_cols}</span>
              </label>
              <input
                type="range"
                min="2" max="8" step="1"
                value={editAppearance.shortcut_cols}
                onChange={(e) => setEditAppearance({ ...editAppearance, shortcut_cols: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>
          </div>

          {/* Sektion: Uhr */}
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              🕐 Uhr-Einstellungen
            </h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Zeitformat
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer p-3 border-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700/50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20 border-gray-300 dark:border-gray-600">
                  <input
                    type="radio"
                    name="clock_format"
                    value="24h"
                    checked={editAppearance.clock_format === '24h'}
                    onChange={(e) => setEditAppearance({ ...editAppearance, clock_format: e.target.value })}
                    className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">24-Stunden</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">14:30:45</div>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-3 border-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700/50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20 border-gray-300 dark:border-gray-600">
                  <input
                    type="radio"
                    name="clock_format"
                    value="12h"
                    checked={editAppearance.clock_format === '12h'}
                    onChange={(e) => setEditAppearance({ ...editAppearance, clock_format: e.target.value })}
                    className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">12-Stunden</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">2:30:45 PM</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Sektion: Wetter */}
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              🌤️ Wetter-Widget
            </h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stadt
              </label>
              <input
                type="text"
                value={editAppearance.weather_city || ''}
                onChange={(e) => setEditAppearance({ ...editAppearance, weather_city: e.target.value })}
                placeholder="z.B. Berlin, München, Hamburg"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {/* Geocoding Info Anzeige */}
              {weatherLocationInfo && weatherLocationInfo.name && weatherLocationInfo.country && (
                <div className="mt-2 text-xs text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-900/30 rounded px-2 py-1">
                  <span className="font-semibold">Gefundener Ort:</span> {weatherLocationInfo.name}, {weatherLocationInfo.country}
                  {weatherLocationInfo.postal_code ? `, PLZ: ${weatherLocationInfo.postal_code}` : ''}
                  {typeof weatherLocationInfo.latitude === 'number' && typeof weatherLocationInfo.longitude === 'number' ?
                    `, (${weatherLocationInfo.latitude.toFixed(4)}, ${weatherLocationInfo.longitude.toFixed(4)})`
                    : ''}
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Wetterdaten werden alle 2 Stunden automatisch aktualisiert und zwischengespeichert (Cache).
                Manuelle Aktualisierung ist jederzeit per Button im Widget möglich.
              </p>
            </div>

            {/* Wetterdaten Felder Auswahl */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Angezeigte Wetterdaten
              </label>
              <div className="grid grid-cols-1 gap-3">
                {WEATHER_FIELDS.map(f => (
                  <label key={f.key} className="flex items-center gap-3 cursor-pointer p-3 border-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700/50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20 border-gray-300 dark:border-gray-600">
                    <input
                      type="checkbox"
                      checked={editAppearance.weather_fields?.includes(f.key) ?? (f.key === 'temperature' || f.key === 'humidity')}
                      onChange={e => {
                        const checked = e.target.checked;
                        let newFields = editAppearance.weather_fields ? [...editAppearance.weather_fields] : ['temperature', 'humidity'];
                        if (checked && !newFields.includes(f.key)) newFields.push(f.key);
                        if (!checked) newFields = newFields.filter(k => k !== f.key);
                        setEditAppearance({ ...editAppearance, weather_fields: newFields });
                      }}
                      className="appearance-none w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded-full bg-transparent checked:bg-transparent checked:border-gray-300 dark:checked:border-gray-600 relative checked:before:content-[''] checked:before:absolute checked:before:top-1/2 checked:before:left-1/2 checked:before:transform checked:before:-translate-x-1/2 checked:before:-translate-y-1/2 checked:before:w-2 checked:before:h-2 checked:before:bg-blue-600 checked:before:rounded-full focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-2xl flex-shrink-0" aria-hidden="true">{f.icon}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">{f.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          {/* Save Button */}
          <div>
            <button
              onClick={onSaveAppearance}
              disabled={isSavingAppearance}
              className={`bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg w-full font-medium transition-colors shadow-md hover:shadow-lg ${isSavingAppearance ? 'opacity-70 cursor-wait' : ''}`}
            >
              {isSavingAppearance ? 'Wird gespeichert' : showSaved ? 'Gespeichert' : 'Speichern'}
            </button>
          </div>
        </div>
      )}

      {/* === Tab-Inhalt: Proxmox === */}
      {activeTab === "proxmox" && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Proxmox Konfiguration</h3>
          
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
              <strong>📋 Wichtig:</strong> Du benötigst einen API Token von deinem Proxmox-Server.
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              Erstelle den Token in Proxmox unter: <strong>Datacenter → Permissions → API Tokens</strong>
            </p>
          </div>

          <form onSubmit={handleSaveProxmox} className="space-y-4">
            {/* Proxmox Host */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Proxmox Host/IP
              </label>
              <input
                type="text"
                value={proxmoxConfig.host}
                onChange={(e) => setProxmoxConfig({ ...proxmoxConfig, host: e.target.value })}
                placeholder="z.B. 192.168.1.100 oder pve.example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Port */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Port
              </label>
              <input
                type="number"
                value={proxmoxConfig.port}
                onChange={(e) => setProxmoxConfig({ ...proxmoxConfig, port: parseInt(e.target.value) })}
                placeholder="8006"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Token Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Token Name
              </label>
              <input
                type="text"
                value={proxmoxConfig.token_name}
                onChange={(e) => setProxmoxConfig({ ...proxmoxConfig, token_name: e.target.value })}
                placeholder="z.B. root@pam!mytoken"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Format: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">user@realm!tokenname</code>
              </p>
            </div>

            {/* Token Secret */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Token Secret
              </label>
              <input
                type="password"
                value={proxmoxConfig.token_value}
                onChange={(e) => setProxmoxConfig({ ...proxmoxConfig, token_value: e.target.value })}
                placeholder="********-****-****-****-************"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                required={!proxmoxConfig.host}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Der Secret wird nur beim ersten Einrichten oder beim Ändern benötigt
              </p>
            </div>

            {/* Node (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Node Name (optional)
              </label>
              <input
                type="text"
                value={proxmoxConfig.node}
                onChange={(e) => setProxmoxConfig({ ...proxmoxConfig, node: e.target.value })}
                placeholder="z.B. pve oder leer für alle Nodes"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Leer lassen, um VMs/LXCs von allen Nodes anzuzeigen
              </p>
            </div>

            {/* SSL Verification */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <input
                type="checkbox"
                id="verify_ssl"
                checked={proxmoxConfig.verify_ssl}
                onChange={(e) => setProxmoxConfig({ ...proxmoxConfig, verify_ssl: e.target.checked })}
                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="verify_ssl" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                SSL-Zertifikat verifizieren
              </label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 ml-1">
              ⚠️ Deaktiviere dies nur bei self-signed Zertifikaten
            </p>

            {/* Save Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSavingProxmox}
                className={`bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg w-full font-medium transition-colors shadow-md hover:shadow-lg ${
                  isSavingProxmox ? 'opacity-70 cursor-wait' : ''
                }`}
              >
                {isSavingProxmox ? 'Wird gespeichert...' : proxmoxSaved ? '✓ Gespeichert' : 'Konfiguration speichern'}
              </button>
            </div>
          </form>

          {/* Info */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">
              🔒 Sicherheitshinweis
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Der API Token wird verschlüsselt in der Datenbank gespeichert. 
              Stelle sicher, dass der Token nur die minimal notwendigen Berechtigungen hat.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPanel;