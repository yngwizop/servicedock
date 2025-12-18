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
  weatherLocationInfo, // NEU: Geocoding Info Objekt { name, country, latitude, longitude, postal_code }
  dashboards, // NEU: Dashboard Liste
  activeDashboard, // NEU: Aktuelles Dashboard
  onDashboardsChange // NEU: Callback für Dashboard-Änderungen
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
    redirect_uri: '' // Wird dynamisch gesetzt
  });
  const [spotifyStatus, setSpotifyStatus] = React.useState({
    configured: false,
    connected: false
  });
  const [isSavingSpotify, setIsSavingSpotify] = React.useState(false);
  const [spotifySaved, setSpotifySaved] = React.useState(false);

  // NEU: State für Dashboard Management
  const [dashboardName, setDashboardName] = React.useState('');
  const [dashboardDesc, setDashboardDesc] = React.useState('');
  const [dashboardType, setDashboardType] = React.useState('default');
  const [dashboardShowProxmox, setDashboardShowProxmox] = React.useState(true);
  const [editingDashboard, setEditingDashboard] = React.useState(null);
  const [isSavingDashboard, setIsSavingDashboard] = React.useState(false);
  const [dashboardSaved, setDashboardSaved] = React.useState(false);

  // Sync editingDashboard state when dashboard is being edited
  React.useEffect(() => {
    if (editingDashboard) {
      const currentDash = dashboards.find(d => d.id === editingDashboard.id);
      if (currentDash) {
        setDashboardName(currentDash.name);
        setDashboardDesc(currentDash.description || '');
        setDashboardType(currentDash.type || 'default');
        setDashboardShowProxmox(currentDash.show_proxmox === true); // Explicit true check
      }
    }
  }, [editingDashboard, dashboards]);

  // Backend URL: Mit Nginx kein Port nötig, ohne Nginx Port 8000
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
    (window.location.port === '' ? 
      `${window.location.protocol}//${window.location.hostname}` :
      `${window.location.protocol}//${window.location.hostname}:8000`
    );
  
  // Spotify Redirect URI: 
  // - HTTPS: Nutze aktuellen Hostname ohne Port (läuft über Nginx auf 443)
  // - HTTP: Immer 127.0.0.1:8000 (Spotify-Einschränkung)
  const SPOTIFY_REDIRECT_URI = window.location.protocol === 'https:' 
    ? `https://${window.location.hostname}/api/spotify/callback`
    : 'http://127.0.0.1:8000/api/spotify/callback';

  // Lade Proxmox-Konfiguration beim Öffnen
  React.useEffect(() => {
    const fetchProxmoxConfig = async () => {
      try {
        const res = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/config?dashboard_id=${activeDashboard}`);
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
  }, [panelTab, activeDashboard]);

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
            redirect_uri: data.redirect_uri || SPOTIFY_REDIRECT_URI
          }));
        } else {
          // Wenn nicht konfiguriert, setze default redirect_uri
          setSpotifyConfig(prev => ({
            ...prev,
            redirect_uri: SPOTIFY_REDIRECT_URI
          }));
        }
      } catch (err) {
        console.error('Failed to load Spotify status:', err);
      }
    };

    if (panelTab === 'addons') {
      fetchSpotifyStatus();
    }
  }, [panelTab, SPOTIFY_REDIRECT_URI]);

  // Speichere Proxmox-Konfiguration
  const handleSaveProxmox = async (e) => {
    e.preventDefault();
    setIsSavingProxmox(true);

    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/config?dashboard_id=${activeDashboard}`, {
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
          redirect_uri: SPOTIFY_REDIRECT_URI
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
  
  // Verhindere Body-Scroll wenn Panel offen ist
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);
  
  return (
    <>
      {/* Backdrop with blur */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div
        className="fixed right-0 top-0 h-screen w-full md:w-[500px] bg-white/55 dark:bg-gray-900/60 backdrop-blur-2xl z-50 shadow-2xl border-l border-gray-300/50 dark:border-white/20 overflow-y-auto animate-slideInRight [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent dark:[&::-webkit-scrollbar-thumb]:bg-gray-600"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/60 dark:bg-gray-900/65 backdrop-blur-xl border-b border-gray-300/50 dark:border-white/20 px-6 py-5">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Pencil size={24} weight="duotone" className="text-blue-600 dark:text-blue-400" />
                Settings
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Verwalte dein Dashboard</p>
            </div>
            <button 
              onClick={onClose} 
              className="bg-white/70 dark:bg-white/5 backdrop-blur-md border border-gray-400/60 dark:border-white/10 p-2.5 rounded-full shadow-lg hover:shadow-xl hover:bg-white/90 dark:hover:bg-white/10 hover:border-gray-500/70 dark:hover:border-white/20 transition-all hover:scale-110 text-gray-800 dark:text-white/90 hover:text-gray-900 dark:hover:text-white"
              aria-label="Panel schließen"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Container with padding */}
        <div className="px-6 py-5">
          {/* Tab-Navigation */}
          <div className="flex gap-1 mb-8 bg-white/70 dark:bg-white/10 backdrop-blur-xl rounded-2xl p-1.5 border border-gray-400/60 dark:border-white/20 shadow-lg">
            <button
              onClick={() => setPanelTab("services")}
              className={`flex-1 py-2 px-2 transition-all duration-300 rounded-xl text-sm font-semibold ${
                panelTab === "services"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-white/10"
              }`}
            >
              Services
            </button>
            <button
              onClick={() => setPanelTab("dashboards")}
              className={`flex-1 py-2 px-2 transition-all duration-300 rounded-xl text-sm font-semibold ${
                panelTab === "dashboards"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-white/10"
              }`}
            >
              Dashboards
            </button>
            <button
              onClick={() => setPanelTab("appearance")}
              className={`flex-1 py-2 px-2 transition-all duration-300 rounded-xl text-sm font-semibold ${
                panelTab === "appearance"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-white/10"
              }`}
            >
              Appearance
            </button>
            <button
              onClick={() => setPanelTab("proxmox")}
              className={`flex-1 py-2 px-2 transition-all duration-300 rounded-xl text-sm font-semibold ${
                panelTab === "proxmox"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-white/10"
              }`}
            >
              Proxmox
            </button>
            <button
              onClick={() => setPanelTab("addons")}
              className={`flex-1 py-2 px-2 transition-all duration-300 rounded-xl text-sm font-semibold ${
                panelTab === "addons"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-white/10"
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
            className="p-6 bg-white/70 dark:bg-white/5 backdrop-blur-md shadow-xl rounded-2xl border border-gray-400/60 dark:border-white/10"
          >
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">➕</span>
              Neuen Service hinzufügen
            </h3>
            <div className="space-y-4">
              <input 
                placeholder="Name" 
                value={serviceName} 
                onChange={(e) => setServiceName(e.target.value)} 
                className="border border-gray-300 dark:border-white/20 bg-white/50 dark:bg-white/5 dark:text-white dark:placeholder-gray-400 p-3 w-full rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all"
              />
              <input 
                placeholder="Beschreibung" 
                value={serviceDesc} 
                onChange={(e) => setServiceDesc(e.target.value)} 
                className="border border-gray-300 dark:border-white/20 bg-white/50 dark:bg-white/5 dark:text-white dark:placeholder-gray-400 p-3 w-full rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all"
              />
              <input 
                placeholder="URL" 
                value={serviceUrl} 
                onChange={(e) => setServiceUrl(e.target.value)} 
                className="border border-gray-300 dark:border-white/20 bg-white/50 dark:bg-white/5 dark:text-white dark:placeholder-gray-400 p-3 w-full rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all"
              />
              <input
                placeholder="Icon URL oder Emoji ✉️"
                value={serviceIcon} 
                onChange={(e) => setServiceIcon(e.target.value)} 
                className="border border-gray-300 dark:border-white/20 bg-white/50 dark:bg-white/5 dark:text-white dark:placeholder-gray-400 p-3 w-full rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all"
              />
              <button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-semibold w-full transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
              >
                Hinzufügen
              </button>
            </div>
          </form>

          <form
            onSubmit={onAddShortcut}
            className="p-6 bg-white/70 dark:bg-white/5 backdrop-blur-md shadow-xl rounded-2xl border border-gray-400/60 dark:border-white/10"
          >
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">🔗</span>
              Neuen Shortcut hinzufügen
            </h3>
            <div className="space-y-4">
              <input 
                placeholder="Name" 
                value={shortcutName} 
                onChange={(e) => setShortcutName(e.target.value)} 
                className="border border-gray-300 dark:border-white/20 bg-white/50 dark:bg-white/5 dark:text-white dark:placeholder-gray-400 p-3 w-full rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all"
              />
              <input 
                placeholder="URL" 
                value={shortcutUrl} 
                onChange={(e) => setShortcutUrl(e.target.value)} 
                className="border border-gray-300 dark:border-white/20 bg-white/50 dark:bg-white/5 dark:text-white dark:placeholder-gray-400 p-3 w-full rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all"
              />
              <input
                placeholder="Icon URL oder Emoji 🔗"
                value={shortcutIcon}
                onChange={(e) => setShortcutIcon(e.target.value)}
                className="border border-gray-300 dark:border-white/20 bg-white/50 dark:bg-white/5 dark:text-white dark:placeholder-gray-400 p-3 w-full rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all"
              />
              <button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-semibold w-full transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
              >
                Hinzufügen
              </button>
            </div>
          </form>

          {/* Info-Hinweis für Icons */}
          <div className="p-4 bg-blue-100/70 dark:bg-blue-900/30 backdrop-blur-sm border border-blue-300/60 dark:border-blue-700/50 rounded-2xl shadow-lg">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              💡 <strong>Tipp:</strong> Icons können von{' '}
              <a
                href="https://selfh.st/icons/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-700 dark:hover:text-blue-100 font-semibold transition-colors"
              >
                selfh.st/icons
              </a>
              {' '}bezogen werden.
            </p>
          </div>
        </div>
      )}

      {/* === Tab-Inhalt: Dashboards === */}
      {panelTab === "dashboards" && (
        <div className="space-y-6">
          {/* Dashboard erstellen/bearbeiten */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setIsSavingDashboard(true);
              
              try {
                const payload = {
                  name: dashboardName.trim(),
                  description: dashboardDesc.trim() || null,
                  type: dashboardType,
                  show_proxmox: dashboardShowProxmox
                };
                
                if (editingDashboard) {
                  // Update existing
                  const res = await authenticatedFetch(
                    `${BACKEND_URL}/api/dashboards/${editingDashboard.id}`,
                    {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ ...payload, is_active: editingDashboard.is_active })
                    }
                  );
                  
                  if (!res.ok) throw new Error('Update failed');
                } else {
                  // Create new
                  const res = await authenticatedFetch(
                    `${BACKEND_URL}/api/dashboards`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload)
                    }
                  );
                  
                  if (!res.ok) throw new Error('Create failed');
                }
                
                // Refresh dashboard list FIRST
                await onDashboardsChange();
                
                // Then success cleanup
                setDashboardName('');
                setDashboardDesc('');
                setDashboardType('default');
                setDashboardShowProxmox(true);
                setEditingDashboard(null);
                setDashboardSaved(true);
                setTimeout(() => setDashboardSaved(false), 2000);
              } catch (err) {
                console.error('Dashboard save error:', err);
                alert('Fehler beim Speichern des Dashboards');
              } finally {
                setIsSavingDashboard(false);
              }
            }}
            className="p-6 bg-white/70 dark:bg-white/5 backdrop-blur-md shadow-xl rounded-2xl border border-gray-400/60 dark:border-white/10"
          >
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">{editingDashboard ? '✏️' : '➕'}</span>
              {editingDashboard ? 'Dashboard bearbeiten' : 'Neues Dashboard erstellen'}
            </h3>
            <div className="space-y-4">
              <input
                placeholder="Dashboard Name (z.B. Work, Home, Gaming)"
                value={dashboardName}
                onChange={(e) => setDashboardName(e.target.value)}
                required
                maxLength={100}
                className="border border-gray-300 dark:border-white/20 bg-white/50 dark:bg-white/5 dark:text-white dark:placeholder-gray-400 p-3 w-full rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all"
              />
              <textarea
                placeholder="Beschreibung (optional)"
                value={dashboardDesc}
                onChange={(e) => setDashboardDesc(e.target.value)}
                maxLength={500}
                rows={2}
                className="border border-gray-300 dark:border-white/20 bg-white/50 dark:bg-white/5 dark:text-white dark:placeholder-gray-400 p-3 w-full rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all resize-none"
              />
              <select
                value={dashboardType}
                onChange={(e) => setDashboardType(e.target.value)}
                className="border border-gray-400/70 dark:border-white/30 bg-white/70 dark:bg-slate-700/80 text-gray-900 dark:text-white p-3.5 w-full rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-md transition-all shadow-lg hover:shadow-xl cursor-pointer font-medium [&>option]:bg-white [&>option]:dark:bg-slate-800 [&>option]:text-gray-900 [&>option]:dark:text-white [&>option]:py-2"
              >
                <option value="default">Standard</option>
                <option value="work">Arbeit</option>
                <option value="home">Zuhause</option>
                <option value="gaming">Gaming</option>
                <option value="media">Media</option>
                <option value="dev">Development</option>
              </select>

              <label className="flex items-center gap-3 cursor-pointer p-3 border-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700/50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20 border-gray-300 dark:border-gray-600">
                <input
                  type="checkbox"
                  checked={dashboardShowProxmox}
                  onChange={(e) => setDashboardShowProxmox(e.target.checked)}
                  className="appearance-none w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded-full bg-transparent checked:bg-transparent checked:border-gray-300 dark:checked:border-gray-600 relative checked:before:content-[''] checked:before:absolute checked:before:top-1/2 checked:before:left-1/2 checked:before:transform checked:before:-translate-x-1/2 checked:before:-translate-y-1/2 checked:before:w-2 checked:before:h-2 checked:before:bg-blue-600 checked:before:rounded-full focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-2xl flex-shrink-0">🖥️</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Proxmox Monitoring Tab</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Zeige Proxmox Monitoring in der Navigation</div>
                </div>
              </label>
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSavingDashboard || !dashboardName.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
                >
                  {isSavingDashboard ? 'Speichere...' : (editingDashboard ? 'Aktualisieren' : 'Erstellen')}
                </button>
                
                {editingDashboard && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDashboard(null);
                      setDashboardName('');
                      setDashboardDesc('');
                      setDashboardType('default');
                      setDashboardShowProxmox(true);
                    }}
                    className="px-6 bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-xl font-semibold transition-all"
                  >
                    Abbrechen
                  </button>
                )}
              </div>
              
              {dashboardSaved && (
                <div className="text-green-600 dark:text-green-400 font-medium text-center">
                  ✓ Dashboard gespeichert!
                </div>
              )}
            </div>
          </form>

          {/* Dashboard Liste */}
          <div className="p-6 bg-white/70 dark:bg-white/5 backdrop-blur-md shadow-xl rounded-2xl border border-gray-400/60 dark:border-white/10">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📋</span>
              Meine Dashboards
            </h3>
            
            {dashboards && dashboards.length > 0 ? (
              <div className="space-y-3">
                {dashboards.map(dashboard => (
                  <div
                    key={dashboard.id}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      dashboard.id === activeDashboard
                        ? 'bg-blue-100/70 dark:bg-blue-900/30 border-blue-500'
                        : 'bg-white/50 dark:bg-white/5 border-gray-300 dark:border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {dashboard.name}
                          </h4>
                          {dashboard.id === activeDashboard && (
                            <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-medium">
                              Aktiv
                            </span>
                          )}
                          {dashboard.id === 1 && (
                            <span className="text-xs bg-gray-500 text-white px-2 py-0.5 rounded-full font-medium">
                              Standard
                            </span>
                          )}
                        </div>
                        {dashboard.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {dashboard.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>📦 {dashboard.service_count} Services</span>
                          <span>🔗 {dashboard.shortcut_count} Shortcuts</span>
                          <span className="capitalize">🏷️ {dashboard.type}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => {
                            setEditingDashboard(dashboard);
                            setDashboardName(dashboard.name);
                            setDashboardDesc(dashboard.description || '');
                            setDashboardType(dashboard.type || 'default');
                            setDashboardShowProxmox(dashboard.show_proxmox !== undefined ? dashboard.show_proxmox : true);
                          }}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="Bearbeiten"
                        >
                          <Pencil className="w-5 h-5" weight="bold" />
                        </button>
                        
                        {dashboard.id !== 1 && ( // Cannot delete default dashboard
                          <button
                            onClick={async () => {
                              if (!confirm(`Dashboard "${dashboard.name}" wirklich löschen?\n\nAlle Services und Shortcuts in diesem Dashboard werden ebenfalls gelöscht!`)) {
                                return;
                              }
                              
                              try {
                                const res = await authenticatedFetch(
                                  `${BACKEND_URL}/api/dashboards/${dashboard.id}`,
                                  { method: 'DELETE' }
                                );
                                
                                if (!res.ok) throw new Error('Delete failed');
                                
                                onDashboardsChange(); // Refresh
                              } catch (err) {
                                console.error('Dashboard delete error:', err);
                                alert('Fehler beim Löschen des Dashboards');
                              }
                            }}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Löschen"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                Noch keine Dashboards vorhanden.
              </p>
            )}
          </div>

          {/* Info-Hinweis */}
          <div className="p-4 bg-blue-100/70 dark:bg-blue-900/30 backdrop-blur-sm border border-blue-300/60 dark:border-blue-700/50 rounded-2xl shadow-lg">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              💡 <strong>Tipp:</strong> Erstelle verschiedene Dashboards für unterschiedliche Kontexte (Arbeit, Privat, Projekte). Services und Shortcuts können dann spezifisch einem Dashboard zugeordnet werden.
            </p>
          </div>
        </div>
      )}

      {/* === Tab-Inhalt: Appearance === */}
      {panelTab === "appearance" && (
        <div className="space-y-6">
          
          {/* Sektion: Hintergrund */}
          <div className="space-y-4 p-6 bg-white/70 dark:bg-white/5 backdrop-blur-md shadow-xl rounded-2xl border border-gray-400/60 dark:border-white/10">
            <h4 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center gap-2 mb-4">
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
                  className="w-16 h-12 p-1 border border-gray-300 dark:border-white/20 rounded-xl cursor-pointer bg-white/50 dark:bg-white/5 backdrop-blur-sm"
                />
                <input
                  type="text"
                  value={editAppearance.bg_color || "#ffffff"}
                  onChange={(e) => setEditAppearance({ ...editAppearance, bg_color: e.target.value })}
                  className="flex-1 border border-gray-300 dark:border-white/20 bg-white/50 dark:bg-white/5 dark:text-white p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono backdrop-blur-sm transition-all"
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
                className="border border-gray-300 dark:border-white/20 bg-white/50 dark:bg-white/5 dark:text-white dark:placeholder-gray-400 p-3 w-full rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all"
              />
            </div>
            
            <div>
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              <p className="text-sm text-blue-800 dark:text-blue-300">
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
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-3">
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
                    <div className="text-sm text-gray-500 dark:text-gray-400">14:30:45</div>
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
                    <div className="text-sm text-gray-500 dark:text-gray-400">2:30:45 PM</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* NEU: Sektion: Widget Sichtbarkeit */}
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              🎛️ Widget Sichtbarkeit
            </h4>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer p-3 border-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700/50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20 border-gray-300 dark:border-gray-600">
                <input
                  type="checkbox"
                  checked={editAppearance.show_spotify ?? true}
                  onChange={(e) => setEditAppearance({ ...editAppearance, show_spotify: e.target.checked })}
                  className="appearance-none w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded-full bg-transparent checked:bg-transparent checked:border-gray-300 dark:checked:border-gray-600 relative checked:before:content-[''] checked:before:absolute checked:before:top-1/2 checked:before:left-1/2 checked:before:transform checked:before:-translate-x-1/2 checked:before:-translate-y-1/2 checked:before:w-2 checked:before:h-2 checked:before:bg-blue-600 checked:before:rounded-full focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-2xl flex-shrink-0">🎵</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Spotify Widget</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Zeige aktuell abgespielte Musik</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 border-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700/50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20 border-gray-300 dark:border-gray-600">
                <input
                  type="checkbox"
                  checked={editAppearance.show_weather ?? true}
                  onChange={(e) => setEditAppearance({ ...editAppearance, show_weather: e.target.checked })}
                  className="appearance-none w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded-full bg-transparent checked:bg-transparent checked:border-gray-300 dark:checked:border-gray-600 relative checked:before:content-[''] checked:before:absolute checked:before:top-1/2 checked:before:left-1/2 checked:before:transform checked:before:-translate-x-1/2 checked:before:-translate-y-1/2 checked:before:w-2 checked:before:h-2 checked:before:bg-blue-600 checked:before:rounded-full focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-2xl flex-shrink-0">🌤️</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Wetter Widget</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Zeige Wetterinformationen</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 border-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700/50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20 border-gray-300 dark:border-gray-600">
                <input
                  type="checkbox"
                  checked={editAppearance.show_clock ?? true}
                  onChange={(e) => setEditAppearance({ ...editAppearance, show_clock: e.target.checked })}
                  className="appearance-none w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded-full bg-transparent checked:bg-transparent checked:border-gray-300 dark:checked:border-gray-600 relative checked:before:content-[''] checked:before:absolute checked:before:top-1/2 checked:before:left-1/2 checked:before:transform checked:before:-translate-x-1/2 checked:before:-translate-y-1/2 checked:before:w-2 checked:before:h-2 checked:before:bg-blue-600 checked:before:rounded-full focus:ring-2 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-2xl flex-shrink-0">🕐</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Uhr Widget</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Zeige aktuelle Uhrzeit und Datum</div>
                </div>
              </label>
            </div>
          </div>

          {/* Sektion: Wetter */}
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              🌤️ Wetter-Widget
            </h4>
            
            <div>
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                <div className="mt-2 text-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-900/30 rounded px-2 py-1">
                  <span className="font-semibold">Gefundener Ort:</span> {weatherLocationInfo.name}, {weatherLocationInfo.country}
                  {weatherLocationInfo.postal_code ? `, PLZ: ${weatherLocationInfo.postal_code}` : ''}
                  {typeof weatherLocationInfo.latitude === 'number' && typeof weatherLocationInfo.longitude === 'number' ?
                    `, (${weatherLocationInfo.latitude.toFixed(4)}, ${weatherLocationInfo.longitude.toFixed(4)})`
                    : ''}
                </div>
              )}
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Wetterdaten werden alle 2 Stunden automatisch aktualisiert und zwischengespeichert (Cache).
                Manuelle Aktualisierung ist jederzeit per Button im Widget möglich.
              </p>
            </div>

            {/* Wetterdaten Felder Auswahl */}
            <div>
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-3">
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
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Erstelle den Token in Proxmox unter: <strong>Datacenter → Permissions → API Tokens</strong>
            </p>
          </div>

          <form onSubmit={handleSaveProxmox} className="space-y-4">
            {/* Proxmox Host */}
            <div>
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
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
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Der Secret wird nur beim ersten Einrichten oder beim Ändern benötigt
              </p>
            </div>

            {/* Node (Optional) */}
            <div>
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                Node Name (optional)
              </label>
              <input
                type="text"
                value={proxmoxConfig.node}
                onChange={(e) => setProxmoxConfig({ ...proxmoxConfig, node: e.target.value })}
                placeholder="z.B. pve oder leer für alle Nodes"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
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
            <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2 ml-1">
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
                  <span className="px-3 py-1 bg-white text-green-600 text-sm font-semibold rounded-full">
                    ✓ Verbunden
                  </span>
                ) : spotifyStatus.configured ? (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-semibold rounded-full">
                    Konfiguriert
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-semibold rounded-full">
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
                    <ol className="text-sm text-blue-600 dark:text-blue-400 list-decimal list-inside space-y-1">
                      <li>Erstelle eine neue App im Spotify Developer Dashboard</li>
                      <li>Kopiere Client ID und Client Secret</li>
                      <li className="break-words">
                        Füge die Redirect URI hinzu: 
                        <code className="bg-blue-100 dark:bg-blue-800 px-1.5 py-0.5 rounded text-[11px] block mt-1 w-fit">
                          {SPOTIFY_REDIRECT_URI}
                        </code>
                      </li>
                      <li>Trage die Daten unten ein und speichere</li>
                    </ol>
                  </div>

                  <div>
                    <label className="block text-base font-semibold text-gray-700 dark:text-gray-200 mb-2">
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
                    <label className="block text-base font-semibold text-gray-700 dark:text-gray-200 mb-2">
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
                    <label className="block text-base font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Redirect URI
                    </label>
                    <input
                      type="text"
                      value={spotifyConfig.redirect_uri}
                      onChange={(e) => setSpotifyConfig({ ...spotifyConfig, redirect_uri: e.target.value })}
                      required
                      placeholder={SPOTIFY_REDIRECT_URI}
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
                      <p className="text-sm text-gray-500 dark:text-gray-400">Client ID</p>
                      <p className="text-sm font-mono text-gray-800 dark:text-gray-200 truncate">
                        {spotifyStatus.client_id}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
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
              <div className="mt-6 p-4 bg-white/70 dark:bg-white/5 backdrop-blur-sm border border-gray-300/60 dark:border-white/10 rounded-2xl shadow-lg">
                <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                  🔒 Sicherheit
                </h5>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Client Secret und Access Tokens werden verschlüsselt gespeichert. 
                  Spotify hat nur Lesezugriff auf deine aktuell abgespielte Musik.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </>
  );
}

export default SettingsPanel;