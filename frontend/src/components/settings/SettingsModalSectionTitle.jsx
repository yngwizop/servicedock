import React from 'react';

const iconWrapClass =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ' +
  'dim:bg-sd-dim-800/55 dim:ring-white/12 night:bg-white/[0.08] night:ring-white/[0.12] ring-1';

const iconWrapBlue =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ' +
  'bg-blue-500/15 dark:bg-blue-900/40 ring-1 ring-blue-400/30 dark:ring-blue-500/25';

/**
 * Einheitliche Section-Überschrift für Settings-Modals (klare Hierarchie zu text-sm-Controls).
 * variant="blue": für farbige Info-Kästen (z. B. Spotify-Setup).
 */
function SettingsModalSectionTitle({
  icon: Icon,
  children,
  description = null,
  divider = false,
  variant = 'default',
  dense = false,
}) {
  const isBlue = variant === 'blue';
  const bottomMb = dense ? 'mb-3' : 'mb-4';
  const wrap = divider ? `${bottomMb} border-b border-white/12 dark:border-white/[0.08] pb-3` : bottomMb;
  const iconBox = isBlue ? iconWrapBlue : iconWrapClass;
  const iconColor = isBlue
    ? 'text-blue-700 dark:text-blue-300'
    : 'text-blue-600 dark:text-blue-400';
  const titleColor = isBlue
    ? 'text-blue-950 dark:text-blue-100'
    : 'dim:text-slate-50 night:text-white';
  const descColor = isBlue ? 'text-blue-800/90 dark:text-blue-200/90' : 'dim:text-slate-300 night:text-slate-400';

  return (
    <div className={wrap}>
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className={iconBox}>
            <Icon size={20} weight="duotone" className={iconColor} aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0 flex-1 pt-0.5">
          <h4 className={`text-base sm:text-lg font-bold tracking-tight leading-snug m-0 ${titleColor}`}>
            {children}
          </h4>
          {description ? (
            <p className={`mt-1 text-sm leading-relaxed m-0 ${descColor}`}>{description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default SettingsModalSectionTitle;
