import React from 'react';
import ShortcutLink from './ShortcutLink';

// HIER SIND DEINE PROPS
function ShortcutGrid({ 
  shortcuts, 
  setShortcuts, 
  isLoggedIn, 
  colsClass, 
  onUpdate, 
  onDelete 
}) {
  return (
    <div className="mb-10">
      <h2 className="text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
        Shortcuts
      </h2>
      <div className={`grid grid-cols-1 md:grid-cols-3 ${colsClass} gap-5`}>
        {shortcuts.map((s) => (
          <div
            key={s.id}
            className={`transition-all ${
              isLoggedIn
                ? "bg-white/90 dark:bg-gray-700/90 backdrop-blur-sm shadow-lg rounded-xl p-4 ring-2 ring-blue-500/50"
                : ""
            }`}
          >
            {isLoggedIn ? (
              <>
                <input
                  placeholder="Name"
                  className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded p-1.5 mb-2 w-full font-semibold text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  value={s.name}
                  // HIER IST DEINE LOGIK
                  onChange={(e) =>
                    setShortcuts(
                      shortcuts.map((sc) =>
                        sc.id === s.id ? { ...sc, name: e.target.value } : sc
                      )
                    )
                  }
                />
                <input
                  placeholder="URL"
                  className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded p-1.5 mb-2 w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  value={s.url}
                  // HIER IST DEINE LOGIK
                  onChange={(e) =>
                    setShortcuts(
                      shortcuts.map((sc) =>
                        sc.id === s.id ? { ...sc, url: e.target.value } : sc
                      )
                    )
                  }
                />
                <input
                  placeholder="Icon URL oder Emoji 🔗"
                  className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded p-1.5 mb-2 w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  value={s.icon || ""}
                  // HIER IST DEINE LOGIK
                  onChange={(e) =>
                    setShortcuts(
                      shortcuts.map((sc) =>
                        sc.id === s.id ? { ...sc, icon: e.target.value } : sc
                      )
                    )
                  }
                />
                <div className="flex justify-between items-center mt-2">
                  <button
                    onClick={() => onUpdate(s.id)}
                    className="bg-green-600 hover:bg-green-700 text-white p-1.5 px-3 rounded-md text-sm font-medium transition-colors"
                  >
                    Speichern
                  </button>
                  <button
                    onClick={() => onDelete(s.id)}
                    className="text-gray-500 hover:text-red-600 p-1 rounded-md transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </>
            ) : (
              <ShortcutLink shortcut={s} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ShortcutGrid;