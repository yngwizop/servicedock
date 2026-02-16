import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ShortcutLink from './ShortcutLink';
import EditModal from './EditModal';
import { Pencil } from 'phosphor-react';

function ShortcutGrid({ 
  shortcuts, 
  setShortcuts, 
  isLoggedIn, 
  editMode = false,
  colsClass, 
  onUpdate, 
  onDelete,
  textColor,
  onReorder
}) {
  const { t } = useTranslation();
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
    e.stopPropagation();
    const el = e.currentTarget;
    const side = computeSide(e, el);
    if (dragOver.id !== targetId || dragOver.side !== side) {
      setDragOver({ id: targetId, side });
    }
  };

  const onDropOnItem = (e, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedIdStr = e.dataTransfer.getData('text/plain');
    if (!draggedIdStr) {
      setDragOver({ id: null, side: null });
      setDraggingId(null);
      return;
    }

    // Use string comparisons to be robust for numeric and string IDs
    if (String(draggedIdStr) === String(targetId)) {
      setDragOver({ id: null, side: null });
      setDraggingId(null);
      return;
    }

    const srcIndex = shortcuts.findIndex(s => String(s.id) === String(draggedIdStr));
    if (srcIndex === -1) {
      setDragOver({ id: null, side: null });
      setDraggingId(null);
      return;
    }

    const targetIndex = shortcuts.findIndex(s => String(s.id) === String(targetId));
    if (targetIndex === -1) {
      setDragOver({ id: null, side: null });
      setDraggingId(null);
      return;
    }

    const el = e.currentTarget;
    const side = computeSide(e, el);
    
    // Calculate new position
    // If dropping on the left side, insert before target
    // If dropping on the right side, insert after target
    let newIndex = side === 'left' ? targetIndex : targetIndex + 1;
    
    // If we're moving an item from before the target to after it,
    // we need to account for the removal
    if (srcIndex < targetIndex) {
      newIndex--;
    }

    // Create new array with item moved
    const newShortcuts = [...shortcuts];
    const [movedItem] = newShortcuts.splice(srcIndex, 1);
    newShortcuts.splice(newIndex, 0, movedItem);

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
        {t('shortcutGrid.shortcuts')}
      </h2>

      <div
        ref={gridRef}
        onDragOver={(e) => e.preventDefault()}   // NEU
        onDrop={onDropGrid}                      // NEU
        className={`grid grid-cols-1 md:grid-cols-3 ${colsClass} gap-5`}
        role="list"
        aria-label="Shortcut list"
      >
        {shortcuts.map((s) => (
          <div 
            key={s.id} 
            className={`relative group ${editMode ? (draggingId === s.id ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
            draggable={editMode}
            onDragStart={(e) => onDragStart(e, s.id)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => onDragOverItem(e, s.id)}
            onDrop={(e) => onDropOnItem(e, s.id)}
            role="listitem"
            tabIndex={0}
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
            <ShortcutLink shortcut={s} textColor={textColor} />

            {/* Edit-Button (nur im Bearbeitungsmodus) */}
            {editMode && (
              <button
                onClick={() => setEditingShortcut(s)}
                className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg shadow-lg opacity-100 transition-all duration-200 hover:scale-110"
                title={t('shortcutGrid.edit')}
                aria-label={t('shortcutGrid.edit_shortcut', { name: s.name })}
              >
                <Pencil size={16} />
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