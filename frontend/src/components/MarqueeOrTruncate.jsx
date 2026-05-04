import React, { useState, useRef, useLayoutEffect, memo } from 'react';

/**
 * Feste Breite im Flex-Kontext; bei Overflow nahtloser Marquee (wie Spotify-Widget).
 */
function MarqueeOrTruncate({ text, className = '', style, as: Tag = 'span' }) {
  const wrapRef = useRef(null);
  const [marquee, setMarquee] = useState(false);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const measure = () => {
      const reduceMotion =
        typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const m = wrap.querySelector('[data-marquee-measure]');
      if (!m || reduceMotion) {
        setMarquee(false);
        return;
      }
      setMarquee(m.scrollWidth > wrap.clientWidth);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [text]);

  const durationSec = Math.min(28, Math.max(10, String(text || '').length * 0.22));

  return (
    <div ref={wrapRef} className="relative min-w-0">
      <span
        data-marquee-measure
        className={`invisible absolute left-0 top-0 z-0 whitespace-nowrap ${className}`}
        aria-hidden
      >
        {text}
      </span>
      <div className="min-w-0 overflow-hidden">
        {!marquee ? (
          <Tag className={`block truncate ${className}`} style={style}>
            {text}
          </Tag>
        ) : (
          <div
            className="sd-marquee-track inline-flex"
            style={{ '--sd-marquee-sec': `${durationSec}s` }}
          >
            <Tag className={`shrink-0 pr-8 ${className}`} style={style}>
              {text}
            </Tag>
            <Tag className={`shrink-0 pr-8 ${className}`} style={style} aria-hidden>
              {text}
            </Tag>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(MarqueeOrTruncate, (a, b) => a.text === b.text && a.className === b.className && a.as === b.as);
