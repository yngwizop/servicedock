import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import ServiceCard from './ServiceCard';
import EditModal from './EditModal';
import { Pencil } from 'phosphor-react';

function ServiceGrid({ 
  services = [], 
  setServices, 
  isLoggedIn, 
  colsClass, 
  onUpdate, 
  onDelete,
  textColor,
  onReorder
}) {
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOver, setDragOver] = useState({ id: null, side: null });
  const gridRef = useRef(null);

  // Get editing service from current services array (avoids stale references)
  const editingService = editingServiceId ? services.find(s => String(s.id) === String(editingServiceId)) : null;

  const handleSave = async (updatedService) => {
    // Snapshot previous state for potential rollback (shallow clone)
    const previousServices = services.slice();

    // Update state optimistically with functional update (avoid stale state)
    setServices(prev => prev.map(s => (String(s.id) === String(updatedService.id) ? updatedService : s)));

    try {
      // Send update to backend
      await onUpdate(updatedService.id, updatedService);
    } catch (err) {
      // Rollback on error
      console.error('Failed to update service:', err);
      setServices(previousServices);
      // TODO: Replace alert with a nicer notification mechanism
      alert('Fehler beim Speichern. Bitte versuche es erneut.');
    }
  };

  const handleDelete = async (id) => {
    // Snapshot previous state for potential rollback
    const previousServices = services.slice();

    // Update state optimistically
    setServices(prev => prev.filter(s => String(s.id) !== String(id)));

    try {
      // Send delete to backend
      await onDelete(id);
      // Close modal
      setEditingServiceId(null);
    } catch (err) {
      // Rollback on error
      console.error('Failed to delete service:', err);
      setServices(previousServices);
      alert('Fehler beim Löschen. Bitte versuche es erneut.');
    }
  };

  // helper to compute side (left/right)
  const computeSide = (e, el) => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX;
    return x < rect.left + rect.width / 2 ? 'left' : 'right';
  };
  
  // Drag & Drop Handlers
  const onDragStart = (e, id) => {
    // store id as string to avoid Number issues
    e.dataTransfer.setData('text/plain', String(id));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(id);
    if (e.dataTransfer.setDragImage) {
      const crt = document.createElement('canvas');
      crt.width = 1; crt.height = 1;
      e.dataTransfer.setDragImage(crt, 0, 0);
    }
  };

  const onDragEnd = () => {
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

    const srcIndex = services.findIndex(s => String(s.id) === String(draggedIdStr));
    if (srcIndex === -1) return;

    const targetIndex = services.findIndex(s => String(s.id) === String(targetId));
    if (targetIndex === -1) return;

    const el = e.currentTarget;
    const side = computeSide(e, el);
    const before = (side === 'left');

    let desiredIndex = before ? targetIndex : targetIndex + 1;

    const newServices = [...services];
    const [moved] = newServices.splice(srcIndex, 1);

    // Adjust insertion index if we removed an element before the target
    let finalIndex = desiredIndex;
    if (srcIndex < desiredIndex) {
      finalIndex = desiredIndex - 1;
    }

    finalIndex = Math.max(0, Math.min(newServices.length, finalIndex));
    newServices.splice(finalIndex, 0, moved);

    setServices(newServices);
    setDragOver({ id: null, side: null });
    setDraggingId(null);
    if (onReorder) onReorder(newServices.map(s => s.id));
  };

  // Handle drops on the grid (gaps, end, etc.)
  const onDropGrid = (e) => {
    e.preventDefault();
    const draggedIdStr = e.dataTransfer.getData('text/plain');
    if (!draggedIdStr) return;

    const srcIndex = services.findIndex(s => String(s.id) === String(draggedIdStr));
    if (srcIndex === -1) return;

    let desiredIndexInServices = services.length; // default append
    if (gridRef && gridRef.current) {
      const domChildren = Array.from(gridRef.current.children);
      const visual = domChildren
        .filter(ch => ch && ch.dataset && ch.dataset.id && String(ch.dataset.id) !== String(draggedIdStr))
        .map(ch => ({ id: String(ch.dataset.id), rect: ch.getBoundingClientRect() }));

      if (visual.length === 0) {
        desiredIndexInServices = services.length;
      } else {
        // group visual items into rows (tolerance)
        const rows = [];
        visual.forEach(item => {
          const topKey = Math.round(item.rect.top);
          let row = rows.find(r => Math.abs(Math.round(r.top) - topKey) <= 8);
          if (!row) { row = { top: item.rect.top, items: [] }; rows.push(row); }
          row.items.push(item);
        });

        rows.sort((a,b) => a.top - b.top);
        rows.forEach(r => r.items.sort((a,b) => a.rect.left - b.rect.left));

        // determine target row by Y
        const y = e.clientY;
        let targetRow = rows.find(r => r.items.some(it => y >= it.rect.top && y <= it.rect.bottom));
        if (!targetRow) {
          let best = null; let bestDist = Infinity;
          for (const r of rows) { const dist = Math.abs(y - r.top); if (dist < bestDist) { bestDist = dist; best = r; } }
          targetRow = best || rows[rows.length-1];
        }

        // find column in row by X midpoint
        const x = e.clientX;
        let insertInRow = targetRow.items.length;
        for (let i = 0; i < targetRow.items.length; i++) {
          const it = targetRow.items[i];
          const mid = it.rect.left + it.rect.width/2;
          if (x < mid) { insertInRow = i; break; }
        }

        // compute visual position in the filtered array (index where we want to insert in visual order)
        let countBefore = 0;
        for (const r of rows) {
          if (r === targetRow) break;
          countBefore += r.items.length;
        }
        const visualPos = countBefore + insertInRow; // position in visual array (0..visual.length)

        if (visualPos >= visual.length) {
          // Append at end
          desiredIndexInServices = services.length;
        } else {
          const targetId = visual[visualPos].id;
          const targetIndexInServices = services.findIndex(s => String(s.id) === String(targetId));
          desiredIndexInServices = targetIndexInServices;
        }

        if (process.env.NODE_ENV !== 'production') {
          try {
            console.debug('[dnd-debug] drop candidate', {
              draggedId: draggedIdStr,
              srcIndex,
              mouse: { x: e.clientX, y: e.clientY },
              visual: visual.map(v => ({ id: v.id, left: Math.round(v.rect.left), top: Math.round(v.rect.top), w: Math.round(v.rect.width) })),
              rows: rows.map(r => ({ top: Math.round(r.top), len: r.items.length })),
              visualPos,
              desiredIndexInServices
            });
          } catch (err) { /* ignore debug failures */ }
        }
      }
    } else {
      desiredIndexInServices = services.length;
    }

    // Now remove the dragged element and insert at the correct position
    const newServices = [...services];
    const [moved] = newServices.splice(srcIndex, 1);

    let finalIndex = desiredIndexInServices;
    if (srcIndex < desiredIndexInServices) {
      finalIndex = desiredIndexInServices - 1;
    }
    finalIndex = Math.max(0, Math.min(newServices.length, finalIndex));
    newServices.splice(finalIndex, 0, moved);

    setServices(newServices);
    setDragOver({ id: null, side: null });
    setDraggingId(null);
    if (onReorder) onReorder(newServices.map(s => s.id));
  };

  return (
    <div className="mb-10">
      <h2 className="text-2xl font-semibold mb-4" style={{ color: textColor }}>Services</h2>
      <div
        ref={gridRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDropGrid}
        className={`grid grid-cols-2 md:grid-cols-3 ${colsClass} gap-5`}
        role="list"
        aria-label="Service list"
      >
        {services.map((s) => (
          <div
            key={s.id}
            data-id={s.id}
            className={`relative group ${isLoggedIn ? (String(draggingId) === String(s.id) ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
            draggable={isLoggedIn}
            onDragStart={(e) => onDragStart(e, s.id)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => onDragOverItem(e, s.id)}
            onDrop={(e) => onDropOnItem(e, s.id)}
            role="listitem"
            aria-grabbed={String(draggingId) === String(s.id)}
          >
            {/* Linke Einfügelinie (vertikal) */}
            {dragOver.id === s.id && dragOver.side === 'left' && draggingId && (
              <div className="absolute left-0 top-2 bottom-2 w-1 rounded bg-blue-600 z-20 transform -translate-x-1 transition-all"></div>
            )}

            {/* Rechte Einfügelinie (vertikal) */}
            {dragOver.id === s.id && dragOver.side === 'right' && draggingId && (
              <div className="absolute right-0 top-2 bottom-2 w-1 rounded bg-blue-600 z-20 transform translate-x-1 transition-all"></div>
            )}

            <ServiceCard service={s} />

            {/* Edit-Button mit Accessibility-Verbesserungen */}
            {isLoggedIn && (
              <button
                onClick={() => setEditingServiceId(s.id)}
                className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 hover:scale-110"
                aria-label={`Service ${s.name || s.id} bearbeiten`}
                title="Bearbeiten"
              ><Pencil size={16} /></button>
            )}
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingService && (
        <EditModal
          item={editingService}
          type="service"
          onClose={() => setEditingServiceId(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

ServiceGrid.propTypes = {
  services: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    name: PropTypes.string,
    url: PropTypes.string,
    icon: PropTypes.string,
  })),
  setServices: PropTypes.func.isRequired,
  isLoggedIn: PropTypes.bool,
  colsClass: PropTypes.string,
  onUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  textColor: PropTypes.string,
  onReorder: PropTypes.func,
};

export default ServiceGrid;