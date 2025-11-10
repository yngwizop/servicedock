import React, { useState, useEffect } from 'react';
import { MusicNote, Play, Pause, SkipForward, SkipBack, CircleNotch, ArrowSquareOut } from 'phosphor-react';

const SpotifyCard = () => {
  const [nowPlaying, setNowPlaying] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNowPlaying = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/spotify/now-playing', {
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
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-sm p-3 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <CircleNotch className="w-5 h-5 text-green-500 animate-spin" />
          <span className="text-sm text-gray-700 dark:text-gray-300">Lädt...</span>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-sm p-3 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <MusicNote className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Fehler</span>
        </div>
      </div>
    );
  }

  // Not Playing State
  if (!nowPlaying || !nowPlaying.is_playing || !nowPlaying.track) {
    return (
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-sm p-3 border border-gray-200 dark:border-gray-700" style={{ minWidth: '250px' }}>
        <div className="flex items-center space-x-3">
          <MusicNote className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Keine Wiedergabe</span>
        </div>
      </div>
    );
  }

  const { track, progress_percent } = nowPlaying;

  return (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-xl p-3 border border-gray-300/50 dark:border-gray-600/50 shadow-lg">
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
            <MusicNote className="w-3.5 h-3.5 text-green-600 dark:text-green-400" weight="fill" />
            {nowPlaying.is_playing && (
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            )}
            <span className="text-[11px] font-semibold text-green-700 dark:text-green-300">
              Now Playing
            </span>
          </div>

          {/* Song Title */}
          <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate mb-0.5">
            {track.name}
          </h3>

          {/* Artist */}
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-2">
            {track.artist}
          </p>

          {/* Progress Bar */}
          {track.progress_ms !== undefined && (
            <div className="space-y-1">
              <div className="bg-gray-300 dark:bg-gray-600 rounded-full h-1.5">
                <div
                  className="bg-green-600 dark:bg-green-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress_percent || 0}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-500">
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
            className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 flex-shrink-0"
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
