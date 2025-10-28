import React, { useState } from 'react';
import ShortcutLink from './ShortcutLink';
import EditModal from './EditModal';

function ShortcutGrid({ 
  shortcuts, 
  setShortcuts, 
  isLoggedIn, 
  colsClass, 
  onUpdate, 
  onDelete,
  textColor
}) {
  const [editingShortcut, setEditingShortcut] = useState(null);

  const handleSave = async (updatedShortcut) => {
    // Erst den State aktualisieren
    setShortcuts(
      shortcuts.map((s) => (s.id === updatedShortcut.id ? updatedShortcut : s))
    );
    // Dann ans Backend senden (mit den aktualisierten Daten)
    await onUpdate(updatedShortcut.id, updatedShortcut);
  };

  return (
    <div className="mb-10">
      <h2 
        className="text-2xl font-semibold mb-4"
        style={{ color: textColor }}
      >
        Shortcuts
      </h2>
      <div className={`grid grid-cols-1 md:grid-cols-3 ${colsClass} gap-5`}>
        {shortcuts.map((s) => (
          <div key={s.id} className="relative group">
            <ShortcutLink shortcut={s} />
            
            {/* Edit-Button (nur im eingeloggten Modus) */}
            {isLoggedIn && (
              <button
                onClick={() => setEditingShortcut(s)}
                className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                title="Bearbeiten"
              >
                ✏️
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingShortcut && (
        <EditModal
          item={editingShortcut}
          type="shortcut"
          onClose={() => setEditingShortcut(null)}
          onSave={handleSave}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

export default ShortcutGrid;