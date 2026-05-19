import React, { useMemo } from 'react';
import AnimatedPane from '../AnimatedPane';
import SettingsTopicSegmented from './SettingsTopicSegmented';
import {
  settingsGlassCard,
  settingsNestedNavActive,
  settingsNestedNavInactive,
} from './settingsSurfaces';

export const settingsDetailCardClass = settingsGlassCard;

const detailCardClass = settingsGlassCard;

const footerWrapClass =
  'shrink-0 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-slate-300/40 ' +
  'dim:border-white/10 dim:bg-sd-dim-950/45 px-4 py-3 sm:px-5 ' +
  'night:border-white/[0.08] night:bg-white/[0.08]';

const sideNavClass =
  'flex w-full min-w-0 shrink-0 flex-col gap-1 rounded-xl border border-slate-300/40 p-2 ' +
  'dim:border-white/10 dim:bg-sd-dim-950/40 lg:w-56 xl:w-60 ' +
  'night:border-white/[0.08] night:bg-white/[0.08]';

function flattenItems(groups) {
  if (!groups?.length) return [];
  return groups.flatMap((g) => g.items || []);
}

/**
 * Adaptive topic layout: no nav (1 topic), segmented (2–3), side nav (4+).
 */
function SettingsTopicLayout({
  groups,
  activeId,
  onSelect,
  children,
  footer = null,
  navAriaLabel,
  detailClassName = '',
  navPlacement = 'auto',
}) {
  const items = useMemo(() => flattenItems(groups), [groups]);
  const itemCount = items.length;
  const detailPane = (
    <AnimatedPane
      paneKey={activeId}
      mode="crossfade"
      className={`${detailCardClass} ${detailClassName}`}
    >
      {children}
    </AnimatedPane>
  );

  if (navPlacement === 'none') {
    return (
      <div className="flex min-w-0 flex-col gap-3">
        {detailPane}
        {footer ? <div className={footerWrapClass}>{footer}</div> : null}
      </div>
    );
  }

  if (itemCount <= 0) {
    return (
      <div className="flex min-w-0 flex-col gap-3">
        {detailPane}
        {footer ? <div className={footerWrapClass}>{footer}</div> : null}
      </div>
    );
  }

  if (itemCount === 1) {
    return (
      <div className="flex min-w-0 flex-col gap-3">
        {detailPane}
        {footer ? <div className={footerWrapClass}>{footer}</div> : null}
      </div>
    );
  }

  if (itemCount <= 3) {
    return (
      <div className="flex min-w-0 flex-col gap-3">
        <SettingsTopicSegmented
          items={items}
          activeId={activeId}
          onSelect={onSelect}
          ariaLabel={navAriaLabel}
        />
        {detailPane}
        {footer ? <div className={footerWrapClass}>{footer}</div> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
      <nav className={sideNavClass} aria-label={navAriaLabel}>
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
                        active ? settingsNestedNavActive : settingsNestedNavInactive
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
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {detailPane}
        {footer ? <div className={footerWrapClass}>{footer}</div> : null}
      </div>
    </div>
  );
}

export default SettingsTopicLayout;
