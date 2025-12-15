import React, { useState } from 'react';
import { Trash } from 'phosphor-react';

function EditModal({ item, type, onClose, onSave, onDelete }) {
  // type ist entweder "service" oder "shortcut"
  const [formData, setFormData] = useState({ ...item });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const handleDelete = () => {
    onDelete(item.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="editmodal-title">
      <div className="bg-white/55 dark:bg-gray-900/60 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-300/50 dark:border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-300/50 dark:border-white/20">
          <h3 id="editmodal-title" className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {type === 'service' ? 'Service bearbeiten' : 'Shortcut bearbeiten'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 text-2xl transition-colors"
            aria-label="Modal schließen"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full bg-white/70 dark:bg-white/10 backdrop-blur-md border border-gray-400/60 dark:border-white/20 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Name eingeben"
            />
          </div>

          {/* Description (nur für Services) */}
          {type === 'service' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Beschreibung
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full bg-white/70 dark:bg-white/10 backdrop-blur-md border border-gray-400/60 dark:border-white/20 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all resize-none dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                rows="3"
                placeholder="Beschreibung eingeben"
              />
            </div>
          )}

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              URL
            </label>
            <input
              type="text"
              value={formData.url}
              onChange={(e) => handleChange('url', e.target.value)}
              className="w-full bg-white/70 dark:bg-white/10 backdrop-blur-md border border-gray-400/60 dark:border-white/20 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="https://..."
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Icon (URL oder Emoji)
            </label>
            <input
              type="text"
              value={formData.icon || ''}
              onChange={(e) => handleChange('icon', e.target.value)}
              className="w-full bg-white/70 dark:bg-white/10 backdrop-blur-md border border-gray-400/60 dark:border-white/20 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder={type === 'service' ? '✉️ oder https://...' : '🔗 oder https://...'}
            />
          </div>

          {/* Icon Tipp */}
          <div className="p-3 bg-blue-100/50 dark:bg-blue-500/10 backdrop-blur-md border border-blue-300/50 dark:border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-800 dark:text-blue-300">
              💡 <strong>Tipp:</strong> Icons von{' '}
              <a
                href="https://selfh.st/icons/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-600 dark:hover:text-blue-200 font-medium"
              >
                selfh.st/icons
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-300/50 dark:border-white/20 flex gap-3">
          {!showDeleteConfirm ? (
            <>
              <button
                onClick={handleSave}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 px-4 rounded-lg font-medium transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
              >
                Speichern
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded-lg font-medium transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] flex items-center justify-center"
                aria-label="Löschen"
                title="Löschen"
              >
                <Trash size={18} weight="bold" />
              </button>
              <button
                onClick={onClose}
                className="bg-white/70 dark:bg-white/10 backdrop-blur-md border border-gray-400/60 dark:border-white/20 hover:bg-white/90 dark:hover:bg-white/15 text-gray-800 dark:text-white py-2.5 px-4 rounded-lg font-medium transition-all shadow-lg hover:shadow-xl"
              >
                Abbrechen
              </button>
            </>
          ) : (
            <>
              <div className="flex-1 flex flex-col gap-2">
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  Wirklich löschen?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg font-medium transition-all text-sm shadow-lg hover:shadow-xl"
                  >
                    Ja, löschen
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 bg-white/70 dark:bg-white/10 backdrop-blur-md border border-gray-400/60 dark:border-white/20 hover:bg-white/90 dark:hover:bg-white/15 text-gray-800 dark:text-white py-2 px-3 rounded-lg font-medium transition-all text-sm shadow-lg"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default EditModal;