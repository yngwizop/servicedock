import React from 'react';
import PropTypes from 'prop-types';
import { CircleNotch } from 'phosphor-react';
import { settingsNestedNavActive, settingsNestedNavInactive } from './settingsSurfaces';

/**
 * Nested topic list rendered under an active settings section in the left column.
 */
function SettingsNestedSubNav({
  items = [],
  activeId,
  onSelect,
  groupedSections = null,
  loading = false,
  loadingLabel = 'Loading…',
  ariaLabel,
  className = '',
}) {
  if (loading) {
    return (
      <div
        className={`mt-1 mb-2 ml-2 pl-3 border-l-2 border-slate-400/40 dim:border-white/12 night:border-white/10 flex items-center gap-2 py-2 text-sm dim:text-slate-400 night:text-slate-300 animate-settings-subnav-in ${className}`}
      >
        <CircleNotch className="animate-spin shrink-0" size={16} aria-hidden />
        {loadingLabel}
      </div>
    );
  }

  const renderButton = (item) => {
    const active = item.id === activeId;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onSelect(item.id)}
        aria-current={active ? 'true' : undefined}
        className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium leading-snug transition-all duration-200 ${
          active ? settingsNestedNavActive : settingsNestedNavInactive
        }`}
      >
        {item.label}
      </button>
    );
  };

  if (groupedSections?.length) {
    return (
      <div
        className={`mt-1 mb-2 ml-2 pl-3 border-l-2 border-slate-400/40 dim:border-white/12 night:border-white/10 space-y-2 max-h-[min(50vh,420px)] overflow-y-auto pr-0.5 animate-settings-subnav-in ${className}`}
        role="navigation"
        aria-label={ariaLabel}
      >
        {groupedSections.map((section) => (
          <div key={section.key}>
            <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide dim:text-slate-500 night:text-slate-400">
              {section.label}
            </p>
            <div className="flex flex-col gap-0.5">{section.items.map(renderButton)}</div>
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <div
      className={`mt-1 mb-2 ml-2 pl-3 border-l-2 border-slate-400/40 dim:border-white/12 night:border-white/10 flex flex-col gap-0.5 max-h-[min(50vh,420px)] overflow-y-auto pr-0.5 animate-settings-subnav-in ${className}`}
      role="navigation"
      aria-label={ariaLabel}
    >
      {items.map(renderButton)}
    </div>
  );
}

SettingsNestedSubNav.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  activeId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  groupedSections: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      items: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          label: PropTypes.string.isRequired,
        })
      ),
    })
  ),
  loading: PropTypes.bool,
  loadingLabel: PropTypes.string,
  ariaLabel: PropTypes.string,
  className: PropTypes.string,
};

export default SettingsNestedSubNav;
