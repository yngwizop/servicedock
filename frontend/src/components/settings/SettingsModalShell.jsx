import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'phosphor-react';

/**
 * Einheitliche Glass-Modalshell für Settings (Backdrop, Panel, Header, Close).
 * Akzent nur über das optionale icon-Kindelement (z. B. farbiges Icon-Quadrat).
 */
const overlayClass =
  'fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 ' +
  'bg-slate-950/45 dark:bg-black/55 backdrop-blur-md';

const panelClass =
  'w-full flex flex-col max-h-[90vh] overflow-hidden rounded-2xl ' +
  'bg-gradient-to-b from-white/96 via-white/92 to-slate-100/95 ' +
  'dark:from-slate-900/96 dark:via-slate-900/92 dark:to-slate-950/96 ' +
  'backdrop-blur-2xl ' +
  'ring-1 ring-inset ring-slate-300/25 dark:ring-white/[0.07] ' +
  'shadow-2xl shadow-black/15 dark:shadow-black/40';

const closeButtonClass =
  'shrink-0 p-2 rounded-xl text-slate-500 dark:text-slate-400 ' +
  'hover:bg-slate-200/70 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white transition-colors';

function SettingsModalShell({
  open,
  onClose,
  title,
  subtitle = null,
  icon = null,
  children = null,
  footer = null,
  maxWidthClass = 'max-w-2xl',
  contentClassName = 'px-6 py-5 overflow-y-auto flex-1 min-h-0',
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={overlayClass} onClick={onClose} role="presentation">
      <div
        className={`relative ${maxWidthClass} ${panelClass}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header
          className={
            'shrink-0 px-6 pt-5 pb-4 border-b border-slate-200/50 dark:border-white/[0.08] ' +
            'bg-slate-50/70 dark:bg-slate-800/40'
          }
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {icon}
              <div className="min-w-0">
                <h3
                  id={titleId}
                  className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-tight"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.12)' }}
                >
                  {title}
                </h3>
                {subtitle ? (
                  <p className="text-sm text-gray-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
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
        {footer ? (
          <div
            className={
              'shrink-0 px-6 py-4 border-t border-slate-200/50 dark:border-white/[0.08] ' +
              'bg-slate-50/60 dark:bg-slate-800/35'
            }
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

export default SettingsModalShell;
