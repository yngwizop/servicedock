import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/auth';
import ConfigAddon from './ConfigAddon';
import SpotifyAddon from './SpotifyAddon';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
  (window.location.port === '' ? 
    `${window.location.protocol}//${window.location.hostname}` :
    `${window.location.protocol}//${window.location.hostname}:8000`
  );

const SPOTIFY_REDIRECT_URI = window.location.protocol === 'https:' 
  ? `https://${window.location.hostname}/api/spotify/callback`
  : 'http://127.0.0.1:8000/api/spotify/callback';

function AddOnsCard() {
  const [showConfigPage, setShowConfigPage] = useState(false);
  const [showSpotifyPage, setShowSpotifyPage] = useState(false);

  // Config Import/Export State
  const [importMode, setImportMode] = useState('append');
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState(null);

  // Spotify State
  const [spotifyConfig, setSpotifyConfig] = useState({
    client_id: '',
    client_secret: '',
    redirect_uri: SPOTIFY_REDIRECT_URI
  });
  const [spotifyStatus, setSpotifyStatus] = useState({
    configured: false,
    connected: false
  });
  const [isSavingSpotify, setIsSavingSpotify] = useState(false);
  const [spotifySaved, setSpotifySaved] = useState(false);

  // Lade Spotify Status
  useEffect(() => {
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
        }
      } catch (err) {
        console.error('Failed to load Spotify status:', err);
      }
    };
    fetchSpotifyStatus();
  }, []);

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

  const handleConnectSpotify = async () => {
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/spotify/auth-url`);
      const data = await res.json();
      if (data.auth_url) {
        window.open(data.auth_url, '_blank');
        const pollInterval = setInterval(async () => {
          const statusRes = await authenticatedFetch(`${BACKEND_URL}/api/spotify/status`);
          const statusData = await statusRes.json();
          if (statusData.connected) {
            setSpotifyStatus(statusData);
            clearInterval(pollInterval);
            alert('Spotify erfolgreich verbunden!');
          }
        }, 3000);
        setTimeout(() => clearInterval(pollInterval), 120000);
      }
    } catch (err) {
      console.error('Failed to get Spotify auth URL:', err);
      alert('Fehler beim Starten der Spotify-Verbindung');
    }
  };

  const handleUninstallSpotify = async () => {
    if (!confirm('Möchten Sie Spotify wirklich entfernen? Alle Daten werden gelöscht.')) return;
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/spotify/uninstall`, { method: 'DELETE' });
      if (res.ok) {
        setSpotifyStatus({ configured: false, connected: false });
        setSpotifyConfig({ client_id: '', client_secret: '', redirect_uri: SPOTIFY_REDIRECT_URI });
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
    <div className="space-y-6">
      {!showConfigPage && !showSpotifyPage ? (
        <>
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
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
            <div className="relative backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-white/10 p-6">
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
            <div className="relative backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-white/10 p-6">
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
  );
}

export default AddOnsCard;
