import React from 'react';
import { Pencil } from 'phosphor-react';
import { authenticatedFetch } from '../utils/auth';
import ConfigAddon from './settings/ConfigAddon';
import SpotifyAddon from './settings/SpotifyAddon';
import AppearanceTab from './settings/AppearanceTab';
import ProxmoxTab from './settings/ProxmoxTab';

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
    node: '',
    is_cluster: false
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

  // NEU: State für Config Import/Export
  const [showConfigPage, setShowConfigPage] = React.useState(false);
  const [importMode, setImportMode] = React.useState('append');
  const [importFile, setImportFile] = React.useState(null);
  const [importPreview, setImportPreview] = React.useState(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importSuccess, setImportSuccess] = React.useState(false);
  const [importError, setImportError] = React.useState(null);

  // NEU: State für Spotify AddOn Seite
  const [showSpotifyPage, setShowSpotifyPage] = React.useState(false);

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
            node: data.node || '',
            is_cluster: data.is_cluster || false
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
        
        // Teste die Verbindung nach dem Speichern
        try {
          const testRes = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/test?dashboard_id=${activeDashboard}`, {
            method: 'POST'
          });
          const testData = await testRes.json();
          
          if (testData.success) {
            const nodeInfo = testData.nodes ? ` (${testData.nodes.length} Node(s) gefunden: ${testData.nodes.join(', ')})` : '';
            alert(`✓ Konfiguration gespeichert und Verbindung erfolgreich getestet!${nodeInfo}`);
          } else {
            alert(`⚠️ Konfiguration gespeichert, aber Verbindungstest fehlgeschlagen:\n\n${testData.error}\n\nBitte überprüfe die Einstellungen.`);
          }
        } catch (testErr) {
          console.error('Connection test failed:', testErr);
          alert('⚠️ Konfiguration gespeichert, aber Verbindungstest konnte nicht durchgeführt werden.');
        }
        
        setTimeout(() => setProxmoxSaved(false), 3000);
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
        <AppearanceTab
          editAppearance={editAppearance}
          setEditAppearance={setEditAppearance}
          currentTheme={currentTheme}
          weatherLocationInfo={weatherLocationInfo}
          isSavingAppearance={isSavingAppearance}
          showSaved={showSaved}
          onSaveAppearance={onSaveAppearance}
        />
      )}

      {/* === Tab-Inhalt: Proxmox === */}
      {panelTab === "proxmox" && (
        <ProxmoxTab
          proxmoxConfig={proxmoxConfig}
          setProxmoxConfig={setProxmoxConfig}
          savedTokenName={savedTokenName}
          isSavingProxmox={isSavingProxmox}
          proxmoxSaved={proxmoxSaved}
          handleSaveProxmox={handleSaveProxmox}
        />
      )}

      {/* === Tab-Inhalt: AddOns === */}
      {panelTab === "addons" && (
        <div className="space-y-6">
          {!showConfigPage && !showSpotifyPage ? (
            /* AddOns Übersicht */
            <>
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                  🧩 AddOns verwalten
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                  Erweitere dein Dashboard mit zusätzlichen Integrationen
                </p>
              </div>

              {/* Config Import/Export Card */}
              <div 
                className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                onClick={() => setShowConfigPage(true)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-blue-400/10 to-transparent dark:from-blue-400/30 dark:via-blue-500/20 dark:to-transparent" />
                <div className="relative backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-white/10 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <span className="text-3xl">⚙️</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Config Import/Export</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Dashboard Konfiguration sichern</p>
                      </div>
                    </div>
                    <div className="text-2xl text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">→</div>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                    Exportiere und importiere deine Dashboard-Konfiguration als JSON-Datei.
                  </p>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">📥 Export</span>
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">📤 Import</span>
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">🔒 Admin-only</span>
                  </div>
                </div>
              </div>

              {/* Spotify AddOn Card */}
              <div 
                className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                onClick={() => setShowSpotifyPage(true)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-green-400/10 to-transparent dark:from-green-400/30 dark:via-green-500/20 dark:to-transparent" />
                <div className="relative backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-white/10 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <span className="text-3xl">🎵</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Spotify</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Now Playing Widget</p>
                      </div>
                    </div>
                    <div>
                      {spotifyStatus.connected ? (
                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-semibold rounded-full">
                          ✓ Verbunden
                        </span>
                      ) : spotifyStatus.configured ? (
                        <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-sm font-semibold rounded-full">
                          Konfiguriert
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 text-sm font-semibold rounded-full">
                          Nicht installiert
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                    Zeige aktuell abgespielte Musik direkt auf deinem Dashboard.
                  </p>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">🎵 Widget</span>
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">🔗 OAuth</span>
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">🔒 Encrypted</span>
                  </div>
                </div>
              </div>
            </>
          ) : showConfigPage ? (
            /* Config Import/Export Seite */
            <ConfigAddon 
              BACKEND_URL={BACKEND_URL}
              importMode={importMode}
              setImportMode={setImportMode}
              importFile={importFile}
              setImportFile={setImportFile}
              importPreview={importPreview}
              setImportPreview={setImportPreview}
              isImporting={isImporting}
              setIsImporting={setIsImporting}
              importSuccess={importSuccess}
              setImportSuccess={setImportSuccess}
              importError={importError}
              setImportError={setImportError}
              onBack={() => setShowConfigPage(false)}
            />
          ) : showSpotifyPage ? (
            /* Spotify AddOn Seite */
            <>
              <button
                onClick={() => setShowSpotifyPage(false)}
                className="mb-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-300/50 dark:border-white/10 rounded-lg hover:bg-gray-100/70 dark:hover:bg-gray-700/70 transition-colors"
              >
                <span>←</span> Zurück zu AddOns
              </button>
              <SpotifyAddon
                BACKEND_URL={BACKEND_URL}
                SPOTIFY_REDIRECT_URI={SPOTIFY_REDIRECT_URI}
                spotifyConfig={spotifyConfig}
                setSpotifyConfig={setSpotifyConfig}
                spotifyStatus={spotifyStatus}
                isSavingSpotify={isSavingSpotify}
                spotifySaved={spotifySaved}
                handleSaveSpotify={handleSaveSpotify}
                handleConnectSpotify={handleConnectSpotify}
                handleUninstallSpotify={handleUninstallSpotify}
              />
            </>
          ) : null}
        </div>
      )}
        </div>
      </div>
    </>
  );
}

export default SettingsPanel;