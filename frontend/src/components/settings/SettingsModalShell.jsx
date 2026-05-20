import React, { useEffect, useId, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'phosphor-react';
import { useSettingsUnsavedOptional } from '../../contexts/SettingsUnsavedContext';

const overlayClass =
  'fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 ' +
  'bg-black/35 dark:bg-black/50 night:bg-black/55 backdrop-blur-md';

const panelClass =
  'settings-glass-inner-card w-full flex flex-col max-h-[90vh] overflow-hidden rounded-3xl ' +
  'border dim:border-white/12 night:border-white/[0.08] ' +
  'dim:bg-transparent night:bg-transparent ' +
  'shadow-2xl dim:shadow-black/25 night:shadow-black/55 ' +
  'ring-1 dim:ring-white/[0.08] night:ring-white/[0.06]';

const headerClass =
  'shrink-0 px-6 pt-5 pb-4 border-b ' +
  'dim:border-white/10 dim:bg-sd-dim-950/45 ' +
  'night:border-white/[0.06] night:bg-sd-night-950';

const footerClass =
  'shrink-0 px-6 py-3 border-t ' +
  'dim:border-white/10 dim:bg-sd-dim-950/45 ' +
  'night:border-white/[0.06] night:bg-sd-night-950';

const closeButtonClass =
  'shrink-0 p-2 rounded-xl dim:text-slate-200 night:text-slate-200 ' +
  'dim:hover:bg-sd-dim-800/55 night:hover:bg-white/[0.1] transition-colors';

const defaultContentClass =
  'px-6 py-5 overflow-y-auto flex-1 min-h-0 ' +
  'dim:bg-sd-dim-900/25 night:bg-sd-night-900/40';

function SettingsModalShell({
  open,
  onClose,
  title,
  subtitle = null,
  icon = null,
  children = null,
  footer = null,
  maxWidthClass = 'max-w-2xl',
  contentClassName = defaultContentClass,
  dirty = false,
  onDiscard = null,
}) {
  const titleId = useId();
  const unsavedCtx = useSettingsUnsavedOptional();

  const requestClose = useCallback(() => {
    if (dirty && unsavedCtx) {
      unsavedCtx.confirmLeave(onClose, { onDiscard: onDiscard || undefined });
    } else {
      onClose();
    }
  }, [dirty, unsavedCtx, onClose, onDiscard]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') requestClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, requestClose]);

  if (!open) return null;

  return createPortal(
    <div className={overlayClass} onClick={requestClose} role="presentation">
      <div
        className={`relative ${maxWidthClass} ${panelClass}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className={headerClass}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {icon}
              <div className="min-w-0">
                <h3
                  id={titleId}
                  className="text-lg sm:text-xl font-bold dim:text-slate-50 night:text-white leading-tight"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                >
                  {title}
                </h3>
                {subtitle ? (
                  <p className="text-sm dim:text-slate-300 night:text-slate-300 mt-1.5 leading-relaxed">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={requestClose}
              className={closeButtonClass}
              aria-label="Close"
            >
              <X size={22} weight="bold" />
            </button>
          </div>
        </header>
        {children != null ? (
          <div className={contentClassName}>{children}</div>
        ) : null}
        {footer ? <div className={footerClass}>{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}

export default SettingsModalShell;
