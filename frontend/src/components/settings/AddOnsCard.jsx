import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Plug, X } from 'phosphor-react';
import { authenticatedFetch } from '../../utils/auth';
import ConfigAddon from './ConfigAddon';
import SpotifyAddon from './SpotifyAddon';
import LdapAddon from './LdapAddon';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
  (window.location.port === '' ? 
    `${window.location.protocol}//${window.location.hostname}` :
    `${window.location.protocol}//${window.location.hostname}:8000`
  );

const SPOTIFY_REDIRECT_URI = window.location.protocol === 'https:' 
  ? `https://${window.location.hostname}/api/spotify/callback`
  : 'http://127.0.0.1:8000/api/spotify/callback';

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

      {/* Config Import/Export Card */}
      <div 
        className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ring-2 ring-blue-500/30 hover:ring-blue-500/50"
        onClick={() => setShowConfigModal(true)}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-blue-400/10 to-transparent dark:from-blue-400/35 dark:via-blue-500/20 dark:to-transparent" />
        <div className="relative backdrop-blur-xl bg-white/30 dark:bg-gray-800/70 border border-gray-200/40 dark:border-white/15 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <span className="text-3xl">⚙️</span>
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('addons.config_title')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('addons.config_subtitle')}</p>
              </div>
            </div>
            <div className="text-2xl text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">→</div>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            {t('addons.config_description')}
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
        className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ring-2 ring-green-500/30 hover:ring-green-500/50"
        onClick={() => setShowSpotifyModal(true)}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-green-400/10 to-transparent dark:from-green-400/35 dark:via-green-500/20 dark:to-transparent" />
        <div className="relative backdrop-blur-xl bg-white/30 dark:bg-gray-800/70 border border-gray-200/40 dark:border-white/15 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <span className="text-3xl">🎵</span>
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('addons.spotify_title')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('addons.spotify_subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {spotifyStatus.connected ? (
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-semibold rounded-full">
                  {t('addons.connected')}
                </span>
              ) : spotifyStatus.configured ? (
                <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-sm font-semibold rounded-full">
                  {t('addons.configured')}
                </span>
              ) : (
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 text-sm font-semibold rounded-full">
                  {t('addons.not_installed')}
                </span>
              )}
              <div className="text-2xl text-green-600 dark:text-green-400 group-hover:translate-x-1 transition-transform">→</div>
            </div>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            {t('addons.spotify_description')}
          </p>
          <div className="flex gap-2">
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">🎵 Widget</span>
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">🔗 OAuth</span>
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">🔒 Encrypted</span>
          </div>
        </div>
      </div>

      {/* LDAP/Active Directory AddOn Card */}
      <div 
        className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ring-2 ring-indigo-500/30 hover:ring-indigo-500/50"
        onClick={() => setShowLdapModal(true)}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-indigo-400/10 to-transparent dark:from-indigo-400/35 dark:via-indigo-500/20 dark:to-transparent" />
        <div className="relative backdrop-blur-xl bg-white/30 dark:bg-gray-800/70 border border-gray-200/40 dark:border-white/15 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <span className="text-3xl">🔐</span>
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('addons.ldap_title')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('addons.ldap_subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {ldapStatus.enabled ? (
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-semibold rounded-full">
                  {t('addons.active')}
                </span>
              ) : ldapStatus.configured ? (
                <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-sm font-semibold rounded-full">
                  {t('addons.configured')}
                </span>
              ) : (
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 text-sm font-semibold rounded-full">
                  {t('addons.not_installed')}
                </span>
              )}
              <div className="text-2xl text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">→</div>
            </div>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            {t('addons.ldap_description')}
          </p>
          <div className="flex gap-2">
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">{t('addons.ldap_tag_ad')}</span>
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">{t('addons.ldap_tag_roles')}</span>
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">🔒 Encrypted</span>
          </div>
        </div>
      </div>

      {/* Config Modal */}
      {showConfigModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowConfigModal(false)}>
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 rounded-2xl border border-blue-200/50 dark:border-blue-500/30 shadow-2xl flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="relative overflow-hidden rounded-t-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-blue-400/10 to-transparent dark:from-blue-400/30 dark:via-blue-500/20 dark:to-transparent" />
                <div className="relative p-6 border-b border-gray-200/50 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                        <span className="text-2xl">⚙️</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                        {t('addons.config_title')}
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowConfigModal(false)}
                      className="p-2 hover:bg-gray-200/50 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X size={24} className="text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                    {t('addons.config_subtitle')}
                  </p>
                </div>
              </div>
              {/* Modal Content */}
              <div className="p-6 overflow-y-auto flex-1">
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
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Spotify Modal */}
      {showSpotifyModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowSpotifyModal(false)}>
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 rounded-2xl border border-green-200/50 dark:border-green-500/30 shadow-2xl flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="relative overflow-hidden rounded-t-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-green-400/10 to-transparent dark:from-green-400/30 dark:via-green-500/20 dark:to-transparent" />
                <div className="relative p-6 border-b border-gray-200/50 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                        <span className="text-2xl">🎵</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                        {t('addons.spotify_title')}
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowSpotifyModal(false)}
                      className="p-2 hover:bg-gray-200/50 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X size={24} className="text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                    {t('addons.spotify_subtitle')}
                  </p>
                </div>
              </div>
              {/* Modal Content */}
              <div className="p-6 overflow-y-auto flex-1">
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
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* LDAP Modal */}
      {showLdapModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowLdapModal(false)}>
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 rounded-2xl border border-indigo-200/50 dark:border-indigo-500/30 shadow-2xl flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="relative overflow-hidden rounded-t-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-indigo-400/10 to-transparent dark:from-indigo-400/30 dark:via-indigo-500/20 dark:to-transparent" />
                <div className="relative p-6 border-b border-gray-200/50 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <span className="text-2xl">🔐</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                        {t('addons.ldap_title')}
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowLdapModal(false)}
                      className="p-2 hover:bg-gray-200/50 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X size={24} className="text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                    {t('addons.ldap_subtitle')}
                  </p>
                </div>
              </div>
              {/* Modal Content */}
              <div className="p-6 overflow-y-auto flex-1">
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
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default AddOnsCard;
