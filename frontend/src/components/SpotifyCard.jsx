import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MusicNote, ArrowSquareOut } from 'phosphor-react';
import { useTranslation } from 'react-i18next';
import { authenticatedFetch } from '../utils/auth';
import { sanitizeUrl } from '../utils/sanitize';
import HeaderWidgetCapsule from './HeaderWidgetCapsule';
import MarqueeOrTruncate from './MarqueeOrTruncate';

/**
 * Breiter als Wetter/Uhr für bessere Lesbarkeit; Höhe bleibt über HeaderWidgetCapsule fix.
 */
const SPOTIFY_SHELL = 'group w-[min(17rem,80vw)] shrink-0 md:w-[18rem]';

const TICK_MS = 200;

function trackKey(track) {
  if (!track) return '';
  return track.uri || `${track.name}|${track.artist}`;
}

function computeDisplayProgress(anchor) {
  if (!anchor || anchor.durationMs <= 0) {
    return { progressMs: 0, percent: 0 };
  }
  let ms = anchor.progressMs;
  if (anchor.isPlaying) {
    ms += Date.now() - anchor.syncedAt;
    ms = Math.min(ms, anchor.durationMs);
  }
  const percent = (ms / anchor.durationMs) * 100;
  return { progressMs: ms, percent };
}

const SpotifyCard = () => {
  const { t } = useTranslation();
  const [nowPlaying, setNowPlaying] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [, setTick] = useState(0);
  const playbackAnchorRef = useRef(null);

  const syncPlaybackAnchor = useCallback((data) => {
    const playing = Boolean(data?.is_playing && data?.track);
    if (!playing) {
      playbackAnchorRef.current = null;
      return;
    }
    const key = trackKey(data.track);
    const prev = playbackAnchorRef.current;
    playbackAnchorRef.current = {
      trackKey: key,
      progressMs: data.track.progress_ms ?? 0,
      durationMs: data.track.duration_ms ?? 0,
      isPlaying: true,
      syncedAt: Date.now(),
    };
    if (prev?.trackKey !== key) {
      setTick((n) => n + 1);
    }
  }, []);

  const fetchNowPlaying = async () => {
    try {
      const response = await authenticatedFetch('/api/spotify/now-playing');

      if (response.ok) {
        const data = await response.json();
        syncPlaybackAnchor(data);
        setNowPlaying((prev) => {
          const isOn = (p) => Boolean(p?.is_playing && p?.track);
          if (!isOn(prev) && !isOn(data)) {
            return prev ?? data;
          }
          if (
            isOn(prev) &&
            isOn(data) &&
            trackKey(prev.track) === trackKey(data.track)
          ) {
            return prev;
          }
          return data;
        });
        setError(null);
      } else if (response.status === 429) {
        setError(t('spotify.rate_limit'));
      } else if (response.status === 401) {
        setError(null);
        setNowPlaying(null);
        playbackAnchorRef.current = null;
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
    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 5000);
    return () => clearInterval(interval);
  }, []);

  /* Lokale Fortschritts-Anzeige zwischen API-Polls */
  useEffect(() => {
    if (!nowPlaying?.is_playing || !playbackAnchorRef.current) {
      return undefined;
    }
    const id = setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => clearInterval(id);
  }, [nowPlaying?.is_playing, nowPlaying?.track?.uri, nowPlaying?.track?.name]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  /* Kein Platzhalter: nichts läuft / lädt / Fehler → kein Widget, Uhr & Wetter rutschen nach rechts */
  if (loading || error) {
    return null;
  }

  if (!nowPlaying || !nowPlaying.is_playing || !nowPlaying.track) {
    return null;
  }

  const { track } = nowPlaying;
  const { progressMs: displayProgressMs, percent: displayPercent } = computeDisplayProgress(
    playbackAnchorRef.current
  );

  const titleShadow = { textShadow: '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2)' };

  return (
    <HeaderWidgetCapsule className={SPOTIFY_SHELL}>
      <div className="flex h-full min-h-0 w-full min-w-0 items-center justify-center gap-2 py-0.5 md:gap-2.5">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-gray-300/40 shadow-inner dark:bg-white/10">
          {track.album_image && sanitizeUrl(track.album_image) ? (
            <img src={sanitizeUrl(track.album_image)} alt="" className="h-10 w-10 object-cover" />
          ) : null}
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-0.5 leading-none">
          <div className="flex min-w-0 items-center gap-1">
            <div className="min-w-0 flex-1">
              <MarqueeOrTruncate
                text={track.name}
                as="h3"
                className="m-0 truncate text-sm font-bold leading-tight text-gray-900 dark:text-white/90"
                style={titleShadow}
              />
            </div>
            <div className="flex shrink-0 items-center gap-0.5" role="status" aria-label={t('spotify.now_playing_a11y')}>
              <MusicNote className="h-3.5 w-3.5 shrink-0 text-green-500 dark:text-green-400" weight="fill" />
              {nowPlaying.is_playing && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500 animate-pulse dark:bg-green-400" />
              )}
              <span
                className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide text-green-600 dark:text-green-300"
                style={titleShadow}
              >
                {t('spotify.now_playing_badge')}
              </span>
            </div>
          </div>

          <MarqueeOrTruncate
            text={track.artist}
            as="p"
            className="m-0 truncate text-xs leading-tight text-gray-700 dark:text-white/60"
            style={titleShadow}
          />

          {track.duration_ms > 0 && (
            <div className="flex min-h-0 items-center gap-1.5 pt-0.5">
              <div className="h-0.5 min-w-0 flex-1 rounded-full bg-gray-300/60 dark:bg-white/20">
                <div
                  className="h-0.5 rounded-full bg-green-500 dark:bg-green-400"
                  style={{ width: `${displayPercent}%` }}
                />
              </div>
              <span
                className="shrink-0 whitespace-nowrap text-[10px] tabular-nums text-gray-600 dark:text-white/50"
                style={titleShadow}
              >
                {formatTime(displayProgressMs)} / {formatTime(track.duration_ms)}
              </span>
            </div>
          )}
        </div>

        {track.external_url && sanitizeUrl(track.external_url) && (
          <a
            href={sanitizeUrl(track.external_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-green-600 opacity-0 transition-opacity hover:text-green-500 hover:opacity-100 focus:opacity-100 group-hover:opacity-100 dark:text-green-400 dark:hover:text-green-300"
            title={t('spotify.open_in_spotify')}
          >
            <ArrowSquareOut className="h-4.5 w-4.5" weight="bold" />
          </a>
        )}
      </div>
    </HeaderWidgetCapsule>
  );
};

export default SpotifyCard;
