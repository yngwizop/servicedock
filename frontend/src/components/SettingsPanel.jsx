import React from 'react';

function SettingsPanel({
  onClose,
  activeTab,
  setActiveTab,
  onAddService,
  serviceName, setServiceName, serviceDesc, setServiceDesc, serviceUrl, setServiceUrl, serviceIcon, setServiceIcon,
  onAddShortcut,
  shortcutName, setShortcutName, shortcutUrl, setShortcutUrl, shortcutIcon, setShortcutIcon,
  editAppearance, setEditAppearance, onSaveAppearance
}) {
  return (
    // NEU: Dark-Mode Hintergrund und Schatten
    <div
      className="absolute right-0 top-0 h-full w-96 bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg z-30 shadow-2xl dark:shadow-blue-900/50 p-6 overflow-y-auto"
    >
      <div className="flex justify-between items-center mb-6">
        {/* NEU: Dark-Mode Text */}
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Dashboard Settings</h2>
        {/* NEU: Dark-Mode Text */}
        <button onClick={onClose} className="text-3xl text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors">&times;</button>
      </div>

      {/* Tab-Navigation */}
      {/* NEU: Dark-Mode Border */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab("services")}
          // NEU: Dark-Mode Text und Border für aktiven/inaktiven Tab
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
          // NEU: Dark-Mode Text und Border für aktiven/inaktiven Tab
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
            // NEU: Dark-Mode Hintergrund und Border
            className="p-4 bg-white dark:bg-gray-700/50 shadow-inner rounded-lg border border-gray-200 dark:border-gray-600"
          >
            {/* NEU: Dark-Mode Text */}
            <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Neuen Service hinzufügen</h3>
            <div className="space-y-3">
              {/* NEU: Dark-Mode Inputs */}
              <input placeholder="Name" value={serviceName} onChange={(e) => setServiceName(e.target.value)} className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
              <input placeholder="Beschreibung" value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)} className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
              <input placeholder="URL" value={serviceUrl} onChange={(e) => setServiceUrl(e.target.value)} className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
              <input
                placeholder="Icon URL oder Emoji ✉️"
                value={serviceIcon} onChange={(e) => setServiceIcon(e.target.value)} className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
              {/* Button bleibt blau */}
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md font-medium w-full transition-colors">Hinzufügen</button>
            </div>
          </form>

          <form
            onSubmit={onAddShortcut}
            // NEU: Dark-Mode Hintergrund und Border
            className="p-4 bg-white dark:bg-gray-700/50 shadow-inner rounded-lg border border-gray-200 dark:border-gray-600"
          >
            {/* NEU: Dark-Mode Text */}
            <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Neuen Shortcut hinzufügen</h3>
            <div className="space-y-3">
              {/* NEU: Dark-Mode Inputs */}
              <input placeholder="Name" value={shortcutName} onChange={(e) => setShortcutName(e.target.value)} className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
              <input placeholder="URL" value={shortcutUrl} onChange={(e) => setShortcutUrl(e.target.value)} className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
              <input
                placeholder="Icon URL oder Emoji 🔗"
                value={shortcutIcon}
                onChange={(e) => setShortcutIcon(e.target.value)}
                className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {/* Button bleibt blau */}
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md font-medium w-full transition-colors">Hinzufügen</button>
            </div>
          </form>
        </div>
      )}

      {/* === Tab-Inhalt: Appearance === */}
      {activeTab === "appearance" && (
        <div className="space-y-4 p-1">
          {/* NEU: Dark-Mode Text */}
          <h3 className="font-semibold text-gray-700 dark:text-gray-200">Aussehen anpassen</h3>
          <div>
            {/* NEU: Dark-Mode Text */}
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Background Color</label>
            <input
              type="color"
              value={editAppearance.bg_color || "#ffffff"}
              onChange={(e) => setEditAppearance({ ...editAppearance, bg_color: e.target.value })}
              // NEU: Dark-Mode Border
              className="w-full h-10 p-1 border border-gray-300 dark:border-gray-600 rounded-md"
            />
          </div>
          <div>
            {/* NEU: Dark-Mode Text */}
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Background Image URL</label>
            {/* NEU: Dark-Mode Input */}
            <input
              type="text"
              placeholder="https://..."
              value={editAppearance.bg_image_url || ""}
              onChange={(e) => setEditAppearance({ ...editAppearance, bg_image_url: e.target.value })}
              className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            {/* NEU: Dark-Mode Text */}
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Background Opacity ({editAppearance.bg_opacity})</label>
            <input
              type="range"
              min="0" max="1" step="0.05"
              value={editAppearance.bg_opacity}
              onChange={(e) => setEditAppearance({ ...editAppearance, bg_opacity: parseFloat(e.target.value) })}
              className="w-full" // Range-Slider sehen oft in beiden Modes OK aus
            />
          </div>
          <div>
            {/* NEU: Dark-Mode Text */}
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
            {/* NEU: Dark-Mode Text */}
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
          {/* Button bleibt grün */}
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