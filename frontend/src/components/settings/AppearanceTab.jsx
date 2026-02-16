import React from 'react';
import { Moon, Sun } from 'phosphor-react';
import { useTranslation } from 'react-i18next';

const WEATHER_FIELDS = [
  { key: 'temperature', labelKey: 'appearance.temperature', icon: '🌡️' },
  { key: 'humidity', labelKey: 'appearance.humidity', icon: '💧' },
  { key: 'wind', labelKey: 'appearance.wind', icon: '🌀' },
  { key: 'precipitation', labelKey: 'appearance.precipitation', icon: '🌧️' },
  { key: 'cloudCover', labelKey: 'appearance.cloud_cover', icon: '☁️' },
  { key: 'pressure', labelKey: 'appearance.pressure', icon: '🔽' }
];

function AppearanceTab({
  editAppearance,
  setEditAppearance,
  currentTheme,
  weatherLocationInfo,
  isSavingAppearance,
  showSaved,
  onSaveAppearance
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Sektion: Hintergrund */}
      <div className="space-y-4 p-6 bg-white/70 dark:bg-white/5 backdrop-blur-md shadow-xl rounded-2xl border border-gray-400/60 dark:border-white/10">
        <h4 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          {t('appearance.background')}
        </h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('appearance.bg_color')}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={editAppearance.bg_color || "#ffffff"}
              onChange={(e) => setEditAppearance({ ...editAppearance, bg_color: e.target.value })}
              className="w-16 h-12 p-1 border border-gray-300 dark:border-white/20 rounded-xl cursor-pointer bg-white/50 dark:bg-white/5 backdrop-blur-sm"
            />
            <input
              type="text"
              value={editAppearance.bg_color || "#ffffff"}
              onChange={(e) => setEditAppearance({ ...editAppearance, bg_color: e.target.value })}
              className="flex-1 border border-gray-300 dark:border-white/20 bg-white/50 dark:bg-white/5 dark:text-white p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono backdrop-blur-sm transition-all"
              placeholder="#ffffff"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('appearance.bg_image_url')}
          </label>
          <input
            type="text"
            placeholder="https://..."
            value={editAppearance.bg_image_url || ""}
            onChange={(e) => setEditAppearance({ ...editAppearance, bg_image_url: e.target.value })}
            className="border border-gray-300 dark:border-white/20 bg-white/50 dark:bg-white/5 dark:text-white dark:placeholder-gray-400 p-3 w-full rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all"
          />
        </div>
        
        <div>
          <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('appearance.bg_opacity')} <span className="font-mono text-blue-600 dark:text-blue-400">{editAppearance.bg_opacity}</span>
          </label>
          <input
            type="range"
            min="0" max="1" step="0.05"
            value={editAppearance.bg_opacity}
            onChange={(e) => setEditAppearance({ ...editAppearance, bg_opacity: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
        </div>
      </div>

      {/* Sektion: Schriftfarben */}
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          {t('appearance.font_colors')}
        </h4>
        
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-700">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            {t('appearance.mode_info', {
              mode: currentTheme === 'light' ? t('appearance.mode_light') : t('appearance.mode_dark'),
              icon: '☀/🌙'
            })}
          </p>
        </div>

        {/* Light Mode Schriftfarbe */}
        <div>
          <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('appearance.light_mode')}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={editAppearance.text_color_light || "#1f2937"}
              onChange={(e) => setEditAppearance({ ...editAppearance, text_color_light: e.target.value })}
              className="w-16 h-10 p-1 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"
            />
            <input
              type="text"
              value={editAppearance.text_color_light || "#1f2937"}
              onChange={(e) => setEditAppearance({ ...editAppearance, text_color_light: e.target.value })}
              className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
              placeholder="#1f2937"
            />
          </div>
        </div>

        {/* Dark Mode Schriftfarbe */}
        <div>
          <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('appearance.dark_mode')}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={editAppearance.text_color_dark || "#e5e7eb"}
              onChange={(e) => setEditAppearance({ ...editAppearance, text_color_dark: e.target.value })}
              className="w-16 h-10 p-1 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"
            />
            <input
              type="text"
              value={editAppearance.text_color_dark || "#e5e7eb"}
              onChange={(e) => setEditAppearance({ ...editAppearance, text_color_dark: e.target.value })}
              className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
              placeholder="#e5e7eb"
            />
          </div>
        </div>
      </div>

      {/* Sektion: Layout */}
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          {t('appearance.layout')}
        </h4>
        
        <div>
          <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('appearance.service_cols')} <span className="font-mono text-blue-600 dark:text-blue-400">{editAppearance.service_cols}</span>
          </label>
          <input
            type="range"
            min="2" max="10" step="1"
            value={editAppearance.service_cols}
            onChange={(e) => setEditAppearance({ ...editAppearance, service_cols: parseInt(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
        </div>
        
        <div>
          <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('appearance.shortcut_cols')} <span className="font-mono text-blue-600 dark:text-blue-400">{editAppearance.shortcut_cols}</span>
          </label>
          <input
            type="range"
            min="2" max="8" step="1"
            value={editAppearance.shortcut_cols}
            onChange={(e) => setEditAppearance({ ...editAppearance, shortcut_cols: parseInt(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
        </div>
      </div>

      {/* Sektion: Uhr */}
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          {t('appearance.clock_settings')}
        </h4>
        
        <div>
          <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('appearance.time_format')}
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer p-3 border-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700/50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20 border-gray-300 dark:border-gray-600">
              <input
                type="radio"
                name="clock_format"
                value="24h"
                checked={editAppearance.clock_format === '24h'}
                onChange={(e) => setEditAppearance({ ...editAppearance, clock_format: e.target.value })}
                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('appearance.format_24h')}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">14:30:45</div>
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer p-3 border-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700/50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20 border-gray-300 dark:border-gray-600">
              <input
                type="radio"
                name="clock_format"
                value="12h"
                checked={editAppearance.clock_format === '12h'}
                onChange={(e) => setEditAppearance({ ...editAppearance, clock_format: e.target.value })}
                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('appearance.format_12h')}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">2:30:45 PM</div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* NEU: Sektion: Widget Sichtbarkeit */}
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          {t('appearance.widgets')}
        </h4>
        
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer p-3 border-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700/50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20 border-gray-300 dark:border-gray-600">
            <input
              type="checkbox"
              checked={editAppearance.show_spotify ?? true}
              onChange={(e) => setEditAppearance({ ...editAppearance, show_spotify: e.target.checked })}
              className="appearance-none w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded-full bg-transparent checked:bg-transparent checked:border-gray-300 dark:checked:border-gray-600 relative checked:before:content-[''] checked:before:absolute checked:before:top-1/2 checked:before:left-1/2 checked:before:transform checked:before:-translate-x-1/2 checked:before:-translate-y-1/2 checked:before:w-2 checked:before:h-2 checked:before:bg-blue-600 checked:before:rounded-full focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-2xl flex-shrink-0">🎵</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('appearance.spotify_widget')}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t('appearance.show_music')}</div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-3 border-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700/50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20 border-gray-300 dark:border-gray-600">
            <input
              type="checkbox"
              checked={editAppearance.show_weather ?? true}
              onChange={(e) => setEditAppearance({ ...editAppearance, show_weather: e.target.checked })}
              className="appearance-none w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded-full bg-transparent checked:bg-transparent checked:border-gray-300 dark:checked:border-gray-600 relative checked:before:content-[''] checked:before:absolute checked:before:top-1/2 checked:before:left-1/2 checked:before:transform checked:before:-translate-x-1/2 checked:before:-translate-y-1/2 checked:before:w-2 checked:before:h-2 checked:before:bg-blue-600 checked:before:rounded-full focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-2xl flex-shrink-0">🌤️</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('appearance.weather_widget')}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t('appearance.show_weather')}</div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-3 border-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700/50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20 border-gray-300 dark:border-gray-600">
            <input
              type="checkbox"
              checked={editAppearance.show_clock ?? true}
              onChange={(e) => setEditAppearance({ ...editAppearance, show_clock: e.target.checked })}
              className="appearance-none w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded-full bg-transparent checked:bg-transparent checked:border-gray-300 dark:checked:border-gray-600 relative checked:before:content-[''] checked:before:absolute checked:before:top-1/2 checked:before:left-1/2 checked:before:transform checked:before:-translate-x-1/2 checked:before:-translate-y-1/2 checked:before:w-2 checked:before:h-2 checked:before:bg-blue-600 checked:before:rounded-full focus:ring-2 focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-2xl flex-shrink-0">🕐</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('appearance.clock_widget')}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t('appearance.show_clock')}</div>
            </div>
          </label>
        </div>
      </div>

      {/* Sektion: Wetter */}
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          {t('appearance.weather_section')}
        </h4>
        
        <div>
          <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('appearance.city')}
          </label>
          <input
            type="text"
            value={editAppearance.weather_city || ''}
            onChange={(e) => setEditAppearance({ ...editAppearance, weather_city: e.target.value })}
            placeholder={t('appearance.city_placeholder')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {/* Geocoding Info Anzeige */}
          {weatherLocationInfo && weatherLocationInfo.name && weatherLocationInfo.country && (
            <div className="mt-2 text-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-900/30 rounded px-2 py-1">
              <span className="font-semibold">{t('appearance.found_location')}</span> {weatherLocationInfo.name}, {weatherLocationInfo.country}
              {weatherLocationInfo.postal_code ? `${t('appearance.postal_code')}${weatherLocationInfo.postal_code}` : ''}
              {typeof weatherLocationInfo.latitude === 'number' && typeof weatherLocationInfo.longitude === 'number' ?
                `, (${weatherLocationInfo.latitude.toFixed(4)}, ${weatherLocationInfo.longitude.toFixed(4)})`
                : ''}
            </div>
          )}
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('appearance.weather_cache_info')}
          </p>
        </div>

        {/* Wetterdaten Felder Auswahl */}
        <div>
          <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('appearance.weather_fields')}
          </label>
          <div className="grid grid-cols-1 gap-3">
            {WEATHER_FIELDS.map(f => (
              <label key={f.key} className="flex items-center gap-3 cursor-pointer p-3 border-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700/50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20 border-gray-300 dark:border-gray-600">
                <input
                  type="checkbox"
                  checked={editAppearance.weather_fields?.includes(f.key) ?? (f.key === 'temperature' || f.key === 'humidity')}
                  onChange={e => {
                    const checked = e.target.checked;
                    let newFields = editAppearance.weather_fields ? [...editAppearance.weather_fields] : ['temperature', 'humidity'];
                    if (checked && !newFields.includes(f.key)) newFields.push(f.key);
                    if (!checked) newFields = newFields.filter(k => k !== f.key);
                    setEditAppearance({ ...editAppearance, weather_fields: newFields });
                  }}
                  className="appearance-none w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded-full bg-transparent checked:bg-transparent checked:border-gray-300 dark:checked:border-gray-600 relative checked:before:content-[''] checked:before:absolute checked:before:top-1/2 checked:before:left-1/2 checked:before:transform checked:before:-translate-x-1/2 checked:before:-translate-y-1/2 checked:before:w-2 checked:before:h-2 checked:before:bg-blue-600 checked:before:rounded-full focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-2xl flex-shrink-0" aria-hidden="true">{f.icon}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">{t(f.labelKey)}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      
      {/* Save Button */}
      <div>
        <button
          onClick={onSaveAppearance}
          disabled={isSavingAppearance}
          className={`bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg w-full font-medium transition-colors shadow-md hover:shadow-lg ${isSavingAppearance ? 'opacity-70 cursor-wait' : ''}`}
        >
          {isSavingAppearance ? t('common.saving') : showSaved ? t('common.saved') : t('common.save')}
        </button>
      </div>
    </div>
  );
}

export default AppearanceTab;
