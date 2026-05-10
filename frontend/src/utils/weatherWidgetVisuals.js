/**
 * Wetter-Icon-Farben für Header-Widget und Einstellungen.
 * Phosphor nutzt stroke/fill aus dem `color`-Prop (nicht nur CSS-Klassen), sonst
 * erbt das Icon currentColor vom Eltern-`span` mit textColor → alles wirkt weiß/schwarz.
 */

/** WMO weather_code → Hex für Phosphor `color` (Open-Meteo) */
export function getConditionIconColor(weatherCode) {
  if (weatherCode === 0) return '#fbbf24';
  if (weatherCode <= 3) return '#38bdf8';
  if (weatherCode <= 49) return '#94a3b8';
  if (weatherCode <= 59) return '#0ea5e9';
  if (weatherCode <= 69) return '#3b82f6';
  if (weatherCode <= 79) return '#22d3ee';
  if (weatherCode <= 84) return '#60a5fa';
  if (weatherCode <= 99) return '#a78bfa';
  return '#fb923c';
}

/** Messgrößen-Icons: klar getrennte, ruhige Töne (Rose / Cyan / Teal / Blue …) */
export const WEATHER_METRIC_ICON_COLORS = {
  temperature: '#fb7185',
  humidity: '#22d3ee',
  wind: '#2dd4bf',
  precipitation: '#3b82f6',
  cloudCover: '#94a3b8',
  pressure: '#a78bfa',
};
