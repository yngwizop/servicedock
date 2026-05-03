import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plug } from 'phosphor-react';
import { authenticatedFetch } from '../../utils/auth';
import ConfigAddon from './ConfigAddon';
import SpotifyAddon from './SpotifyAddon';
import LdapAddon from './LdapAddon';
import SettingsModalShell from './SettingsModalShell';
import SettingsTopicLayout from './SettingsTopicLayout';

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

function AddOnsCard({ onTipsTopicChange }) {
  const { t } = useTranslation();
  const [activeTopic, setActiveTopic] = useState('config');

  useLayoutEffect(() => {
    onTipsTopicChange?.('addons', activeTopic);
  }, [activeTopic, onTipsTopicChange]);
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

  const addonGroups = useMemo(
    () => [
      {
        key: 'addons',
        label: t('addons.title'),
        items: [
          { id: 'config', label: t('addons.config_title') },
          { id: 'spotify', label: t('addons.spotify_title') },
          { id: 'ldap', label: t('addons.ldap_title') },
        ],
      },
    ],
    [t]
  );

  const openModalForTopic = (id) => {
    if (id === 'config') setShowConfigModal(true);
    if (id === 'spotify') setShowSpotifyModal(true);
    if (id === 'ldap') setShowLdapModal(true);
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

      <SettingsTopicLayout
        groups={addonGroups}
        activeId={activeTopic}
        onSelect={setActiveTopic}
        navAriaLabel={t('settings.topicNav.addons_nav_aria')}
      >
        {activeTopic === 'config' && (
          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('addons.config_title')}</h4>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-3">{t('addons.config_subtitle')}</p>
            <p className="text-sm text-gray-700 dark:text-slate-200/95 leading-relaxed mb-4">{t('addons.config_description')}</p>
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-500/12 dark:bg-blue-400/15 text-blue-800 dark:text-blue-200">📥 Export</span>
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-500/12 dark:bg-blue-400/15 text-blue-800 dark:text-blue-200">📤 Import</span>
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-500/12 dark:bg-blue-400/15 text-blue-800 dark:text-blue-200">🔒 Admin-only</span>
            </div>
            <button
              type="button"
              onClick={() => openModalForTopic('config')}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-blue-700"
            >
              {t('settings.topicNav.cta_configure')}
            </button>
          </div>
        )}
        {activeTopic === 'spotify' && (
          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('addons.spotify_title')}</h4>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-3">{t('addons.spotify_subtitle')}</p>
            <div className="mb-3 flex flex-wrap gap-2">
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
            </div>
            <p className="text-sm text-gray-700 dark:text-slate-200/95 leading-relaxed mb-4">{t('addons.spotify_description')}</p>
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/12 dark:bg-emerald-400/15 text-emerald-900 dark:text-emerald-200">🎵 Widget</span>
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/12 dark:bg-emerald-400/15 text-emerald-900 dark:text-emerald-200">🔗 OAuth</span>
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/12 dark:bg-emerald-400/15 text-emerald-900 dark:text-emerald-200">🔒 Encrypted</span>
            </div>
            <button
              type="button"
              onClick={() => openModalForTopic('spotify')}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-emerald-700"
            >
              {t('settings.topicNav.cta_configure')}
            </button>
          </div>
        )}
        {activeTopic === 'ldap' && (
          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('addons.ldap_title')}</h4>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-3">{t('addons.ldap_subtitle')}</p>
            <div className="mb-3 flex flex-wrap gap-2">
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
            </div>
            <p className="text-sm text-gray-700 dark:text-slate-200/95 leading-relaxed mb-4">{t('addons.ldap_description')}</p>
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-indigo-500/12 dark:text-indigo-200">{t('addons.ldap_tag_ad')}</span>
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-indigo-500/12 dark:text-indigo-200">{t('addons.ldap_tag_roles')}</span>
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-indigo-500/12 dark:text-indigo-200">🔒 Encrypted</span>
            </div>
            <button
              type="button"
              onClick={() => openModalForTopic('ldap')}
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-indigo-700"
            >
              {t('settings.topicNav.cta_configure')}
            </button>
          </div>
        )}
      </SettingsTopicLayout>

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
