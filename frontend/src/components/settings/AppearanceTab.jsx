import React from 'react';
import { Image, Palette, SquaresFour, Eye, CloudSun } from 'phosphor-react';
import { useTranslation } from 'react-i18next';

const WEATHER_FIELDS = [
  { key: 'temperature', labelKey: 'appearance.temperature', icon: '🌡️' },
  { key: 'humidity', labelKey: 'appearance.humidity', icon: '💧' },
  { key: 'wind', labelKey: 'appearance.wind', icon: '🌀' },
  { key: 'precipitation', labelKey: 'appearance.precipitation', icon: '🌧️' },
  { key: 'cloudCover', labelKey: 'appearance.cloud_cover', icon: '☁️' },
  { key: 'pressure', labelKey: 'appearance.pressure', icon: '🔽' }
];

// Einheitliche glasmorphe Card-Klasse (wie Security/Proxmox)
const sectionCard = "bg-white/70 dark:bg-gray-900/70 backdrop-blur-md rounded-2xl shadow-xl p-6 border border-gray-300/50 dark:border-white/[0.12]";
const inputClass = "w-full border border-gray-300/50 dark:border-white/10 bg-white/50 dark:bg-white/5 dark:text-white dark:placeholder-gray-400 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all text-sm";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2";

function SectionHeader({ icon: Icon, title, color = "text-blue-400" }) {
  return (
    <h4 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2.5 mb-5" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
      <Icon size={22} weight="duotone" className={color} />
      {title}
    </h4>
  );
}

