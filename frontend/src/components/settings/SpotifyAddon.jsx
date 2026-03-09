import React from 'react';
import { useTranslation } from 'react-i18next';

function SpotifyAddon({
  BACKEND_URL,
  SPOTIFY_REDIRECT_URI,
  spotifyConfig,
  setSpotifyConfig,
  spotifyStatus,
  isSavingSpotify,
  spotifySaved,
  handleSaveSpotify,
  handleConnectSpotify,
  handleUninstallSpotify,
  onClose,
  isModal = false
}) {
  const { t } = useTranslation();

  // Im Modal-Modus: Simpler Container ohne eigenen Header
  if (isModal) {
    return (
      <div className="space-y-6">
        {/* Status Badge */}
        <div className="flex items-center gap-3">
          {spotifyStatus.connected ? (
            <span className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-semibold rounded-full">
              {t('spotifyAddon.connected')}
            </span>
          ) : spotifyStatus.configured ? (
            <span className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-sm font-semibold rounded-full">
              {t('spotifyAddon.configured')}
            </span>
          ) : (
            <span className="px-4 py-2 bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 text-sm font-semibold rounded-full">
              {t('spotifyAddon.not_installed')}
            </span>
          )}
        </div>

        {!spotifyStatus.configured ? (
          // Installation Form
          <form onSubmit={handleSaveSpotify} className="space-y-4">
            <div className="p-4 bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <h5 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                {t('spotifyAddon.setup_required')}
              </h5>
              <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                {t('spotifyAddon.setup_intro')}
                <a 
                  href="https://developer.spotify.com/dashboard" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline ml-1"
                >
                  {t('spotifyAddon.register_link')}
                </a>
              </p>
              <ol className="text-sm text-blue-600 dark:text-blue-400 list-decimal list-inside space-y-1">
                <li>{t('spotifyAddon.step1')}</li>
                <li>{t('spotifyAddon.step2')}</li>
                <li className="break-words">
                  {t('spotifyAddon.step3')}
                  <code className="bg-blue-100 dark:bg-blue-800 px-1.5 py-0.5 rounded text-[11px] block mt-1 w-fit">
                    {SPOTIFY_REDIRECT_URI}
                  </code>
                </li>
                <li>{t('spotifyAddon.step4')}</li>
              </ol>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('spotifyAddon.client_id_label')}
              </label>
              <input
                type="text"
                value={spotifyConfig.client_id}
                onChange={(e) => setSpotifyConfig({ ...spotifyConfig, client_id: e.target.value })}
                required
                placeholder={t('spotifyAddon.client_id_placeholder')}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300/50 dark:border-gray-600/50 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('spotifyAddon.client_secret_label')}
              </label>
              <input
                type="password"
                value={spotifyConfig.client_secret}
                onChange={(e) => setSpotifyConfig({ ...spotifyConfig, client_secret: e.target.value })}
                required
                placeholder={t('spotifyAddon.client_secret_placeholder')}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300/50 dark:border-gray-600/50 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('spotifyAddon.redirect_uri_label')}
              </label>
              <input
                type="text"
                value={spotifyConfig.redirect_uri}
                readOnly
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300/50 dark:border-gray-600/50 bg-gray-100/60 dark:bg-gray-700/60 backdrop-blur-sm text-gray-600 dark:text-gray-400 cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingSpotify}
              className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
            >
              {isSavingSpotify ? t('spotifyAddon.saving') : t('spotifyAddon.install_button')}
            </button>
          </form>
        ) : !spotifyStatus.connected ? (
          // Connect Section
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50/80 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                {t('spotifyAddon.connect_info')}
              </p>
            </div>
            <button
              onClick={handleConnectSpotify}
              className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl"
            >
              {t('spotifyAddon.connect_button')}
            </button>
            <button
              onClick={handleUninstallSpotify}
              className="w-full py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl"
            >
              {t('spotifyAddon.remove_button')}
            </button>
          </div>
        ) : (
          // Connected - Management
          <div className="space-y-4">
            <div className="p-4 bg-green-50/80 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl">
              <p className="text-sm text-green-800 dark:text-green-300">
                {t('spotifyAddon.connected_info')}
              </p>
            </div>
            <button
              onClick={handleUninstallSpotify}
              className="w-full py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl"
            >
              {t('spotifyAddon.remove_button')}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Nicht-Modal: Original-Design mit Header
  return (
    <div className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-green-500/50 dark:border-green-500/40 shadow-xl">
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-green-400/5 dark:from-green-400/20 dark:to-transparent pointer-events-none" />
      
      {/* Header */}
      <div className="relative bg-gradient-to-r from-green-500/80 to-green-600/80 dark:from-green-600/90 dark:to-green-700/90 backdrop-blur-sm p-6 flex items-center justify-between border-b border-green-400/30 dark:border-green-500/30">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-white/90 dark:bg-white/95 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-3xl">🎵</span>
          </div>
          <div>
            <h4 className="text-white font-semibold text-lg mb-1">{t('addons.spotify_title')}</h4>
            <p className="text-green-100 dark:text-green-200 text-sm">{t('addons.spotify_subtitle')}</p>
          </div>
        </div>
        <div>
          {spotifyStatus.connected ? (
            <span className="px-4 py-2 bg-white/90 dark:bg-white/95 text-green-600 dark:text-green-700 text-sm font-semibold rounded-full shadow-md">
              {t('spotifyAddon.connected')}
            </span>
          ) : spotifyStatus.configured ? (
            <span className="px-4 py-2 bg-yellow-100/90 dark:bg-yellow-100/95 text-yellow-700 dark:text-yellow-800 text-sm font-semibold rounded-full shadow-md">
              {t('spotifyAddon.configured')}
            </span>
          ) : (
            <span className="px-4 py-2 bg-white/60 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 text-sm font-semibold rounded-full shadow-md">
              {t('spotifyAddon.not_installed')}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative p-6">
        {!spotifyStatus.configured ? (
          // Installation Form
          <form onSubmit={handleSaveSpotify} className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
              <h5 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                {t('spotifyAddon.setup_required')}
              </h5>
              <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                {t('spotifyAddon.setup_intro')}
                <a 
                  href="https://developer.spotify.com/dashboard" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline ml-1"
                >
                  {t('spotifyAddon.register_link')}
                </a>
              </p>
              <ol className="text-sm text-blue-600 dark:text-blue-400 list-decimal list-inside space-y-1">
                <li>{t('spotifyAddon.step1')}</li>
                <li>{t('spotifyAddon.step2')}</li>
                <li className="break-words">
                  {t('spotifyAddon.step3')}
                  <code className="bg-blue-100 dark:bg-blue-800 px-1.5 py-0.5 rounded text-[11px] block mt-1 w-fit">
                    {SPOTIFY_REDIRECT_URI}
                  </code>
                </li>
                <li>{t('spotifyAddon.step4')}</li>
              </ol>
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('spotifyAddon.client_id_label')}
              </label>
              <input
                type="text"
                value={spotifyConfig.client_id}
                onChange={(e) => setSpotifyConfig({ ...spotifyConfig, client_id: e.target.value })}
                required
                placeholder={t('spotifyAddon.client_id_placeholder')}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('spotifyAddon.client_secret_label')}
              </label>
              <input
                type="password"
                value={spotifyConfig.client_secret}
                onChange={(e) => setSpotifyConfig({ ...spotifyConfig, client_secret: e.target.value })}
                required
                placeholder={t('spotifyAddon.client_secret_placeholder')}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('spotifyAddon.redirect_uri_label')}
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
              {isSavingSpotify ? t('common.saving') : spotifySaved ? t('common.saved') : t('spotifyAddon.save_config')}
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
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('spotifyAddon.status_label')}</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {spotifyStatus.connected ? t('spotifyAddon.connected') : t('spotifyAddon.not_connected')}
                </p>
              </div>
            </div>

            {!spotifyStatus.connected ? (
              <div className="space-y-3">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    {t('spotifyAddon.not_connected_warning')}
                  </p>
                </div>

                <button
                  onClick={handleConnectSpotify}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                >
                  {t('spotifyAddon.connect_button')}
                </button>
              </div>
            ) : (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-300">
                  {t('spotifyAddon.connected_info')}
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleUninstallSpotify}
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
              >
                {t('spotifyAddon.remove_button')}
              </button>
            </div>
          </div>
        )}

        {/* Security Info */}
        <div className="mt-6 p-4 bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-gray-300/50 dark:border-white/10 rounded-xl shadow-sm">
          <h5 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            {t('spotifyAddon.security_title')}
          </h5>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {t('spotifyAddon.security_info')}
          </p>
        </div>
      </div>
    </div>
  );
}

export default SpotifyAddon;
