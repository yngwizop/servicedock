import React, { useState, useEffect, useRef } from 'react';
import { Image, Palette, SquaresFour, Eye, CloudSun, UploadSimple, Trash, CheckCircle, Link as LinkIcon, CaretDown, CaretUp, XCircle } from 'phosphor-react';
import { useTranslation } from 'react-i18next';
import { authenticatedFetch } from '../../utils/auth';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
  (window.location.port === '' ? 
    `${window.location.protocol}//${window.location.hostname}` :
    `${window.location.protocol}//${window.location.hostname}:8000`
  );

const WEATHER_FIELDS = [
  { key: 'temperature', labelKey: 'appearance.temperature', icon: '🌡️' },
  { key: 'humidity', labelKey: 'appearance.humidity', icon: '💧' },
  { key: 'wind', labelKey: 'appearance.wind', icon: '🌀' },
  { key: 'precipitation', labelKey: 'appearance.precipitation', icon: '🌧️' },
  { key: 'cloudCover', labelKey: 'appearance.cloud_cover', icon: '☁️' },
  { key: 'pressure', labelKey: 'appearance.pressure', icon: '🔽' }
];

// Gebundelte Preset-Wallpapers (Unsplash, lizenzfrei)
const PRESET_WALLPAPERS = [
  { id: 'mountains', nameKey: 'wallpaper.mountains', file: '/wallpapers/mountains.jpg', author: 'Samuel Ferrara', unsplash: 'https://unsplash.com/@samferrara' },
  { id: 'ocean', nameKey: 'wallpaper.ocean', file: '/wallpapers/ocean.jpg', author: 'Sean Oulashin', unsplash: 'https://unsplash.com/@oulashin' },
  { id: 'forest', nameKey: 'wallpaper.forest', file: '/wallpapers/forest.jpg', author: 'Casey Horner', unsplash: 'https://unsplash.com/@mischievous_penguins' },
  { id: 'aurora', nameKey: 'wallpaper.aurora', file: '/wallpapers/aurora.jpg', author: 'Jonatan Pie', unsplash: 'https://unsplash.com/@r3dmax' },
  { id: 'stars', nameKey: 'wallpaper.stars', file: '/wallpapers/stars.jpg', author: 'Benjamin Voros', unsplash: 'https://unsplash.com/@vorosbenisop' },
  { id: 'dark-peaks', nameKey: 'wallpaper.dark_peaks', file: '/wallpapers/dark-peaks.jpg', author: 'Nathan Anderson', unsplash: 'https://unsplash.com/@nathananderson' },
  { id: 'green-hills', nameKey: 'wallpaper.green_hills', file: '/wallpapers/green-hills.jpg', author: 'Qingbao Meng', unsplash: 'https://unsplash.com/@ideasboom' },
  { id: 'summit', nameKey: 'wallpaper.summit', file: '/wallpapers/summit.jpg', author: 'Daniel Leone', unsplash: 'https://unsplash.com/@danielleone' },
  { id: 'desert', nameKey: 'wallpaper.desert', file: '/wallpapers/desert.jpg', author: 'Keith Hardy', unsplash: 'https://unsplash.com/@keithhardy2001' },
];

