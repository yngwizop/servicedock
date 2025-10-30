import React from 'react';

function SettingsPanel({
  onClose,
  activeTab,
  setActiveTab,
  onAddService,
  serviceName, setServiceName, serviceDesc, setServiceDesc, serviceUrl, setServiceUrl, serviceIcon, setServiceIcon,
  onAddShortcut,
  shortcutName, setShortcutName, shortcutUrl, setShortcutUrl, shortcutIcon, setShortcutIcon,
  editAppearance, setEditAppearance, onSaveAppearance,
  currentTheme // NEU: Aktuelles Theme
}) {
  return (
    <div
      className="fixed right-0 top-0 h-screen w-96 bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg z-30 shadow-2xl dark:shadow-blue-900/50 p-6 overflow-y-auto"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Dashboard Settings</h2>
        <button onClick={onClose} className="text-3xl text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors">&times;</button>
      </div>

      {/* Tab-Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab("services")}
          className={`py-2 px-4 transition-all ${
            activeTab === "services"
              ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 font-semibold"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100"
          }`}
        >
          Services & Shortcuts
        </button>
        <button
          onClick={() => setActiveTab("appearance")}
          className={`py-2 px-4 transition-all ${
            activeTab === "appearance"
              ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 font-semibold"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100"
          }`}
        >
          Appearance
        </button>
      </div>

      {/* === Tab-Inhalt: Services === */}
      {activeTab === "services" && (
        <div className="space-y-6">
          <form
            onSubmit={onAddService}
            className="p-4 bg-white dark:bg-gray-700/50 shadow-inner rounded-lg border border-gray-200 dark:border-gray-600"
          >
            <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Neuen Service hinzufügen</h3>
            <div className="space-y-3">
              <input placeholder="Name" value={serviceName} onChange={(e) => setServiceName(e.target.value)} className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
              <input placeholder="Beschreibung" value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)} className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
              <input placeholder="URL" value={serviceUrl} onChange={(e) => setServiceUrl(e.target.value)} className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
              <input
                placeholder="Icon URL oder Emoji ✉️"
                value={serviceIcon} onChange={(e) => setServiceIcon(e.target.value)} className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md font-medium w-full transition-colors">Hinzufügen</button>
            </div>
          </form>

          <form
            onSubmit={onAddShortcut}
            className="p-4 bg-white dark:bg-gray-700/50 shadow-inner rounded-lg border border-gray-200 dark:border-gray-600"
          >
            <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Neuen Shortcut hinzufügen</h3>
            <div className="space-y-3">
              <input placeholder="Name" value={shortcutName} onChange={(e) => setShortcutName(e.target.value)} className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
              <input placeholder="URL" value={shortcutUrl} onChange={(e) => setShortcutUrl(e.target.value)} className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
              <input
                placeholder="Icon URL oder Emoji 🔗"
                value={shortcutIcon}
                onChange={(e) => setShortcutIcon(e.target.value)}
                className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md font-medium w-full transition-colors">Hinzufügen</button>
            </div>
          </form>

          {/* Info-Hinweis für Icons */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              💡 <strong>Tipp:</strong> Icons können von{' '}
              <a
                href="https://selfh.st/icons/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-600 dark:hover:text-blue-200 font-medium"
              >
                selfh.st/icons
              </a>
              {' '}bezogen werden.
            </p>
          </div>
        </div>
      )}

      {/* === Tab-Inhalt: Appearance === */}
      {activeTab === "appearance" && (
        <div className="space-y-6 p-1">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Aussehen anpassen</h3>
          
          {/* Sektion: Hintergrund */}
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              🎨 Hintergrund
            </h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hintergrundfarbe
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={editAppearance.bg_color || "#ffffff"}
                  onChange={(e) => setEditAppearance({ ...editAppearance, bg_color: e.target.value })}
                  className="w-16 h-10 p-1 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"
                />
                <input
                  type="text"
                  value={editAppearance.bg_color || "#ffffff"}
                  onChange={(e) => setEditAppearance({ ...editAppearance, bg_color: e.target.value })}
                  className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hintergrundbild URL
              </label>
              <input
                type="text"
                placeholder="https://..."
                value={editAppearance.bg_image_url || ""}
                onChange={(e) => setEditAppearance({ ...editAppearance, bg_image_url: e.target.value })}
                className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bild-Deckkraft: <span className="font-mono text-blue-600 dark:text-blue-400">{editAppearance.bg_opacity}</span>
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
              ✏️ Schriftfarben
            </h4>
            
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-700">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                💡 Aktuell im <strong>{currentTheme === 'light' ? 'Light' : 'Dark'} Mode</strong>. 
                Wechsle den Modus mit dem 🌙/☀️-Button, um die Farben zu testen.
              </p>
            </div>

            {/* Light Mode Schriftfarbe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Light Mode
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dark Mode
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
              📐 Layout & Spalten
            </h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Service-Spalten (Desktop): <span className="font-mono text-blue-600 dark:text-blue-400">{editAppearance.service_cols}</span>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Shortcut-Spalten (Desktop): <span className="font-mono text-blue-600 dark:text-blue-400">{editAppearance.shortcut_cols}</span>
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
              🕐 Uhr-Einstellungen
            </h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Zeitformat
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
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">24-Stunden</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">14:30:45</div>
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
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">12-Stunden</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">2:30:45 PM</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Sektion: Wetter */}
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              🌤️ Wetter-Widget
            </h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stadt
              </label>
              <input
                type="text"
                value={editAppearance.weather_city || ''}
                onChange={(e) => setEditAppearance({ ...editAppearance, weather_city: e.target.value })}
                placeholder="z.B. Berlin, München, Hamburg"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Wetterdaten werden alle 30 Minuten aktualisiert
              </p>
            </div>
          </div>
          
          {/* Save Button */}
          <button
            onClick={onSaveAppearance}
            className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg w-full font-medium transition-colors shadow-md hover:shadow-lg"
          >
            ✓ Änderungen speichern
          </button>
        </div>
      )}
    </div>
  );
}

export default SettingsPanel;