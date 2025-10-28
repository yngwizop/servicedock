import React, { useState } from 'react';
import ServiceCard from './ServiceCard';
import EditModal from './EditModal';

function ServiceGrid({ 
  services, 
  setServices, 
  isLoggedIn, 
  colsClass, 
  onUpdate, 
  onDelete,
  textColor
}) {
  const [editingService, setEditingService] = useState(null);

  const handleSave = async (updatedService) => {
    // Erst den State aktualisieren
    setServices(
      services.map((s) => (s.id === updatedService.id ? updatedService : s))
    );
    // Dann ans Backend senden (mit den aktualisierten Daten)
    await onUpdate(updatedService.id, updatedService);
  };

  return (
    <div className="mb-10">
      <h2 
        className="text-2xl font-semibold mb-4"
        style={{ color: textColor }}
      >
        Services
      </h2>
      <div className={`grid grid-cols-2 md:grid-cols-3 ${colsClass} gap-5`}>
        {services.map((s) => (
          <div key={s.id} className="relative group">
            <ServiceCard service={s} />
            
            {/* Edit-Button (nur im eingeloggten Modus) */}
            {isLoggedIn && (
              <button
                onClick={() => setEditingService(s)}
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
      {editingService && (
        <EditModal
          item={editingService}
          type="service"
          onClose={() => setEditingService(null)}
          onSave={handleSave}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

export default ServiceGrid;