function ToggleSwitch({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</div>
        {description && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
          checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

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
      <div className={sectionCard}>
        <SectionHeader icon={Image} title={t('appearance.background')} />
        
        <div className="space-y-4">
          <div>
            <label className={labelClass}>{t('appearance.bg_color')}</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={editAppearance.bg_color || "#ffffff"}
                onChange={(e) => setEditAppearance({ ...editAppearance, bg_color: e.target.value })}
                className="w-14 h-11 p-1 border border-gray-300/50 dark:border-white/10 rounded-xl cursor-pointer bg-white/50 dark:bg-white/5 backdrop-blur-sm"
              />
              <input
                type="text"
                value={editAppearance.bg_color || "#ffffff"}
                onChange={(e) => setEditAppearance({ ...editAppearance, bg_color: e.target.value })}
                className={`${inputClass} font-mono`}
                placeholder="#ffffff"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>{t('appearance.bg_image_url')}</label>
            <input
              type="text"
              placeholder="https://..."
              value={editAppearance.bg_image_url || ""}
              onChange={(e) => setEditAppearance({ ...editAppearance, bg_image_url: e.target.value })}
              className={inputClass}
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('appearance.bg_opacity')}</label>
              <span className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">{editAppearance.bg_opacity}</span>
            </div>
            <input
              type="range"
              min="0" max="1" step="0.05"
              value={editAppearance.bg_opacity}
              onChange={(e) => setEditAppearance({ ...editAppearance, bg_opacity: parseFloat(e.target.value) })}
              className="w-full h-2 bg-gray-300/30 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        </div>
      </div>

      {/* Sektion: Schriftfarben */}
      <div className={sectionCard}>
        <SectionHeader icon={Palette} title={t('appearance.font_colors')} color="text-pink-400" />
        
        <div className="p-3 mb-5 bg-blue-500/10 dark:bg-blue-500/10 rounded-xl border border-blue-500/20">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {t('appearance.mode_info', {
              mode: currentTheme === 'light' ? t('appearance.mode_light') : t('appearance.mode_dark'),
              icon: '☀/🌙'
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>{t('appearance.light_mode')}</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={editAppearance.text_color_light || "#1f2937"}
                onChange={(e) => setEditAppearance({ ...editAppearance, text_color_light: e.target.value })}
                className="w-14 h-11 p-1 border border-gray-300/50 dark:border-white/10 rounded-xl cursor-pointer bg-white/50 dark:bg-white/5"
              />
              <input
                type="text"
                value={editAppearance.text_color_light || "#1f2937"}
                onChange={(e) => setEditAppearance({ ...editAppearance, text_color_light: e.target.value })}
                className={`${inputClass} font-mono`}
                placeholder="#1f2937"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>{t('appearance.dark_mode')}</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={editAppearance.text_color_dark || "#e5e7eb"}
                onChange={(e) => setEditAppearance({ ...editAppearance, text_color_dark: e.target.value })}
                className="w-14 h-11 p-1 border border-gray-300/50 dark:border-white/10 rounded-xl cursor-pointer bg-white/50 dark:bg-white/5"
              />
              <input
                type="text"
                value={editAppearance.text_color_dark || "#e5e7eb"}
                onChange={(e) => setEditAppearance({ ...editAppearance, text_color_dark: e.target.value })}
                className={`${inputClass} font-mono`}
                placeholder="#e5e7eb"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sektion: Layout & Columns */}
      <div className={sectionCard}>
        <SectionHeader icon={SquaresFour} title={t('appearance.layout')} color="text-cyan-400" />
        
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('appearance.service_cols')}</label>
              <span className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">{editAppearance.service_cols}</span>
            </div>
            <input
              type="range"
              min="2" max="10" step="1"
              value={editAppearance.service_cols}
              onChange={(e) => setEditAppearance({ ...editAppearance, service_cols: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-300/30 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-600"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('appearance.shortcut_cols')}</label>
              <span className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">{editAppearance.shortcut_cols}</span>
            </div>
            <input
              type="range"
              min="2" max="8" step="1"
              value={editAppearance.shortcut_cols}
              onChange={(e) => setEditAppearance({ ...editAppearance, shortcut_cols: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-300/30 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        </div>
      </div>

      {/* Sektion: Widgets & Uhr */}
      <div className={sectionCard}>
        <SectionHeader icon={Eye} title={t('appearance.widgets')} color="text-violet-400" />
        
        <div className="divide-y divide-gray-200/50 dark:divide-white/[0.06]">
          <ToggleSwitch
            checked={editAppearance.show_clock ?? true}
            onChange={(val) => setEditAppearance({ ...editAppearance, show_clock: val })}
            label={t('appearance.clock_widget')}
            description={t('appearance.show_clock')}
          />
          <ToggleSwitch
            checked={editAppearance.show_weather ?? true}
            onChange={(val) => setEditAppearance({ ...editAppearance, show_weather: val })}
            label={t('appearance.weather_widget')}
            description={t('appearance.show_weather')}
          />
          <ToggleSwitch
            checked={editAppearance.show_spotify ?? true}
            onChange={(val) => setEditAppearance({ ...editAppearance, show_spotify: val })}
            label={t('appearance.spotify_widget')}
            description={t('appearance.show_music')}
          />
        </div>

        {/* Clock Format */}
        <div className="mt-5 pt-5 border-t border-gray-200/50 dark:border-white/[0.06]">
          <label className={labelClass}>{t('appearance.time_format')}</label>
          <div className="flex gap-3">
            {[
              { value: '24h', label: t('appearance.format_24h'), example: '14:30' },
              { value: '12h', label: t('appearance.format_12h'), example: '2:30 PM' },
            ].map(opt => (
              <label
                key={opt.value}
                className={`flex-1 flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-all duration-200 ${
                  editAppearance.clock_format === opt.value
                    ? 'border-blue-500/50 bg-blue-500/10 dark:bg-blue-500/10'
                    : 'border-gray-300/50 dark:border-white/10 hover:border-gray-400/70 dark:hover:border-white/20'
                }`}
              >
                <input
                  type="radio"
                  name="clock_format"
                  value={opt.value}
                  checked={editAppearance.clock_format === opt.value}
                  onChange={(e) => setEditAppearance({ ...editAppearance, clock_format: e.target.value })}
                  className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{opt.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{opt.example}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Sektion: Wetter */}
      <div className={sectionCard}>
        <SectionHeader icon={CloudSun} title={t('appearance.weather_section')} color="text-amber-400" />
        
        <div className="space-y-5">
          <div>
            <label className={labelClass}>{t('appearance.city')}</label>
            <input
              type="text"
              value={editAppearance.weather_city || ''}
              onChange={(e) => setEditAppearance({ ...editAppearance, weather_city: e.target.value })}
              placeholder={t('appearance.city_placeholder')}
              className={inputClass}
            />
            {weatherLocationInfo && weatherLocationInfo.name && weatherLocationInfo.country && (
              <div className="mt-2 text-sm text-gray-700 dark:text-gray-200 bg-white/40 dark:bg-white/5 rounded-xl px-3 py-2 border border-gray-300/30 dark:border-white/[0.06]">
                <span className="font-semibold">{t('appearance.found_location')}</span> {weatherLocationInfo.name}, {weatherLocationInfo.country}
                {weatherLocationInfo.postal_code ? `${t('appearance.postal_code')}${weatherLocationInfo.postal_code}` : ''}
                {typeof weatherLocationInfo.latitude === 'number' && typeof weatherLocationInfo.longitude === 'number' ?
                  `, (${weatherLocationInfo.latitude.toFixed(4)}, ${weatherLocationInfo.longitude.toFixed(4)})`
                  : ''}
              </div>
            )}
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              {t('appearance.weather_cache_info')}
            </p>
          </div>

          <div>
            <label className={labelClass}>{t('appearance.weather_fields')}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {WEATHER_FIELDS.map(f => (
                <label
                  key={f.key}
                  className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-all duration-200 ${
                    (editAppearance.weather_fields?.includes(f.key) ?? (f.key === 'temperature' || f.key === 'humidity'))
                      ? 'border-blue-500/50 bg-blue-500/10 dark:bg-blue-500/10'
                      : 'border-gray-300/50 dark:border-white/10 hover:border-gray-400/70 dark:hover:border-white/20'
                  }`}
                >
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
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-lg flex-shrink-0" aria-hidden="true">{f.icon}</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t(f.labelKey)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Save Button */}
      <button
        onClick={onSaveAppearance}
        disabled={isSavingAppearance}
        className={`w-full py-3 px-4 rounded-xl font-semibold text-white shadow-lg transition-all duration-200 ${
          showSaved
            ? 'bg-green-600'
            : 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl hover:scale-[1.01]'
        } ${isSavingAppearance ? 'opacity-70 cursor-wait' : ''}`}
      >
        {isSavingAppearance ? t('common.saving') : showSaved ? `✓ ${t('common.saved')}` : t('common.save')}
      </button>
    </div>
  );
}

export default AppearanceTab;
