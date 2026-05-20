import React, { useId } from 'react';
import { createPortal } from 'react-dom';
import { Warning } from 'phosphor-react';
import { useTranslation } from 'react-i18next';

const overlayClass =
  'fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 ' +
  'bg-black/40 dark:bg-black/55 backdrop-blur-md';

const panelClass =
  'settings-glass-inner-card w-full max-w-md rounded-2xl border p-6 ' +
  'dim:border-white/12 night:border-white/[0.08] ' +
  'dim:bg-transparent night:bg-transparent ' +
  'shadow-2xl dim:shadow-black/25 night:shadow-black/55 ' +
  'ring-1 dim:ring-white/[0.08] night:ring-white/[0.06]';

function SettingsUnsavedDialog({ onDiscard, onStay, onSave, isSaving = false }) {
  const { t } = useTranslation();
  const titleId = useId();

  return createPortal(
    <div className={overlayClass} role="presentation" onClick={onStay}>
      <div
        className={panelClass}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <Warning size={28} weight="duotone" className="text-amber-500 shrink-0 mt-0.5" aria-hidden />
          <div>
            <h3 id={titleId} className="text-lg font-bold dim:text-slate-50 night:text-white">
              {t('settings.unsaved.title')}
            </h3>
            <p className="text-sm dim:text-slate-300 night:text-slate-300 mt-1.5 leading-relaxed">
              {t('settings.unsaved.message')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onStay}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium dim:bg-sd-dim-800/55 dim:hover:bg-sd-dim-700/60 night:bg-white/10 night:hover:bg-white/15 dim:text-slate-200 night:text-gray-200 transition-colors"
          >
            {t('settings.unsaved.stay')}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-amber-500/90 hover:bg-amber-600 text-white shadow-sm transition-colors"
          >
            {t('settings.unsaved.discard')}
          </button>
          {onSave ? (
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-blue-500/90 hover:bg-blue-600 text-white shadow-sm transition-colors disabled:opacity-70"
            >
              {isSaving ? t('common.saving') : t('settings.unsaved.save')}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default SettingsUnsavedDialog;
