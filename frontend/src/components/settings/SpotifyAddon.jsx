import React from 'react';

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
  handleUninstallSpotify
}) {
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
            <h4 className="text-white font-semibold text-lg mb-1">Spotify</h4>
            <p className="text-green-100 dark:text-green-200 text-sm">Now Playing Widget</p>
          </div>
        </div>
        <div>
          {spotifyStatus.connected ? (
            <span className="px-4 py-2 bg-white/90 dark:bg-white/95 text-green-600 dark:text-green-700 text-sm font-semibold rounded-full shadow-md">
              ✓ Verbunden
            </span>
          ) : spotifyStatus.configured ? (
            <span className="px-4 py-2 bg-yellow-100/90 dark:bg-yellow-100/95 text-yellow-700 dark:text-yellow-800 text-sm font-semibold rounded-full shadow-md">
              Konfiguriert
            </span>
          ) : (
            <span className="px-4 py-2 bg-white/60 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 text-sm font-semibold rounded-full shadow-md">
              Nicht installiert
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
              <label className="block text-base font-medium text-gray-700 dark:text-gray-200 mb-2">
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
              <label className="block text-base font-medium text-gray-700 dark:text-gray-200 mb-2">
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
              <label className="block text-base font-medium text-gray-700 dark:text-gray-200 mb-2">
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
        <div className="mt-6 p-4 bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-gray-300/50 dark:border-white/10 rounded-xl shadow-sm">
          <h5 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            🔒 Sicherheit
          </h5>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Client Secret und Access Tokens werden verschlüsselt gespeichert. 
            Spotify hat nur Lesezugriff auf deine aktuell abgespielte Musik.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SpotifyAddon;
