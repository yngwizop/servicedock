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

  // Loading State
  if (loading) {
    return (
      <div className="bg-white/40 dark:bg-white/5 backdrop-blur-md rounded-lg shadow-lg p-3 border border-gray-300/50 dark:border-white/10">
        <div className="flex items-center space-x-3">
          <CircleNotch className="w-5 h-5 text-green-500 dark:text-green-400 animate-spin" />
          <span className="text-sm text-gray-950 dark:text-white/90">Lädt...</span>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="bg-white/40 dark:bg-white/5 backdrop-blur-md rounded-lg shadow-lg p-3 border border-gray-300/50 dark:border-white/10">
        <div className="flex items-center space-x-3">
          <MusicNote className="w-5 h-5 text-gray-600 dark:text-white/40" />
          <span className="text-sm text-gray-800 dark:text-white/60">Fehler</span>
        </div>
      </div>
    );
  }

  // Not Playing State
  if (!nowPlaying || !nowPlaying.is_playing || !nowPlaying.track) {
    return (
      <div className="bg-white/40 dark:bg-white/5 backdrop-blur-md rounded-lg shadow-lg p-3 border border-gray-300/50 dark:border-white/10" style={{ minWidth: '250px' }}>
        <div className="flex items-center space-x-3">
          <MusicNote className="w-5 h-5 text-gray-600 dark:text-white/40" />
          <span className="text-sm text-gray-800 dark:text-white/60">Keine Wiedergabe</span>
        </div>
      </div>
    );
  }

  const { track, progress_percent } = nowPlaying;

  return (
    <div className="bg-white/40 dark:bg-white/5 backdrop-blur-md rounded-xl p-3 border border-gray-300/50 dark:border-white/10 shadow-lg hover:bg-white/60 dark:hover:bg-white/10 hover:border-gray-400/60 dark:hover:border-white/20 transition-all">
      <div className="flex items-center gap-3">
        {/* Album Cover */}
        {track.album_image && (
          <div className="flex-shrink-0">
            <img
              src={track.album_image}
              alt={track.album}
              className="w-14 h-14 rounded-lg shadow-md object-cover"
            />
          </div>
        )}

        {/* Track Info */}
        <div className="flex-1 min-w-0" style={{ minWidth: '220px', maxWidth: '280px' }}>
          {/* Now Playing Badge */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <MusicNote className="w-3.5 h-3.5 text-green-500 dark:text-green-400" weight="fill" />
            {nowPlaying.is_playing && (
              <span className="w-1.5 h-1.5 bg-green-500 dark:bg-green-400 rounded-full animate-pulse"></span>
            )}
            <span className="text-[11px] font-semibold text-green-600 dark:text-green-300">
              Now Playing
            </span>
          </div>

          {/* Song Title */}
          <h3 className="text-sm font-bold text-gray-950 dark:text-white/90 truncate mb-0.5">
            {track.name}
          </h3>

          {/* Artist */}
          <p className="text-xs text-gray-800 dark:text-white/60 truncate mb-2">
            {track.artist}
          </p>

          {/* Progress Bar */}
          {track.progress_ms !== undefined && (
            <div className="space-y-1">
              <div className="bg-gray-300/60 dark:bg-white/20 rounded-full h-1.5">
                <div
                  className="bg-green-500 dark:bg-green-400 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress_percent || 0}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-gray-600 dark:text-white/50">
                <span>{formatTime(track.progress_ms)}</span>
                <span>{formatTime(track.duration_ms)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Spotify Link */}
        {track.external_url && (
          <a
            href={track.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 flex-shrink-0 transition-colors"
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
