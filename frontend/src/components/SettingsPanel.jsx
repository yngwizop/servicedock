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
        <div className="space-y-4 p-1">
          <h3 className="font-semibold text-gray-700 dark:text-gray-200">Aussehen anpassen</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Background Color</label>
            <input
              type="color"
              value={editAppearance.bg_color || "#ffffff"}
              onChange={(e) => setEditAppearance({ ...editAppearance, bg_color: e.target.value })}
              className="w-full h-10 p-1 border border-gray-300 dark:border-gray-600 rounded-md"
            />
          </div>

          {/* NEU: Schriftfarben direkt nach Background Color */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">Schriftfarben</h4>
            
            {/* NEU: Hinweis welcher Modus aktuell aktiv ist */}
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                💡 Aktuell im <strong>{currentTheme === 'light' ? 'Light' : 'Dark'} Mode</strong>. 
                Wechsle den Modus mit dem Mond/Sonne-Button, um die Farben zu sehen.
              </p>
            </div>

            {/* Light Mode Schriftfarbe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Schriftfarbe (Light Mode)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={editAppearance.text_color_light || "#1f2937"}
                  onChange={(e) => setEditAppearance({ ...editAppearance, text_color_light: e.target.value })}
                  className="w-16 h-10 p-1 border border-gray-300 dark:border-gray-600 rounded-md"
                />
                <input
                  type="text"
                  value={editAppearance.text_color_light || "#1f2937"}
                  onChange={(e) => setEditAppearance({ ...editAppearance, text_color_light: e.target.value })}
                  className="flex-1 border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                  placeholder="#1f2937"
                />
              </div>
            </div>

            {/* Dark Mode Schriftfarbe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Schriftfarbe (Dark Mode)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={editAppearance.text_color_dark || "#e5e7eb"}
                  onChange={(e) => setEditAppearance({ ...editAppearance, text_color_dark: e.target.value })}
                  className="w-16 h-10 p-1 border border-gray-300 dark:border-gray-600 rounded-md"
                />
                <input
                  type="text"
                  value={editAppearance.text_color_dark || "#e5e7eb"}
                  onChange={(e) => setEditAppearance({ ...editAppearance, text_color_dark: e.target.value })}
                  className="flex-1 border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                  placeholder="#e5e7eb"
                />
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Background Image URL</label>
            <input
              type="text"
              placeholder="https://..."
              value={editAppearance.bg_image_url || ""}
              onChange={(e) => setEditAppearance({ ...editAppearance, bg_image_url: e.target.value })}
              className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Background Opacity ({editAppearance.bg_opacity})</label>
            <input
              type="range"
              min="0" max="1" step="0.05"
              value={editAppearance.bg_opacity}
              onChange={(e) => setEditAppearance({ ...editAppearance, bg_opacity: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Service-Spalten (Desktop): {editAppearance.service_cols}
            </label>
            <input
              type="range"
              min="2" max="10" step="1"
              value={editAppearance.service_cols}
              onChange={(e) => setEditAppearance({ ...editAppearance, service_cols: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Shortcut-Spalten (Desktop): {editAppearance.shortcut_cols}
            </label>
            <input
              type="range"
              min="2" max="8" step="1"
              value={editAppearance.shortcut_cols}
              onChange={(e) => setEditAppearance({ ...editAppearance, shortcut_cols: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
          
          <button
            onClick={onSaveAppearance}
            className="bg-green-600 hover:bg-green-700 text-white p-2.5 rounded-md w-full font-medium transition-colors"
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}

export default SettingsPanel;