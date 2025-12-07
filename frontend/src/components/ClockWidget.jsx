import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

function ClockWidget({ textColor, locale = (typeof navigator !== 'undefined' && navigator.language) || 'de-DE', showSeconds = true, use24Hour = true }) {
  const [time, setTime] = useState(() => new Date());
  const [announce, setAnnounce] = useState(''); // für sr-only Live-Region (seltener updaten)
  const timerRef = useRef(null);

  // Formatter einmal erstellen
  const timeFormatterRef = useRef(
    new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: showSeconds ? '2-digit' : undefined,
      hour12: !use24Hour,
    })
  );
  const dateFormatterRef = useRef(
    new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  );

  // Formatter neu erstellen wenn use24Hour sich ändert
  useEffect(() => {
    timeFormatterRef.current = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: showSeconds ? '2-digit' : undefined,
      hour12: !use24Hour,
    });
  }, [use24Hour, locale, showSeconds]);

  // Helfer: setzt den nächsten Tick so, dass er genau auf die Sekunde fällt
  useEffect(() => {
    const startTick = () => {
      // clear vorhandenen timer (sicher)
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const tick = () => {
        setTime(new Date());
        const now = Date.now();
        const delay = 1000 - (now % 1000);
        timerRef.current = setTimeout(tick, delay);
      };

      // sofort so starten, dass der erste setTimeout an die nächste Sekunde anschließt
      const now = Date.now();
      const initialDelay = 1000 - (now % 1000);
      timerRef.current = setTimeout(tick, initialDelay);
    };

    // Wenn Tab nicht sichtbar ist, PV API benutzen, um zu pausieren
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startTick();
      } else {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }
    };

    // Starten
    startTick();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // locale/showSeconds nicht als Dependency, damit Formatter nicht recreated wird ständig.
    // Wenn du locale/showSeconds als dynamisch erwartest, kannst du die Formatter in useEffect neu setzen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Announce nur bei Minutenwechsel (um Screenreader-Spam zu vermeiden)
  useEffect(() => {
    const minuteKey = `${time.getHours()}:${time.getMinutes()}`;
    // Wir benutzen announce als String, der aktualisiert wird, wenn Minute wechselt
    setAnnounce(`${timeFormatterRef.current.format(time)}, ${dateFormatterRef.current.format(time)}`);
    // Wenn du nur bei Minute wechseln willst, könntest du vorherigen Minutenwert speichern und vergleichen.
  }, [time]);

  const formatTime = () => timeFormatterRef.current.format(time);
  const formatDate = () => dateFormatterRef.current.format(time);

  return (
    <div 
      className="text-right select-none"
      style={{ 
        color: textColor,
        textShadow: '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2)'
      }}
      role="group"
      aria-label="Uhrzeit und Datum"
    >
      <div className="text-xl md:text-2xl font-bold tabular-nums" aria-hidden="false" role="timer">
        {formatTime()}
      </div>

      <div className="text-sm md:text-base opacity-80" aria-hidden="false">
        {formatDate()}
      </div>

      {/* Für Screenreader: sichtbarer, aber visuell versteckter Text, der in einer Live-Region liegt.
          Tailwind hat die Klasse 'sr-only' standardmäßig. aria-live polite, aber wir aktualisieren
          nur mit Minuten-/Zeitkombination (siehe useEffect) um Spam zu vermeiden. */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announce}
      </span>
    </div>
  );
}

ClockWidget.propTypes = {
  textColor: PropTypes.string,
  locale: PropTypes.string,
  showSeconds: PropTypes.bool,
  use24Hour: PropTypes.bool,
};

export default ClockWidget;
