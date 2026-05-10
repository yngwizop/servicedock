/**
 * Formatiert ISO-Zeitstempel für Einstellungen (lokalisiert, Datum + Uhrzeit).
 * @param {string | null | undefined} iso
 * @param {string} [locale] i18n language (z. B. "de", "en")
 * @returns {string} leerer String bei ungültigem Input
 */
export function formatSettingsDateTime(iso, locale = 'de') {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const loc = String(locale || 'de').toLowerCase().startsWith('de') ? 'de-DE' : 'en-GB';
  try {
    return new Intl.DateTimeFormat(loc, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return d.toISOString();
  }
}
