import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowsClockwise } from 'phosphor-react';

const ROTATE_MS = 6500;

function pickRandomIndex(length, exclude = -1) {
  if (length <= 1) return 0;
  let idx = exclude;
  while (idx === exclude) {
    idx = Math.floor(Math.random() * length);
  }
  return idx;
}

function ClusterStatsLoading() {
  const { t } = useTranslation();
  const tips = useMemo(() => {
    const raw = t('statusDashboard.loading_tips', { returnObjects: true });
    return Array.isArray(raw) ? raw.filter(Boolean) : [];
  }, [t]);

  const [tipIndex, setTipIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => {
    if (tips.length === 0) return undefined;

    setTipIndex(pickRandomIndex(tips.length));
    setFadeIn(true);

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion || tips.length < 2) return undefined;

    let fadeTimeoutId;
    const intervalId = window.setInterval(() => {
      setFadeIn(false);
      fadeTimeoutId = window.setTimeout(() => {
        setTipIndex((prev) => pickRandomIndex(tips.length, prev));
        setFadeIn(true);
      }, 180);
    }, ROTATE_MS);

    return () => {
      window.clearInterval(intervalId);
      if (fadeTimeoutId) window.clearTimeout(fadeTimeoutId);
    };
  }, [tips]);

  return (
    <div className="flex items-center justify-center py-20">
      <div className="mx-auto max-w-md px-4 text-center space-y-4">
        <ArrowsClockwise
          size={48}
          weight="bold"
          className="mx-auto text-blue-600 dark:text-blue-400 animate-spin"
        />
        <p className="text-gray-700 dark:text-gray-300 font-medium">
          {t('statusDashboard.loading')}
        </p>
        {tips.length > 0 && (
          <p
            className={`min-h-[2.75rem] text-sm leading-relaxed text-gray-600 dark:text-gray-400 transition-opacity duration-200 ${
              fadeIn ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {tips[tipIndex]}
          </p>
        )}
      </div>
    </div>
  );
}

export default ClusterStatsLoading;
