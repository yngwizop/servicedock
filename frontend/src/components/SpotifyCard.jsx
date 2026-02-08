import React, { useState, useEffect } from 'react';
import { MusicNote, Play, Pause, SkipForward, SkipBack, CircleNotch, ArrowSquareOut } from 'phosphor-react';

const SpotifyCard = () => {
  const [nowPlaying, setNowPlaying] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Backend URL: Mit Nginx kein Port, ohne Nginx Port 8000
  const BACKEND_URL = window.location.port === '' 
    ? `${window.location.protocol}//${window.location.hostname}`
    : `${window.location.protocol}//${window.location.hostname}:8000`;

  const fetchNowPlaying = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/spotify/now-playing`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setNowPlaying(data);
        setError(null);
      } else if (response.status === 429) {
        setError('Rate limit erreicht. Bitte warten...');
      } else {
        setError('Fehler beim Laden');
      }
    } catch (err) {
      console.error('Spotify fetch error:', err);
      setError('Verbindungsfehler');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchNowPlaying();

    // Poll every 5 seconds
    const interval = setInterval(fetchNowPlaying, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Sanitize URLs - only allow https:// schemes
  const isSafeUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    return url.startsWith('https://') || url.startsWith('http://');
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center space-x-3">
        <CircleNotch className="w-5 h-5 text-green-500 dark:text-green-400 animate-spin" />
        <span className="text-sm text-gray-900 dark:text-white/90" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2)' }}>Lädt...</span>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex items-center space-x-3">
        <MusicNote className="w-5 h-5 text-gray-600 dark:text-white/40" />
        <span className="text-sm text-gray-800 dark:text-white/60" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2)' }}>Fehler</span>
      </div>
    );
  }

  // Not Playing State - nicht anzeigen
  if (!nowPlaying || !nowPlaying.is_playing || !nowPlaying.track) {
    return null;
  }

  const { track, progress_percent } = nowPlaying;

  return (
    <div className="flex items-center gap-3 group">
      <div className="flex items-center gap-3">
        {/* Album Cover */}
        {track.album_image && isSafeUrl(track.album_image) && (
          <div className="flex-shrink-0">
            <img
              src={track.album_image}
              alt={track.album}
              className="w-12 h-12 rounded-lg shadow-lg object-cover"
            />
          </div>
        )}

        {/* Track Info */}
        <div className="flex-1 min-w-0" style={{ minWidth: '200px', maxWidth: '260px' }}>
          {/* Now Playing Badge */}
          <div className="flex items-center gap-1.5 mb-1">
            <MusicNote className="w-3.5 h-3.5 text-green-500 dark:text-green-400" weight="fill" />
            {nowPlaying.is_playing && (
              <span className="w-1.5 h-1.5 bg-green-500 dark:bg-green-400 rounded-full animate-pulse"></span>
            )}
            <span className="text-[11px] font-semibold text-green-600 dark:text-green-300" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2)' }}>
              Now Playing
            </span>
          </div>

          {/* Song Title */}
          <h3 className="text-sm font-bold text-gray-900 dark:text-white/90 truncate mb-0.5" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2)' }}>
            {track.name}
          </h3>

          {/* Artist */}
          <p className="text-xs text-gray-700 dark:text-white/60 truncate mb-2" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2)' }}>
            {track.artist}
          </p>

          {/* Progress Bar */}
          {track.progress_ms !== undefined && (
            <div className="space-y-1">
              <div className="bg-gray-300/60 dark:bg-white/20 rounded-full h-1.5 shadow-md">
                <div
                  className="bg-green-500 dark:bg-green-400 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress_percent || 0}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-gray-600 dark:text-white/50" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2)' }}>
                <span>{formatTime(track.progress_ms)}</span>
                <span>{formatTime(track.duration_ms)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Spotify Link */}
        {track.external_url && isSafeUrl(track.external_url) && (
          <a
            href={track.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 flex-shrink-0 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 hover:opacity-100"
            title="In Spotify öffnen"
          >
            <ArrowSquareOut className="w-5 h-5" weight="bold" />
          </a>
        )}
      </div>
    </div>
  );
};

export default SpotifyCard;