// Leichtere Sub-Sektion innerhalb der äußeren Glass-Card (kein doppelter Glaseffekt)
const sectionCard = "bg-white/30 dark:bg-white/[0.04] rounded-xl p-5 border border-gray-200/40 dark:border-white/[0.06]";
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
  const fileInputRef = useRef(null);
  const [uploadedWallpapers, setUploadedWallpapers] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Hochgeladene Wallpapers vom Backend laden
  useEffect(() => {
    const fetchUploaded = async () => {
      try {
        const res = await authenticatedFetch(`${BACKEND_URL}/api/wallpapers`);
        if (res.ok) {
          const data = await res.json();
          setUploadedWallpapers(data);
        }
      } catch (err) {
        console.error('Fehler beim Laden der Wallpapers:', err);
      }
    };
    fetchUploaded();
  }, []);

  // Wallpaper Upload Handler
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await authenticatedFetch(`${BACKEND_URL}/api/wallpapers/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (res.ok) {
        const data = await res.json();
        // Wallpaper direkt auswählen
        setEditAppearance({ ...editAppearance, bg_image_url: data.url });
        // Liste aktualisieren
        setUploadedWallpapers(prev => [...prev, { filename: data.filename, url: data.url, size: data.size }]);
      } else {
        const err = await res.json().catch(() => ({ detail: 'Upload fehlgeschlagen' }));
        alert(err.detail || 'Upload fehlgeschlagen');
      }
    } catch (err) {
      console.error('Upload Fehler:', err);
      alert('Upload fehlgeschlagen');
    } finally {
      setIsUploading(false);
      // File Input zurücksetzen für erneuten Upload derselben Datei
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Hochgeladenes Wallpaper löschen
  const handleDeleteUploaded = async (filename) => {
    if (!confirm(t('wallpaper.delete_confirm'))) return;
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/wallpapers/${filename}`, { method: 'DELETE' });
      if (res.ok) {
        setUploadedWallpapers(prev => prev.filter(w => w.filename !== filename));
        // Falls das gelöschte Wallpaper aktiv war, URL leeren
        if (editAppearance.bg_image_url === `/api/wallpapers/${filename}`) {
          setEditAppearance({ ...editAppearance, bg_image_url: '' });
        }
      }
    } catch (err) {
      console.error('Fehler beim Löschen:', err);
    }
  };

  // Prüfen ob ein Wallpaper aktiv (ausgewählt) ist
  const isActiveWallpaper = (url) => {
    return editAppearance.bg_image_url === url;
  };

  // URL initial als "extern" erkennen → URL-Input anzeigen
  const isExternalUrl = editAppearance.bg_image_url && 
    !editAppearance.bg_image_url.startsWith('/wallpapers/') && 
    !editAppearance.bg_image_url.startsWith('/api/wallpapers/') &&
    editAppearance.bg_image_url.startsWith('http');

  return (
    <div className="space-y-6">
      {/* Sektion: Wallpaper */}
      <div className={sectionCard}>
        <SectionHeader icon={Image} title={t('wallpaper.title')} />

        {/* Preset-Galerie */}
        <div className="mb-5">
          <label className={`${labelClass} mb-3`}>{t('wallpaper.presets')}</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {/* "Kein Wallpaper" Option */}
            <button
              type="button"
              onClick={() => setEditAppearance({ ...editAppearance, bg_image_url: '' })}
              className={`group relative rounded-xl overflow-hidden border-2 transition-all duration-200 aspect-[16/10] flex items-center justify-center ${
                !editAppearance.bg_image_url
                  ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/20'
                  : 'border-gray-300/50 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/20'
              }`}
            >
              <div className="flex flex-col items-center gap-1 text-gray-400 dark:text-gray-500">
                <XCircle size={24} weight="duotone" />
                <span className="text-[10px] font-medium">{t('wallpaper.none')}</span>
              </div>
              {!editAppearance.bg_image_url && (
                <div className="absolute top-1 right-1">
                  <CheckCircle size={18} weight="fill" className="text-blue-500 drop-shadow" />
                </div>
              )}
            </button>

            {/* Preset Wallpapers */}
            {PRESET_WALLPAPERS.map((wp, index) => (
              <button
                key={wp.id}
                type="button"
                onClick={() => setEditAppearance({ ...editAppearance, bg_image_url: wp.file })}
                className={`group relative rounded-xl overflow-hidden border-2 transition-all duration-200 aspect-[16/10] bg-gray-200 dark:bg-gray-700 ${
                  isActiveWallpaper(wp.file)
                    ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/20 scale-[1.02]'
                    : 'border-gray-300/50 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/20 hover:scale-[1.02]'
                }`}
              >
                <img
                  src={wp.file}
                  alt={t(wp.nameKey)}
                  loading={index < 5 ? "eager" : "lazy"}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4">
                  <span className="text-[10px] font-medium text-white drop-shadow-sm">{t(wp.nameKey)}</span>
                  <a
                    href={wp.unsplash}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="block text-[8px] text-white/0 group-hover:text-white/70 transition-all duration-200 hover:text-white hover:underline truncate"
                    title={`${t('wallpaper.photo_by')} ${wp.author} (Unsplash)`}
                  >
                    {t('wallpaper.photo_by')} {wp.author}
                  </a>
                </div>
                {isActiveWallpaper(wp.file) && (
                  <div className="absolute top-1 right-1">
                    <CheckCircle size={18} weight="fill" className="text-blue-500 drop-shadow" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Uploads */}
        {(uploadedWallpapers.length > 0 || true) && (
          <div className="mb-5">
            <label className={`${labelClass} mb-3`}>{t('wallpaper.custom_uploads')}</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
              {/* Hochgeladene Wallpapers */}
              {uploadedWallpapers.map(wp => (
                <div key={wp.filename} className="relative group">
                  <button
                    type="button"
                    onClick={() => setEditAppearance({ ...editAppearance, bg_image_url: wp.url })}
                    className={`w-full rounded-xl overflow-hidden border-2 transition-all duration-200 aspect-[16/10] ${
                      isActiveWallpaper(wp.url)
                        ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/20 scale-[1.02]'
                        : 'border-gray-300/50 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/20 hover:scale-[1.02]'
                    }`}
                  >
                    <img
                      src={wp.url}
                      alt={wp.filename}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    {isActiveWallpaper(wp.url) && (
                      <div className="absolute top-1 right-1">
                        <CheckCircle size={18} weight="fill" className="text-blue-500 drop-shadow" />
                      </div>
                    )}
                  </button>
                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDeleteUploaded(wp.filename); }}
                    className="absolute top-1 left-1 p-1 rounded-lg bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                    title={t('common.delete')}
                  >
                    <Trash size={12} weight="bold" />
                  </button>
                </div>
              ))}

              {/* Upload Button */}
              <label
                className={`relative rounded-xl overflow-hidden border-2 border-dashed transition-all duration-200 aspect-[16/10] flex flex-col items-center justify-center cursor-pointer ${
                  isUploading
                    ? 'border-blue-400 bg-blue-500/10'
                    : 'border-gray-300/50 dark:border-white/15 hover:border-blue-400 dark:hover:border-blue-400/50 hover:bg-blue-500/5'
                }`}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-medium text-blue-500">{t('wallpaper.uploading')}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-gray-400 dark:text-gray-500">
                    <UploadSimple size={22} weight="duotone" />
                    <span className="text-[10px] font-medium">{t('wallpaper.upload')}</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('wallpaper.upload_hint')}
            </p>
          </div>
        )}

        {/* Custom URL (eingeklappt) */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <LinkIcon size={16} weight="duotone" />
            {t('wallpaper.custom_url')}
            {showUrlInput ? <CaretUp size={14} /> : <CaretDown size={14} />}
          </button>
          {(showUrlInput || isExternalUrl) && (
            <div className="mt-3">
              <input
                type="text"
                placeholder="https://..."
                value={editAppearance.bg_image_url || ""}
                onChange={(e) => setEditAppearance({ ...editAppearance, bg_image_url: e.target.value })}
                className={inputClass}
              />
            </div>
          )}
        </div>

        {/* Background Color */}
        <div className="space-y-4 pt-4 border-t border-gray-200/50 dark:border-white/[0.06]">
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
