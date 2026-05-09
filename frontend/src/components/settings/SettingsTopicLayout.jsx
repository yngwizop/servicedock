import React from 'react';

/**
 * Help-style two-pane layout: grouped topic nav (left) + scrollable detail (right).
 * Optional footer (e.g. global Save) stays below the detail pane.
 *
 * @param {{ key: string, label: string, items: { id: string, label: string }[] }[]} groups
 */
function SettingsTopicLayout({
  groups,
  activeId,
  onSelect,
  children,
  footer = null,
  navAriaLabel,
  detailClassName = '',
}) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
      <nav
        className="flex w-full min-w-0 shrink-0 flex-col gap-1 rounded-xl border border-gray-300/40 bg-white/40 p-2 dark:border-white/10 dark:bg-white/[0.04] lg:w-56 xl:w-60 night:border-white/[0.07]"
        aria-label={navAriaLabel}
      >
        <div className="flex max-h-[min(70vh,560px)] flex-col gap-3 overflow-y-auto pr-0.5">
          {groups.map((section) => (
            <div key={section.key}>
              <p className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                {section.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const active = item.id === activeId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelect(item.id)}
                      className={`rounded-lg px-3 py-2 text-left text-sm font-medium leading-snug transition-colors ${
                        active
                          ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25'
                          : 'text-gray-800 hover:bg-white/70 dark:text-slate-100 dark:hover:bg-white/[0.08]'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Kein overflow-y hier: Scroll passiert in der App-Hauptspalte (Rand wie andere Dashboards), nicht innerhalb des Rahmens */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div
          className={`rounded-xl border border-gray-300/40 bg-white/35 p-4 dark:border-white/10 dark:bg-white/[0.04] sm:p-6 night:border-white/[0.07] ${detailClassName}`}
        >
          {children}
        </div>
        {footer ? <div className="shrink-0">{footer}</div> : null}
      </div>
    </div>
  );
}

export default SettingsTopicLayout;
