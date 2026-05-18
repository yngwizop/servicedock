/** Stable JSON compare for appearance draft vs saved state. */
function normalizeAppearance(a) {
  if (!a) return {};
  const weather = Array.isArray(a.weather_fields)
    ? [...a.weather_fields].sort()
    : ['temperature', 'humidity'];
  return {
    bg_color: a.bg_color ?? '#f0f2f5',
    bg_image_url: a.bg_image_url ?? null,
    bg_opacity: a.bg_opacity ?? 1,
    shortcut_cols: a.shortcut_cols ?? 6,
    service_cols: a.service_cols ?? 6,
    text_color_light: a.text_color_light ?? '#1f2937',
    text_color_dark: a.text_color_dark ?? '#e5e7eb',
    clock_format: a.clock_format ?? '24h',
    weather_city: a.weather_city ?? 'Berlin',
    weather_fields: weather,
    show_spotify: a.show_spotify !== false,
    show_weather: a.show_weather !== false,
    show_clock: a.show_clock !== false,
  };
}

export function isAppearanceDirty(saved, draft) {
  return JSON.stringify(normalizeAppearance(saved)) !== JSON.stringify(normalizeAppearance(draft));
}
