import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plug } from 'phosphor-react';
import { authenticatedFetch } from '../../utils/auth';
import ConfigAddon from './ConfigAddon';
import SpotifyAddon from './SpotifyAddon';
import LdapAddon from './LdapAddon';
import SettingsModalShell from './SettingsModalShell';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
  (window.location.port === '' ? 
    `${window.location.protocol}//${window.location.hostname}` :
    `${window.location.protocol}//${window.location.hostname}:8000`
  );

const SPOTIFY_REDIRECT_URI = window.location.protocol === 'https:' 
  ? `https://${window.location.hostname}/api/spotify/callback`
  : 'http://127.0.0.1:8000/api/spotify/callback';

async function broadcastAuthModeFromServer() {
  try {
    const modeRes = await fetch(`${BACKEND_URL}/api/auth/mode`);
    if (modeRes.ok) {
      window.dispatchEvent(new CustomEvent('servicedock-auth-mode', { detail: await modeRes.json() }));
    }
  } catch {
    /* ignore */
  }
}

function AddOnsCard() {
  const { t } = useTranslation();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showSpotifyModal, setShowSpotifyModal] = useState(false);
  const [showLdapModal, setShowLdapModal] = useState(false);

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

  // LDAP/AD State
  const [ldapConfig, setLdapConfig] = useState({
    enabled: false,
    host: '',
    port: 389,
    use_ssl: false,
    use_starttls: false,
    base_dn: '',
    user_search_base: '',
    bind_dn: '',
    bind_password: '',
    user_attribute: 'sAMAccountName',
    domain: '',
    admin_group_dn: '',
    viewer_group_dn: '',
  });
  const [ldapStatus, setLdapStatus] = useState({
    configured: false,
    enabled: false,
    has_bind_password: false,
  });
  const [isSavingLdap, setIsSavingLdap] = useState(false);
  const [ldapSaved, setLdapSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

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

  // Lade LDAP Status
  useEffect(() => {
    const fetchLdapStatus = async () => {
      try {
        const res = await authenticatedFetch(`${BACKEND_URL}/api/ldap/config`);
        const data = await res.json();
        if (data.host) {
          setLdapConfig(prev => ({
            ...prev,
            enabled: data.enabled,
            host: data.host || '',
            port: data.port || 389,
            use_ssl: data.use_ssl || false,
            use_starttls: data.use_starttls || false,
            base_dn: data.base_dn || '',
            user_search_base: data.user_search_base || '',
            bind_dn: data.bind_dn || '',
            bind_password: '', // Wird nie zurückgegeben
            user_attribute: data.user_attribute || 'sAMAccountName',
            domain: data.domain || '',
            admin_group_dn: data.admin_group_dn || '',
            viewer_group_dn: data.viewer_group_dn || '',
          }));
          setLdapStatus({
            configured: true,
            enabled: data.enabled,
            has_bind_password: data.has_bind_password,
          });
        }
      } catch (err) {
        console.error('Failed to load LDAP config:', err);
      }
    };
    fetchLdapStatus();
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
        alert(error.detail || t('addons.spotify_save_error'));
      }
    } catch (err) {
      console.error('Failed to save Spotify config:', err);
      alert(t('addons.spotify_save_error'));
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
            alert(t('addons.spotify_connected'));
          }
        }, 3000);
        setTimeout(() => clearInterval(pollInterval), 120000);
      }
    } catch (err) {
      console.error('Failed to get Spotify auth URL:', err);
      alert(t('addons.spotify_connect_error'));
    }
  };

  const handleUninstallSpotify = async () => {
    if (!confirm(t('addons.spotify_remove_confirm'))) return;
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/spotify/uninstall`, { method: 'DELETE' });
      if (res.ok) {
        setSpotifyStatus({ configured: false, connected: false });
        setSpotifyConfig({ client_id: '', client_secret: '', redirect_uri: SPOTIFY_REDIRECT_URI });
        alert(t('addons.spotify_removed'));
      } else {
        alert(t('addons.spotify_remove_error'));
      }
    } catch (err) {
      console.error('Failed to uninstall Spotify:', err);
      alert(t('addons.spotify_remove_error'));
    }
  };

  // --- LDAP Handlers ---
  const handleSaveLdap = async (e) => {
    e.preventDefault();
    setIsSavingLdap(true);
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/ldap/config`, {
        method: 'PUT',
        body: JSON.stringify(ldapConfig),
      });
      if (res.ok) {
        const data = await res.json();
        setLdapSaved(true);
        setTimeout(() => setLdapSaved(false), 2000);
        setLdapStatus({
          configured: true,
          enabled: data.enabled,
          has_bind_password: data.has_bind_password,
        });
        void broadcastAuthModeFromServer();
      } else {
        const error = await res.json();
        alert(error.detail || t('addons.ldap_save_error'));
      }
    } catch (err) {
      console.error('Failed to save LDAP config:', err);
      alert(t('addons.ldap_save_error'));
    } finally {
      setIsSavingLdap(false);
    }
  };

  const handleTestLdap = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const testData = {
        host: ldapConfig.host,
        port: ldapConfig.port,
        use_ssl: ldapConfig.use_ssl,
        use_starttls: ldapConfig.use_starttls,
        base_dn: ldapConfig.base_dn,
        user_search_base: ldapConfig.user_search_base || null,
        bind_dn: ldapConfig.bind_dn || null,
        bind_password: ldapConfig.bind_password || null,
        admin_group_dn: ldapConfig.admin_group_dn || null,
        viewer_group_dn: ldapConfig.viewer_group_dn || null,
      };
      const res = await authenticatedFetch(`${BACKEND_URL}/api/ldap/test`, {
        method: 'POST',
        body: JSON.stringify(testData),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      console.error('Failed to test LDAP:', err);
      setTestResult({ success: false, message: t('addons.ldap_test_error') });
    } finally {
      setIsTesting(false);
    }
  };

  const handleUninstallLdap = async () => {
    if (!confirm(t('addons.ldap_remove_confirm'))) return;
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/ldap/config`, { method: 'DELETE' });
      if (res.ok) {
        setLdapStatus({ configured: false, enabled: false, has_bind_password: false });
        setLdapConfig({
          enabled: false, host: '', port: 389, use_ssl: false, use_starttls: false,
          base_dn: '', user_search_base: '', bind_dn: '', bind_password: '',
          user_attribute: 'sAMAccountName', domain: '', admin_group_dn: '', viewer_group_dn: '',
        });
        setTestResult(null);
        void broadcastAuthModeFromServer();
        alert(t('addons.ldap_removed'));
      } else {
        alert(t('addons.ldap_remove_error'));
      }
    } catch (err) {
      console.error('Failed to uninstall LDAP:', err);
      alert(t('addons.ldap_remove_error'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1 flex items-center gap-2.5" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
          <Plug size={22} weight="duotone" className="text-green-400" />
          {t('addons.title')}
        </h3>
        <p className="text-gray-700 dark:text-gray-300 text-sm" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6), 0 0 8px rgba(255,255,255,0.5)' }}>
          {t('addons.description')}
        </p>
      </div>

      {/* Config — gleiche Flächen-Farbe wie LDAP-Karte (nur Icon/Tags bleiben blau) */}
      <div
        className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.01] backdrop-blur-xl p-6
          bg-gradient-to-br from-violet-200/38 via-slate-200/58 to-indigo-200/42
          dark:from-indigo-950/64 dark:via-slate-900/74 dark:to-slate-950/82
          ring-1 ring-inset ring-violet-300/35 dark:ring-indigo-400/18
          shadow-lg shadow-violet-900/[0.06] dark:shadow-black/30
          hover:ring-violet-400/45 dark:hover:ring-indigo-300/28 hover:shadow-xl"
        onClick={() => setShowConfigModal(true)}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <span className="text-3xl">⚙️</span>
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('addons.config_title')}</h4>
              <p className="text-sm text-gray-600 dark:text-slate-300">{t('addons.config_subtitle')}</p>
            </div>
          </div>
          <div className="text-2xl text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">→</div>
        </div>
        <p className="text-sm text-gray-700 dark:text-slate-200/95 mb-4">
          {t('addons.config_description')}
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-500/12 dark:bg-blue-400/15 text-blue-800 dark:text-blue-200">📥 Export</span>
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-500/12 dark:bg-blue-400/15 text-blue-800 dark:text-blue-200">📤 Import</span>
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-500/12 dark:bg-blue-400/15 text-blue-800 dark:text-blue-200">🔒 Admin-only</span>
        </div>
      </div>

      {/* Spotify */}
      <div
        className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.01] backdrop-blur-xl p-6
          bg-gradient-to-br from-emerald-200/40 via-slate-200/58 to-teal-200/42
          dark:from-emerald-950/55 dark:via-slate-900/72 dark:to-slate-950/80
          ring-1 ring-inset ring-emerald-300/35 dark:ring-emerald-400/18
          shadow-lg shadow-emerald-900/[0.06] dark:shadow-black/30
          hover:ring-emerald-400/45 dark:hover:ring-emerald-300/28 hover:shadow-xl"
        onClick={() => setShowSpotifyModal(true)}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <span className="text-3xl">🎵</span>
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('addons.spotify_title')}</h4>
              <p className="text-sm text-gray-600 dark:text-slate-300">{t('addons.spotify_subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {spotifyStatus.connected ? (
              <span className="px-3 py-1 bg-green-500/15 dark:bg-green-400/20 text-green-800 dark:text-green-200 text-sm font-semibold rounded-full">
                {t('addons.connected')}
              </span>
            ) : spotifyStatus.configured ? (
              <span className="px-3 py-1 bg-amber-500/15 dark:bg-amber-400/18 text-amber-900 dark:text-amber-200 text-sm font-semibold rounded-full">
                {t('addons.configured')}
              </span>
            ) : (
              <span className="px-3 py-1 bg-white/40 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-full">
                {t('addons.not_installed')}
              </span>
            )}
            <div className="text-2xl text-green-600 dark:text-green-400 group-hover:translate-x-1 transition-transform">→</div>
          </div>
        </div>
        <p className="text-sm text-gray-700 dark:text-slate-200/95 mb-4">
          {t('addons.spotify_description')}
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/12 dark:bg-emerald-400/15 text-emerald-900 dark:text-emerald-200">🎵 Widget</span>
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/12 dark:bg-emerald-400/15 text-emerald-900 dark:text-emerald-200">🔗 OAuth</span>
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/12 dark:bg-emerald-400/15 text-emerald-900 dark:text-emerald-200">🔒 Encrypted</span>
        </div>
      </div>

      {/* LDAP */}
      <div
        className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.01] backdrop-blur-xl p-6
          bg-gradient-to-br from-violet-200/38 via-slate-200/58 to-indigo-200/42
          dark:from-indigo-950/64 dark:via-slate-900/74 dark:to-slate-950/82
          ring-1 ring-inset ring-violet-300/35 dark:ring-indigo-400/18
          shadow-lg shadow-violet-900/[0.06] dark:shadow-black/30
          hover:ring-violet-400/45 dark:hover:ring-indigo-300/28 hover:shadow-xl"
        onClick={() => setShowLdapModal(true)}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <span className="text-3xl">🔐</span>
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('addons.ldap_title')}</h4>
              <p className="text-sm text-gray-600 dark:text-slate-300">{t('addons.ldap_subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {ldapStatus.enabled ? (
              <span className="px-3 py-1 bg-blue-500/15 dark:bg-blue-400/20 text-blue-800 dark:text-blue-200 text-sm font-semibold rounded-full">
                {t('addons.active')}
              </span>
            ) : ldapStatus.configured ? (
              <span className="px-3 py-1 bg-amber-500/15 dark:bg-amber-400/18 text-amber-900 dark:text-amber-200 text-sm font-semibold rounded-full">
                {t('addons.configured')}
              </span>
            ) : (
              <span className="px-3 py-1 bg-white/40 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-full">
                {t('addons.not_installed')}
              </span>
            )}
            <div className="text-2xl text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">→</div>
          </div>
        </div>
        <p className="text-sm text-gray-700 dark:text-slate-200/95 mb-4">
          {t('addons.ldap_description')}
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-indigo-500/12 dark:bg-indigo-400/15 text-indigo-900 dark:text-indigo-200">{t('addons.ldap_tag_ad')}</span>
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-indigo-500/12 dark:bg-indigo-400/15 text-indigo-900 dark:text-indigo-200">{t('addons.ldap_tag_roles')}</span>
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-indigo-500/12 dark:bg-indigo-400/15 text-indigo-900 dark:text-indigo-200">🔒 Encrypted</span>
        </div>
      </div>

      <SettingsModalShell
        open={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title={t('addons.config_title')}
        subtitle={t('addons.config_subtitle')}
        icon={
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shrink-0">
            <span className="text-2xl">⚙️</span>
          </div>
        }
      >
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
          onClose={() => setShowConfigModal(false)}
          isModal={true}
        />
      </SettingsModalShell>

      <SettingsModalShell
        open={showSpotifyModal}
        onClose={() => setShowSpotifyModal(false)}
        title={t('addons.spotify_title')}
        subtitle={t('addons.spotify_subtitle')}
        icon={
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shrink-0">
            <span className="text-2xl">🎵</span>
          </div>
        }
      >
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
          onClose={() => setShowSpotifyModal(false)}
          isModal={true}
        />
      </SettingsModalShell>

      <SettingsModalShell
        open={showLdapModal}
        onClose={() => setShowLdapModal(false)}
        title={t('addons.ldap_title')}
        subtitle={t('addons.ldap_subtitle')}
        icon={
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shrink-0">
            <span className="text-2xl">🔐</span>
          </div>
        }
      >
        <LdapAddon
          BACKEND_URL={BACKEND_URL}
          ldapConfig={ldapConfig}
          setLdapConfig={setLdapConfig}
          ldapStatus={ldapStatus}
          isSavingLdap={isSavingLdap}
          ldapSaved={ldapSaved}
          handleSaveLdap={handleSaveLdap}
          handleTestLdap={handleTestLdap}
          handleUninstallLdap={handleUninstallLdap}
          testResult={testResult}
          isTesting={isTesting}
          onClose={() => setShowLdapModal(false)}
          isModal={true}
        />
      </SettingsModalShell>
    </div>
  );
}

export default AddOnsCard;
