import React from 'react';
import PropTypes from 'prop-types';

/**
 * Rechteckige Glass-Hülle für Header-Widgets (wie ServiceCards: `rounded-2xl`), hell/dark/night.
 */
export default function HeaderWidgetCapsule({ children, className = '' }) {
  return (
    <div
      className={
        'flex min-h-0 min-w-0 max-w-full shrink-0 self-stretch items-center rounded-2xl border border-gray-400/45 ' +
        'h-[4.75rem] min-h-[4.75rem] max-h-[4.75rem] overflow-hidden ' +
        'bg-white/55 px-3 py-2 shadow-lg backdrop-blur-md ' +
        'dark:border-white/[0.12] dark:bg-slate-900/55 dark:shadow-black/20 ' +
        'night:border-white/[0.08] night:bg-sd-night-950/65 night:shadow-black/40 ' +
        'md:px-4 md:py-2.5 ' +
        (className ? ` ${className}` : '')
      }
    >
      {children}
    </div>
  );
}

HeaderWidgetCapsule.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
