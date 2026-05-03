import React, { useState, useEffect } from 'react';
import { MusicNote, CircleNotch, ArrowSquareOut } from 'phosphor-react';
import { useTranslation } from 'react-i18next';
import { authenticatedFetch } from '../utils/auth';
import HeaderWidgetCapsule from './HeaderWidgetCapsule';

const SpotifyCard = () => {
  const { t } = useTranslation();
  const [nowPlaying, setNowPlaying] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNowPlaying = async () => {
    try {
      const response = await authenticatedFetch('/api/spotify/now-playing');

      if (response.ok) {
        const data = await response.json();
        setNowPlaying(data);
        setError(null);
      } else if (response.status === 429) {
        setError(t('spotify.rate_limit'));
      } else if (response.status === 401) {
        // Session expired — don't show error, just wait for re-login
        setError(null);
        setNowPlaying(null);
      } else {
        setError(t('spotify.load_error'));
      }
    } catch (err) {
      console.error('Spotify fetch error:', err);
      setError(t('spotify.connection_error'));
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
      <HeaderWidgetCapsule>
        <div className="flex h-full min-h-0 items-center gap-3">
          <CircleNotch className="h-5 w-5 animate-spin text-green-500 dark:text-green-400" />
          <span
            className="text-sm text-gray-900 dark:text-white/90"
            style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2)' }}
          >
            {t('spotify.loading')}
          </span>
        </div>
      </HeaderWidgetCapsule>
    );
  }

  // Error State
  if (error) {
    return (
      <HeaderWidgetCapsule>
        <div className="flex h-full min-h-0 items-center gap-3">
          <MusicNote className="h-5 w-5 text-gray-600 dark:text-white/40" />
          <span
            className="text-sm text-gray-800 dark:text-white/60"
            style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2)' }}
          >
            {t('spotify.error')}
          </span>
        </div>
      </HeaderWidgetCapsule>
    );
  }

  // Not Playing State - nicht anzeigen
  if (!nowPlaying || !nowPlaying.is_playing || !nowPlaying.track) {
    return null;
  }

  const { track, progress_percent } = nowPlaying;

  return (
    <HeaderWidgetCapsule className="group">
      <div className="flex h-full min-h-0 min-w-0 items-center gap-2 md:gap-2.5">
        {/* Album Cover */}
        {track.album_image && isSafeUrl(track.album_image) && (
          <div className="shrink-0">
            <img
              src={track.album_image}
              alt={track.album}
              className="h-10 w-10 rounded-lg object-cover shadow-lg"
            />
          </div>
        )}

        {/* Track info: title + artist left, badge right; progress below */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-1 max-w-[min(100%,22rem)]">
          <div className="flex min-w-0 items-start gap-2">
            <div className="min-w-0 flex-1">
              <h3
                className="truncate text-sm font-bold leading-tight text-gray-900 dark:text-white/90"
                style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2)' }}
              >
                {track.name}
              </h3>
              <p
                className="truncate text-xs leading-tight text-gray-700 dark:text-white/60"
                style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2)' }}
              >
                {track.artist}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end justify-center text-right">
              <div className="flex items-center gap-1">
                <MusicNote className="h-3.5 w-3.5 text-green-500 dark:text-green-400" weight="fill" />
                {nowPlaying.is_playing && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500 animate-pulse dark:bg-green-400" />
                )}
                <span
                  className="max-w-[6.5rem] truncate text-[10px] font-semibold uppercase tracking-wide text-green-600 dark:text-green-300"
                  style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2)' }}
                >
                  {t('spotify.now_playing_badge')}
                </span>
              </div>
            </div>
          </div>

          {track.progress_ms !== undefined && (
            <div className="space-y-0.5">
              <div className="h-1 rounded-full bg-gray-300/60 shadow-md dark:bg-white/20">
                <div
                  className="h-1 rounded-full bg-green-500 transition-all duration-300 dark:bg-green-400"
                  style={{ width: `${progress_percent || 0}%` }}
                />
              </div>
              <div
                className="flex justify-between text-[9px] leading-none text-gray-600 dark:text-white/50"
                style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2)' }}
              >
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
            title={t('spotify.open_in_spotify')}
          >
            <ArrowSquareOut className="w-5 h-5" weight="bold" />
          </a>
        )}
      </div>
    </HeaderWidgetCapsule>
  );
};

export default SpotifyCard;
