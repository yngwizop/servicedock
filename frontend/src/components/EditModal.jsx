import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PencilSimple, Package, LinkSimple, Trash } from 'phosphor-react';
import SettingsModalShell from './settings/SettingsModalShell';
import IconUrlHint from './IconUrlHint';
import { labelClass, inputClass } from './serviceShortcutModalStyles';

function EditModal({ item, type, onClose, onSave, onDelete }) {
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

  const isService = type === 'service';
  const TypeIcon = isService ? Package : LinkSimple;

  const footer = !showDeleteConfirm ? (
    <div className="flex flex-wrap gap-2 justify-end">
      <button
        type="button"
        onClick={onClose}
        className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-gray-200/70 dark:bg-white/10 text-gray-800 dark:text-gray-200 hover:bg-gray-300/80 dark:hover:bg-white/15 transition-colors"
      >
        {t('common.cancel')}
      </button>
      <button
        type="button"
        onClick={() => setShowDeleteConfirm(true)}
        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-500/90 hover:bg-red-600 text-white transition-colors"
        aria-label={t('editModal.delete')}
        title={t('editModal.delete')}
      >
        <Trash size={18} weight="bold" />
        {t('editModal.delete')}
      </button>
      <button
        type="button"
        onClick={handleSave}
        className="inline-flex items-center justify-center px-5 py-2 rounded-lg text-sm font-medium bg-blue-500/90 hover:bg-blue-600 text-white shadow-sm transition-colors min-w-[6rem]"
      >
        {t('editModal.save')}
      </button>
    </div>
  ) : (
    <div className="space-y-3">
      <p className="text-sm font-medium text-red-600 dark:text-red-400">{t('editModal.confirm_delete')}</p>
      <div className="flex flex-wrap gap-2 justify-end">
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(false)}
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-gray-200/70 dark:bg-white/10 text-gray-800 dark:text-gray-200 hover:bg-gray-300/80 dark:hover:bg-white/15 transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="inline-flex items-center justify-center px-5 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
        >
          {t('editModal.confirm_yes')}
        </button>
      </div>
    </div>
  );

  return (
    <SettingsModalShell
      open
      onClose={onClose}
      maxWidthClass="max-w-lg"
      title={isService ? t('editModal.edit_service') : t('editModal.edit_shortcut')}
      icon={
        <div className="w-12 h-12 rounded-xl bg-blue-500/15 dark:bg-blue-400/20 flex items-center justify-center shrink-0 ring-1 ring-blue-500/20 dark:ring-blue-400/15">
          <PencilSimple size={24} weight="duotone" className="text-blue-600 dark:text-blue-300" />
        </div>
      }
      footer={footer}
    >
      <div className="space-y-4">
        <div>
          <label className={labelClass}>{t('editModal.name_label')}</label>

          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={inputClass}
            placeholder={t('editModal.name_placeholder')}
          />
        </div>

        {isService && (
          <div>
            <label className={labelClass}>{t('editModal.description')}</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className={`${inputClass} resize-none`}
              rows={3}
              placeholder={t('editModal.description_placeholder')}
            />
          </div>
        )}

        <div>
          <label className={labelClass}>URL</label>
          <input
            type="url"
            value={formData.url}
            onChange={(e) => handleChange('url', e.target.value)}
            className={inputClass}
            placeholder={t('addItem.url_placeholder_service')}
          />
        </div>

        <div>
          <label className={labelClass}>
            <span className="inline-flex items-center gap-1.5">
              <TypeIcon size={16} weight="duotone" className="text-blue-600 dark:text-blue-400" aria-hidden />
              {t('serviceIcon.label')}
            </span>
          </label>
          <input
            type="text"
            inputMode="text"
            value={formData.icon || ''}
            onChange={(e) => handleChange('icon', e.target.value)}
            className={inputClass}
            placeholder={t('serviceIcon.placeholder')}
          />
        </div>

        <IconUrlHint />
      </div>
    </SettingsModalShell>
  );
}

export default EditModal;
