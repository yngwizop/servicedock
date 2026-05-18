import React, { useId } from 'react';
import { createPortal } from 'react-dom';
import { Warning } from 'phosphor-react';
import { useTranslation } from 'react-i18next';

const overlayClass =
  'fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 ' +
  'bg-black/40 dark:bg-black/55 backdrop-blur-md';

const panelClass =
  'w-full max-w-md rounded-2xl border border-white/28 dark:border-white/[0.12] ' +
  'bg-gradient-to-br from-white/[0.92] via-white/[0.82] to-white/[0.72] ' +
  'dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 ' +
  'shadow-2xl ring-1 ring-black/[0.06] dark:ring-white/[0.08] p-6';

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
            <p className="text-sm text-gray-700 dark:text-slate-300 mt-1.5 leading-relaxed">
              {t('settings.unsaved.message')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onStay}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-gray-200/70 dark:bg-white/10 dim:text-slate-200 night:text-gray-200 hover:bg-gray-300/80 dark:hover:bg-white/15 transition-colors"
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
