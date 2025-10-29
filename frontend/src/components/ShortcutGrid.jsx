import React, { useState, useRef } from 'react';
import ShortcutLink from './ShortcutLink';
import EditModal from './EditModal';

function ShortcutGrid({ 
  shortcuts, 
  setShortcuts, 
  isLoggedIn, 
  colsClass, 
  onUpdate, 
  onDelete,
  textColor,
  onReorder
}) {
  const [editingShortcut, setEditingShortcut] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOver, setDragOver] = useState({ id: null, side: null });
  const [dragLastX, setDragLastX] = useState(null);
  const [dragLastY, setDragLastY] = useState(null);
  const gridRef = useRef(null);

  const handleSave = async (updatedShortcut) => {
    // Erst den State aktualisieren
    setShortcuts(
      shortcuts.map((s) => (s.id === updatedShortcut.id ? updatedShortcut : s))
    );
    // Dann ans Backend senden (mit den aktualisierten Daten)
    await onUpdate(updatedShortcut.id, updatedShortcut);
  };

  const computeSide = (e, el) => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX;
    // nur links/rechts (mittig)
    return x < rect.left + rect.width / 2 ? 'left' : 'right';
  };

  const onDragStart = (e, id) => {
    e.dataTransfer.setData("text/plain", String(id));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(id);
    setDragLastX(e.clientX);
    setDragLastY(e.clientY);
    if (e.dataTransfer.setDragImage) {
      const crt = document.createElement('canvas');
      crt.width = 1; crt.height = 1;
      e.dataTransfer.setDragImage(crt, 0, 0);
    }
  };

  const onDragEnd = (e) => {
    setDraggingId(null);
    setDragOver({ id: null, side: null });
  };

  const onDragOverItem = (e, targetId) => {
    e.preventDefault();
    const el = e.currentTarget;
    const side = computeSide(e, el);
    if (dragOver.id !== targetId || dragOver.side !== side) {
      setDragOver({ id: targetId, side });
    }
  };

  const onDropOnItem = (e, targetId) => {
    e.preventDefault();
    const draggedId = Number(e.dataTransfer.getData("text/plain"));
    if (!draggedId || draggedId === targetId) {
      setDragOver({ id: null, side: null });
      setDraggingId(null);
      return;
    }

    const newShortcuts = [...shortcuts];
    const srcIndex = newShortcuts.findIndex(s => s.id === draggedId);
    if (srcIndex === -1) return;
    const [moved] = newShortcuts.splice(srcIndex, 1);

    const newTargetIndex = newShortcuts.findIndex(s => s.id === targetId);
    if (newTargetIndex === -1) {
      newShortcuts.push(moved);
    } else {
      const side = dragOver.side || 'right';
      const before = (side === 'left'); // NUR left als before
      const insertIndex = before ? newTargetIndex : newTargetIndex + 1;
      const safeIndex = Math.max(0, Math.min(newShortcuts.length, insertIndex));
      newShortcuts.splice(safeIndex, 0, moved);
    }

    setShortcuts(newShortcuts);
    setDragOver({ id: null, side: null });
    setDraggingId(null);
    if (onReorder) onReorder(newShortcuts.map(s => s.id));
  };

  // NEU: Fängt Drops auf dem Grid (z.B. Lücken oder unterstes Ende)
  const onDropGrid = (e) => {
    e.preventDefault();
    const draggedId = Number(e.dataTransfer.getData("text/plain"));
    if (!draggedId) return;

    const srcIndex = shortcuts.findIndex(s => s.id === draggedId);
    if (srcIndex === -1) return;

    if (srcIndex === shortcuts.length - 1) {
      setDragOver({ id: null, side: null });
      setDraggingId(null);
      return;
    }

    const newShortcuts = [...shortcuts];
    const [moved] = newShortcuts.splice(srcIndex, 1);
    newShortcuts.push(moved);

    setShortcuts(newShortcuts);
    setDragOver({ id: null, side: null });
    setDraggingId(null);
    if (onReorder) onReorder(newShortcuts.map(s => s.id));
  };

  return (
    <div className="mb-10">
      <h2 
        className="text-2xl font-semibold mb-4"
        style={{ color: textColor }}
      >
        Shortcuts
      </h2>

      <div
        ref={gridRef}
        onDragOver={(e) => e.preventDefault()}   // NEU
        onDrop={onDropGrid}                      // NEU
        className={`grid grid-cols-1 md:grid-cols-3 ${colsClass} gap-5`}
      >
        {shortcuts.map((s) => (
          <div 
            key={s.id} 
            className={`relative group ${isLoggedIn ? (draggingId === s.id ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
            draggable={isLoggedIn}
            onDragStart={(e) => onDragStart(e, s.id)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => onDragOverItem(e, s.id)}
            onDrop={(e) => onDropOnItem(e, s.id)}
          >
            {/* Insert indicator (links) */}
            {dragOver.id === s.id && dragOver.side === 'left' && draggingId && (
              <div className="absolute left-0 top-2 bottom-2 w-1 rounded bg-blue-600 z-20 transform -translate-x-1 transition-all"></div>
            )}

            {/* Insert indicator (rechts) */}
            {dragOver.id === s.id && dragOver.side === 'right' && draggingId && (
              <div className="absolute right-0 top-2 bottom-2 w-1 rounded bg-blue-600 z-20 transform translate-x-1 transition-all"></div>
            )}

            {/* ACTUAL SHORTCUT CONTENT */}
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