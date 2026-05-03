import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import ServiceCard from './ServiceCard';
import EditModal from './EditModal';
import { Pencil, Star, GridFour } from 'phosphor-react';
import { SectionHeading } from './PageHeader';

function ServiceGrid({ 
  services = [], 
  setServices, 
  isLoggedIn, 
  editMode = false,
  colsClass, 
  onUpdate, 
  onDelete,
  textColor,
  onReorder
}) {
  const { t } = useTranslation();
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
      alert(t('serviceGrid.save_error'));
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
      alert(t('serviceGrid.delete_error'));
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

    const srcIndex = services.findIndex(s => String(s.id) === String(draggedIdStr));
    if (srcIndex === -1) {
      setDragOver({ id: null, side: null });
      setDraggingId(null);
      return;
    }

    const targetIndex = services.findIndex(s => String(s.id) === String(targetId));
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
    const newServices = [...services];
    const [movedItem] = newServices.splice(srcIndex, 1);
    newServices.splice(newIndex, 0, movedItem);

    setServices(newServices);
    setDragOver({ id: null, side: null });
    setDraggingId(null);
    
    if (onReorder) {
      onReorder(newServices.map(s => s.id));
    }
  };

  // Simplified grid drop handler
  const onDropGrid = (e) => {
    e.preventDefault();
    
    const draggedIdStr = e.dataTransfer.getData('text/plain');
    if (!draggedIdStr) {
      setDraggingId(null);
      setDragOver({ id: null, side: null });
      return;
    }

    const srcIndex = services.findIndex(s => String(s.id) === String(draggedIdStr));
    if (srcIndex === -1) {
      setDraggingId(null);
      setDragOver({ id: null, side: null });
      return;
    }

    // Get all visible card elements
    if (!gridRef.current) {
      setDraggingId(null);
      setDragOver({ id: null, side: null });
      return;
    }

    const gridRect = gridRef.current.getBoundingClientRect();
    const cards = Array.from(gridRef.current.children)
      .filter(child => child.dataset && child.dataset.id)
      .map(child => ({
        id: String(child.dataset.id),
        rect: child.getBoundingClientRect()
      }))
      .filter(card => String(card.id) !== String(draggedIdStr));

    if (cards.length === 0) {
      // If no other cards, just move to end
      const newServices = [...services];
      const [movedItem] = newServices.splice(srcIndex, 1);
      newServices.push(movedItem);
      setServices(newServices);
      setDraggingId(null);
      setDragOver({ id: null, side: null });
      if (onReorder) onReorder(newServices.map(s => s.id));
      return;
    }

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    // Find the closest card to drop position
    let targetCard = null;
    let minDistance = Infinity;
    let insertBefore = false;

    cards.forEach(card => {
      const centerX = card.rect.left + card.rect.width / 2;
      const centerY = card.rect.top + card.rect.height / 2;
      const distance = Math.sqrt(
        Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        targetCard = card;
        // Determine if we should insert before or after
        insertBefore = mouseX < centerX;
      }
    });

    if (!targetCard) {
      setDraggingId(null);
      setDragOver({ id: null, side: null });
      return;
    }

    // Find target index in services array
    const targetIndex = services.findIndex(s => String(s.id) === String(targetCard.id));
    if (targetIndex === -1) {
      setDraggingId(null);
      setDragOver({ id: null, side: null });
      return;
    }

    // Calculate insertion index
    let newIndex = insertBefore ? targetIndex : targetIndex + 1;
    
    // Adjust if moving from before target
    if (srcIndex < targetIndex) {
      newIndex--;
    }

    // Perform the move
    const newServices = [...services];
    const [movedItem] = newServices.splice(srcIndex, 1);
    newServices.splice(newIndex, 0, movedItem);

    setServices(newServices);
    setDragOver({ id: null, side: null });
    setDraggingId(null);
    
    if (onReorder) {
      onReorder(newServices.map(s => s.id));
    }
  };

  const onDragOverGrid = (e) => {
    e.preventDefault();
    // Clear item-specific drag over state when dragging over grid gaps
    if (dragOver.id !== null) {
      setDragOver({ id: null, side: null });
    }
  };

  return (
    <div className="mb-10">
      <SectionHeading icon={GridFour} textColor={textColor}>
        {t('pageHeader.section_services')}
      </SectionHeading>
      <div
        ref={gridRef}
        onDragOver={onDragOverGrid}
        onDrop={onDropGrid}
        className={`grid grid-cols-2 md:grid-cols-3 ${colsClass} gap-5`}
        role="list"
        aria-label="Service list"
      >
        {services.map((s) => (
          <div
            key={s.id}
            data-id={s.id}
            className={`relative group ${editMode ? (String(draggingId) === String(s.id) ? 'cursor-grabbing opacity-50' : 'cursor-grab') : ''}`}
            draggable={editMode}
            onDragStart={(e) => onDragStart(e, s.id)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => onDragOverItem(e, s.id)}
            onDrop={(e) => onDropOnItem(e, s.id)}
            role="listitem"
            aria-grabbed={String(draggingId) === String(s.id)}
          >
            {/* Linke Einfügelinie (vertikal) */}
            {dragOver.id === s.id && dragOver.side === 'left' && draggingId && String(draggingId) !== String(s.id) && (
              <div className="absolute left-0 top-2 bottom-2 w-1 rounded bg-blue-600 z-20 transform -translate-x-1 transition-all"></div>
            )}

            {/* Rechte Einfügelinie (vertikal) */}
            {dragOver.id === s.id && dragOver.side === 'right' && draggingId && String(draggingId) !== String(s.id) && (
              <div className="absolute right-0 top-2 bottom-2 w-1 rounded bg-blue-600 z-20 transform translate-x-1 transition-all"></div>
            )}

            <ServiceCard service={s} textColor={textColor} isFavorite={s.is_favorite} />

            {/* Action Buttons - Rechts oben */}
            {editMode && (
              <div className="absolute top-2 right-2 flex gap-2">
                {/* Favorite Star Button */}
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const updatedService = { ...s, is_favorite: !s.is_favorite };
                    await handleSave(updatedService);
                  }}
                  className={`p-2 rounded-lg shadow-lg opacity-100 transition-all duration-200 hover:scale-110 z-30 ${
                    s.is_favorite 
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
                  }`}
                  aria-label={s.is_favorite ? `${s.name || s.id} von Favoriten entfernen` : `${s.name || s.id} zu Favoriten hinzufügen`}
                  title={s.is_favorite ? "Von Favoriten entfernen" : "Zu Favoriten hinzufügen"}
                >
                  <Star size={16} weight={s.is_favorite ? "fill" : "regular"} />
                </button>

                {/* Edit-Button */}
                <button
                  onClick={() => setEditingServiceId(s.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg shadow-lg opacity-100 transition-all duration-200 hover:scale-110"
                  aria-label={t('serviceGrid.edit_service', { name: s.name })}
                  title={t('serviceGrid.edit')}
                >
                  <Pencil size={16} />
                </button>
              </div>
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
  editMode: PropTypes.bool,
  colsClass: PropTypes.string,
  onUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  textColor: PropTypes.string,
  onReorder: PropTypes.func,
};

export default ServiceGrid;