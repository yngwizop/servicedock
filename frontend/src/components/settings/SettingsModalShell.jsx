import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'phosphor-react';

/**
 * Modalshell: hohe Deckkraft, kein Panel-Blur (nur Overlay blur), damit Dim/Night
 * nicht mit dem hellen Settings-Hintergrund „einwaschen“.
 */
const overlayClass =
  'fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 ' +
  'bg-black/35 dark:bg-black/50 night:bg-black/55 backdrop-blur-md';

const panelClass =
  'w-full flex flex-col max-h-[90vh] overflow-hidden rounded-3xl ' +
  'border border-white/28 dark:border-white/[0.12] night:border-white/[0.08] ' +
  'bg-gradient-to-br from-white/[0.88] via-white/[0.76] to-white/[0.68] ' +
  'dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 ' +
  'night:from-sd-night-950 night:via-sd-night-900 night:to-sd-night-950 ' +
  'shadow-2xl shadow-black/12 dark:shadow-black/40 night:shadow-black/55 ' +
  'ring-1 ring-black/[0.06] dark:ring-white/[0.08] night:ring-white/[0.06]';

const headerClass =
  'shrink-0 px-6 pt-5 pb-4 border-b border-white/22 dark:border-white/[0.08] night:border-white/[0.06] ' +
  'bg-white/40 dark:bg-slate-950 night:bg-sd-night-950';

const footerClass =
  'shrink-0 px-6 py-3 border-t border-white/22 dark:border-white/[0.08] night:border-white/[0.06] ' +
  'bg-white/35 dark:bg-slate-950 night:bg-sd-night-950';

const closeButtonClass =
  'shrink-0 p-2 rounded-xl text-gray-800 dark:text-slate-200 ' +
  'hover:bg-white/60 dark:hover:bg-white/[0.1] transition-colors';

const defaultContentClass =
  'px-6 py-5 overflow-y-auto flex-1 min-h-0 ' +
  'bg-white/[0.5] dark:bg-slate-900 night:bg-sd-night-900';

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
        <header className={headerClass}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {icon}
              <div className="min-w-0">
                <h3
                  id={titleId}
                  className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-tight"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                >
                  {title}
                </h3>
                {subtitle ? (
                  <p className="text-sm text-gray-700 dark:text-slate-300 mt-1.5 leading-relaxed">
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
        {footer ? <div className={footerClass}>{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}

export default SettingsModalShell;
