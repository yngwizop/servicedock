import React from 'react';
import { Pencil, Moon, Sun } from 'phosphor-react';
import { authenticatedFetch } from '../utils/auth';

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
  activeTab,      // Wird nicht mehr verwendet - nur für Kompatibilität
  setActiveTab,   // Wird nicht mehr verwendet - nur für Kompatibilität
  onAddService,
  serviceName, setServiceName, serviceDesc, setServiceDesc, serviceUrl, setServiceUrl, serviceIcon, setServiceIcon,
  onAddShortcut,
  shortcutName, setShortcutName, shortcutUrl, setShortcutUrl, shortcutIcon, setShortcutIcon,
  editAppearance, setEditAppearance, onSaveAppearance,
  isSavingAppearance, showSaved,
  currentTheme, // NEU: Aktuelles Theme
  weatherLocationInfo // NEU: Geocoding Info Objekt { name, country, latitude, longitude, postal_code }
}) {
  // NEU: Eigener Tab-State für Settings-Panel (unabhängig von Haupt-App!)
  const [panelTab, setPanelTab] = React.useState('services');
  
  // NEU: State für Proxmox-Konfiguration
  const [proxmoxConfig, setProxmoxConfig] = React.useState({
    host: '',
    port: 8006,
    token_name: '',
    token_value: '',
    verify_ssl: false,
    node: ''
  });
  const [savedTokenName, setSavedTokenName] = React.useState(''); // Gespeicherter Token-Name (maskiert)
  const [isSavingProxmox, setIsSavingProxmox] = React.useState(false);
  const [proxmoxSaved, setProxmoxSaved] = React.useState(false);

  // NEU: State für Spotify AddOn
  const [spotifyConfig, setSpotifyConfig] = React.useState({
    client_id: '',
    client_secret: '',
    redirect_uri: 'http://127.0.0.1:8000/api/spotify/callback'
  });
  const [spotifyStatus, setSpotifyStatus] = React.useState({
    configured: false,
    connected: false
  });
  const [isSavingSpotify, setIsSavingSpotify] = React.useState(false);
  const [spotifySaved, setSpotifySaved] = React.useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:8000`;

  // Lade Proxmox-Konfiguration beim Öffnen
  React.useEffect(() => {
    const fetchProxmoxConfig = async () => {
      try {
        const res = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/config`);
        const data = await res.json();
        if (data.configured) {
          // Speichere den maskierten Token-Namen separat
          setSavedTokenName(data.token_name || '');
          
          setProxmoxConfig({
            host: data.host || '',
            port: data.port || 8006,
            token_name: '', // Leer lassen - wird als Placeholder angezeigt
            token_value: '', // Secret wird aus Sicherheitsgründen nicht zurückgegeben
            verify_ssl: data.verify_ssl || false,
            node: data.node || ''
          });
        }
      } catch (err) {
        console.error('Failed to load Proxmox config:', err);
      }
    };
    
    if (panelTab === 'proxmox') {
      fetchProxmoxConfig();
    }
  }, [panelTab]);

  // NEU: Lade Spotify Status beim Öffnen des AddOns Tab
  React.useEffect(() => {
    const fetchSpotifyStatus = async () => {
      try {
        const res = await authenticatedFetch(`${BACKEND_URL}/api/spotify/status`);
        const data = await res.json();
        setSpotifyStatus(data);
        if (data.configured && data.client_id) {
          setSpotifyConfig(prev => ({
            ...prev,
            client_id: data.client_id,
            redirect_uri: data.redirect_uri || prev.redirect_uri
          }));
        }
      } catch (err) {
        console.error('Failed to load Spotify status:', err);
      }
    };

    if (panelTab === 'addons') {
      fetchSpotifyStatus();
    }
  }, [panelTab]);

  // Speichere Proxmox-Konfiguration
  const handleSaveProxmox = async (e) => {
    e.preventDefault();
    setIsSavingProxmox(true);

    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/config`, {
        method: 'PUT',
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

  // NEU: Speichere Spotify Konfiguration
  const handleSaveSpotify = async (e) => {
    e.preventDefault();
    setIsSavingSpotify(true);

    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/spotify/install`, {
        method: 'POST',
        body: JSON.stringify(spotifyConfig)
      });

      if (res.ok) {
        setSpotifySaved(true);
        setTimeout(() => setSpotifySaved(false), 2000);
        // Reload status
        const statusRes = await authenticatedFetch(`${BACKEND_URL}/api/spotify/status`);
        const statusData = await statusRes.json();
        setSpotifyStatus(statusData);
      } else {
        const error = await res.json();
        alert(error.detail || 'Fehler beim Speichern der Spotify-Konfiguration');
      }
    } catch (err) {
      console.error('Failed to save Spotify config:', err);
      alert('Fehler beim Speichern der Spotify-Konfiguration');
    } finally {
      setIsSavingSpotify(false);
    }
  };

  // NEU: Spotify Verbinden (OAuth Flow)
  const handleConnectSpotify = async () => {
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/spotify/auth-url`);
      const data = await res.json();
      
      if (data.auth_url) {
        // Öffne Spotify Auth in neuem Fenster
        window.open(data.auth_url, '_blank');
        
        // Poll Status alle 3 Sekunden
        const pollInterval = setInterval(async () => {
          const statusRes = await authenticatedFetch(`${BACKEND_URL}/api/spotify/status`);
          const statusData = await statusRes.json();
          
          if (statusData.connected) {
            setSpotifyStatus(statusData);
            clearInterval(pollInterval);
            alert('Spotify erfolgreich verbunden!');
          }
        }, 3000);

        // Stop polling nach 2 Minuten
        setTimeout(() => clearInterval(pollInterval), 120000);
      }
    } catch (err) {
      console.error('Failed to get Spotify auth URL:', err);
      alert('Fehler beim Starten der Spotify-Verbindung');
    }
  };

  // NEU: Spotify Deinstallieren
  const handleUninstallSpotify = async () => {
    if (!confirm('Möchten Sie Spotify wirklich entfernen? Alle Daten werden gelöscht.')) {
      return;
    }

    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/spotify/uninstall`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setSpotifyStatus({ configured: false, connected: false });
        setSpotifyConfig({
          client_id: '',
          client_secret: '',
          redirect_uri: 'http://127.0.0.1:8000/api/spotify/callback'
        });
        alert('Spotify erfolgreich entfernt');
      } else {
        alert('Fehler beim Entfernen von Spotify');
      }
    } catch (err) {
      console.error('Failed to uninstall Spotify:', err);
      alert('Fehler beim Entfernen von Spotify');
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
          onClick={() => setPanelTab("services")}
          className={`flex-1 py-3 px-4 transition-all duration-300 relative whitespace-nowrap ${
            panelTab === "services"
              ? "text-blue-600 dark:text-blue-400 font-semibold after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100"
          }`}
        >
          Services
        </button>
        <button
          onClick={() => setPanelTab("appearance")}
          className={`flex-1 py-3 px-4 transition-all duration-300 relative whitespace-nowrap ${
            panelTab === "appearance"
              ? "text-blue-600 dark:text-blue-400 font-semibold after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100"
          }`}
        >
          Appearance
        </button>
        <button
          onClick={() => setPanelTab("proxmox")}
          className={`flex-1 py-3 px-4 transition-all duration-300 relative whitespace-nowrap ${
            panelTab === "proxmox"
              ? "text-blue-600 dark:text-blue-400 font-semibold after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100"
          }`}
        >
          Proxmox
        </button>
        <button
          onClick={() => setPanelTab("addons")}
          className={`flex-1 py-3 px-4 transition-all duration-300 relative whitespace-nowrap ${
            panelTab === "addons"
              ? "text-blue-600 dark:text-blue-400 font-semibold after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100"
          }`}
        >
          AddOns
        </button>
      </div>

      {/* === Tab-Inhalt: Services === */}
      {panelTab === "services" && (
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
      {panelTab === "appearance" && (
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
      {panelTab === "proxmox" && (
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
                placeholder={savedTokenName || "z.B. root@pam!mytoken"}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Format: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">user@realm!tokenname</code>
                {savedTokenName && (
                  <span className="ml-2 text-blue-500">
                    (Aktuell: {savedTokenName})
                  </span>
                )}
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

      {/* === Tab-Inhalt: AddOns === */}
      {panelTab === "addons" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              🧩 AddOns verwalten
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              Erweitere dein Dashboard mit zusätzlichen Integrationen
            </p>
          </div>

          {/* Spotify AddOn Card */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                  <span className="text-2xl">🎵</span>
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">Spotify</h4>
                  <p className="text-green-100 text-sm">Now Playing Widget</p>
                </div>
              </div>
              <div>
                {spotifyStatus.connected ? (
                  <span className="px-3 py-1 bg-white text-green-600 text-xs font-semibold rounded-full">
                    ✓ Verbunden
                  </span>
                ) : spotifyStatus.configured ? (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                    Konfiguriert
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                    Nicht installiert
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 bg-white dark:bg-gray-800">
              {!spotifyStatus.configured ? (
                // Installation Form
                <form onSubmit={handleSaveSpotify} className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
                    <h5 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                      📝 Setup benötigt
                    </h5>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                      Du benötigst einen Spotify Developer Account. 
                      <a 
                        href="https://developer.spotify.com/dashboard" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline ml-1"
                      >
                        Hier registrieren →
                      </a>
                    </p>
                    <ol className="text-xs text-blue-600 dark:text-blue-400 list-decimal list-inside space-y-1">
                      <li>Erstelle eine neue App im Spotify Developer Dashboard</li>
                      <li>Kopiere Client ID und Client Secret</li>
                      <li>Füge die Redirect URI hinzu: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">http://127.0.0.1:8000/api/spotify/callback</code></li>
                      <li>Trage die Daten unten ein und speichere</li>
                    </ol>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Client ID
                    </label>
                    <input
                      type="text"
                      value={spotifyConfig.client_id}
                      onChange={(e) => setSpotifyConfig({ ...spotifyConfig, client_id: e.target.value })}
                      required
                      placeholder="Deine Spotify Client ID"
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Client Secret
                    </label>
                    <input
                      type="password"
                      value={spotifyConfig.client_secret}
                      onChange={(e) => setSpotifyConfig({ ...spotifyConfig, client_secret: e.target.value })}
                      required
                      placeholder="Dein Spotify Client Secret"
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Redirect URI
                    </label>
                    <input
                      type="text"
                      value={spotifyConfig.redirect_uri}
                      onChange={(e) => setSpotifyConfig({ ...spotifyConfig, redirect_uri: e.target.value })}
                      required
                      placeholder="http://127.0.0.1:8000/api/spotify/callback"
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingSpotify}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isSavingSpotify ? 'Wird gespeichert...' : spotifySaved ? '✓ Gespeichert' : 'Konfiguration speichern'}
                  </button>
                </form>
              ) : (
                // Configured - Show Connect/Disconnect Options
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Client ID</p>
                      <p className="text-sm font-mono text-gray-800 dark:text-gray-200 truncate">
                        {spotifyStatus.client_id}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {spotifyStatus.connected ? '✓ Verbunden' : 'Nicht verbunden'}
                      </p>
                    </div>
                  </div>

                  {!spotifyStatus.connected ? (
                    <div className="space-y-3">
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-300">
                          ⚠️ Du musst dein Spotify-Konto noch verbinden. 
                          Klicke auf "Mit Spotify verbinden" um den OAuth-Flow zu starten.
                        </p>
                      </div>

                      <button
                        onClick={handleConnectSpotify}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                      >
                        🔗 Mit Spotify verbinden
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-300">
                        ✓ Dein Spotify-Konto ist verbunden! Das Widget wird auf dem Dashboard angezeigt.
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={handleUninstallSpotify}
                      className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      🗑️ Spotify entfernen
                    </button>
                  </div>
                </div>
              )}

              {/* Security Info */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h5 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  🔒 Sicherheit
                </h5>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Client Secret und Access Tokens werden verschlüsselt gespeichert. 
                  Spotify hat nur Lesezugriff auf deine aktuell abgespielte Musik.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPanel;