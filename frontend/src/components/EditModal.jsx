import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash } from 'phosphor-react';

function EditModal({ item, type, onClose, onSave, onDelete }) {
  // type ist entweder "service" oder "shortcut"
  const { t } = useTranslation();
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
      <div className="bg-slate-900/70 dark:bg-slate-950/85 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-white/12 dark:border-white/8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 dark:border-white/8">
          <h3 id="editmodal-title" className="text-xl font-bold text-gray-100">
            {type === 'service' ? t('editModal.edit_service') : t('editModal.edit_shortcut')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-white text-2xl transition-colors"
            aria-label={t('editModal.close_modal')}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 dark:text-gray-400 mb-2">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all text-white placeholder-gray-400 dark:placeholder-gray-500"
              placeholder={t('editModal.name_placeholder')}
            />
          </div>

          {/* Description (nur für Services) */}
          {type === 'service' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 dark:text-gray-400 mb-2">
                {t('editModal.description')}
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all resize-none text-white placeholder-gray-400 dark:placeholder-gray-500"
                rows="3"
                placeholder={t('editModal.description_placeholder')}
              />
            </div>
          )}

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 dark:text-gray-400 mb-2">
              URL
            </label>
            <input
              type="text"
              value={formData.url}
              onChange={(e) => handleChange('url', e.target.value)}
              className="w-full bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all text-white placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="https://..."
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-gray-300 dark:text-gray-400 mb-2">
              {t('editModal.icon_label')}
            </label>
            <input
              type="text"
              value={formData.icon || ''}
              onChange={(e) => handleChange('icon', e.target.value)}
              className="w-full bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all text-white placeholder-gray-400 dark:placeholder-gray-500"
              placeholder={type === 'service' ? '✉️ oder https://...' : '🔗 oder https://...'}
            />
          </div>

          {/* Icon Tipp */}
          <div className="p-3 bg-blue-500/15 dark:bg-blue-500/10 backdrop-blur-md border border-blue-400/30 dark:border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-200 dark:text-blue-300">
              💡 <strong>{t('editModal.tip')}</strong> {t('editModal.icons_from')}{' '}
              <a
                href="https://selfh.st/icons/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-100 dark:hover:text-blue-100 font-medium"
              >
                selfh.st/icons
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 dark:border-white/8 flex gap-3">
          {!showDeleteConfirm ? (
            <>
              <button
                onClick={handleSave}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 px-4 rounded-lg font-medium transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
              >
                {t('editModal.save')}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded-lg font-medium transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] flex items-center justify-center"
                aria-label={t('editModal.delete')}
                title={t('editModal.delete')}
              >
                <Trash size={18} weight="bold" />
              </button>
              <button
                onClick={onClose}
                className="bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 hover:bg-white/15 dark:hover:bg-white/10 text-gray-100 py-2.5 px-4 rounded-lg font-medium transition-all shadow-lg hover:shadow-xl"
              >
                {t('common.cancel')}
              </button>
            </>
          ) : (
            <>
              <div className="flex-1 flex flex-col gap-2">
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  {t('editModal.confirm_delete')}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg font-medium transition-all text-sm shadow-lg hover:shadow-xl"
                  >
                    {t('editModal.confirm_yes')}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 hover:bg-white/15 dark:hover:bg-white/10 text-gray-100 py-2 px-3 rounded-lg font-medium transition-all text-sm shadow-lg"
                  >
                    {t('common.cancel')}
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