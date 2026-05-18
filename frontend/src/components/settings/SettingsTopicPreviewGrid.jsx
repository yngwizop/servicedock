import React from 'react';
import PropTypes from 'prop-types';

const ACCENT = {
  orange: 'text-orange-500 dark:text-orange-400',
  sky: 'text-sky-500 dark:text-sky-400',
  blue: 'text-blue-500 dark:text-blue-400',
  emerald: 'text-emerald-500 dark:text-emerald-400',
  indigo: 'text-indigo-500 dark:text-indigo-400',
};

/**
 * Drei kompakte Info-Karten unter Settings-Themen, die nur per Modal konfigurierbar sind —
 * füllt die Fläche sinnvoll und erklärt, was im Dialog passiert.
 */
function SettingsTopicPreviewGrid({ icons, items, accent = 'orange' }) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return null;
  const iconClass = ACCENT[accent] || ACCENT.orange;

  return (
    <ul className="mt-8 grid max-w-4xl list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
      {list.map((card, i) => {
        const Icon = icons[i] ?? icons[0];
        return (
          <li
            key={`${card.title}-${i}`}
            className="flex flex-col gap-2.5 rounded-xl border border-gray-200/35 bg-white/35 p-4 shadow-sm dim:border-white/10 dim:bg-sd-night-900/48 dim:shadow-md dim:shadow-black/20 night:border-white/[0.06] night:bg-sd-night-900/50 night:shadow-black/40"
          >
            <Icon size={24} weight="duotone" className={`shrink-0 ${iconClass}`} aria-hidden />
            <h5 className="text-sm font-semibold dim:text-slate-50 night:text-white">{card.title}</h5>
            <p className="m-0 text-xs leading-relaxed dim:text-slate-400 night:text-gray-400">{card.body}</p>
          </li>
        );
      })}
    </ul>
  );
}

SettingsTopicPreviewGrid.propTypes = {
  icons: PropTypes.arrayOf(PropTypes.elementType).isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      body: PropTypes.string.isRequired,
    })
  ),
  accent: PropTypes.oneOf(['orange', 'sky', 'blue', 'emerald', 'indigo']),
};

export default SettingsTopicPreviewGrid;
