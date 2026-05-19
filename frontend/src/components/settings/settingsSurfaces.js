/**
 * Settings glass surfaces — Night (--sd-night-*) und Dim (--sd-dim-*).
 * dim = Hell-Toggle; night = Dunkel-Toggle — night:-Werte nicht ändern.
 * Flächenfüllung für dim erfolgt primär über index.css (.settings-glass-*).
 */

const glassBorder =
  'border border-slate-400/40 dim:border-white/12 night:border-white/[0.08]';

const glassShadow = 'shadow-xl dim:shadow-black/25 night:shadow-black/45';

/** Innere Detail-Karte — Füllung via CSS .settings-glass-inner-card (dim + night) */
const glassFill = 'settings-glass-inner-card dim:bg-transparent night:bg-transparent';

/** Nav / Main / Tips — dim via CSS column classes */
const settingsGlassColumnFill = 'dim:bg-transparent night:bg-sd-night-950/55';

export const settingsGlassCard =
  `rounded-2xl ${glassBorder} ${glassFill} ${glassShadow} p-4 sm:p-6`;

export const settingsGlassShell =
  `settings-shell settings-glass-shell overflow-hidden rounded-3xl ${glassBorder} ` +
  'dim:bg-transparent night:bg-transparent backdrop-blur-md isolate ' +
  `${glassShadow}`;

export const settingsGlassColumnNav =
  `settings-glass-column-nav ${settingsGlassColumnFill} p-3`;

export const settingsGlassColumnMain =
  `settings-glass-column-main flex-1 min-w-0 ${settingsGlassColumnFill} ` +
  'px-5 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8';

export const settingsGlassColumnAside =
  `settings-glass-column-aside shrink-0 lg:border-l ${settingsGlassColumnFill} ` +
  'border-slate-300/40 dim:border-white/10 night:border-white/[0.08]';

export const settingsGlassMobileNav =
  `settings-glass-mobile-nav border-b ${settingsGlassColumnFill} ` +
  'border-slate-300/40 dim:border-white/10 night:border-white/[0.08] px-2 py-2 overflow-x-auto';

export const settingsGlassMobileSubnav =
  `settings-glass-mobile-subnav border-b ${settingsGlassColumnFill} ` +
  'border-slate-300/40 dim:border-white/10 night:border-white/[0.08]';

/** Gleiches Blau wie aktive Sidebar-Icons (bg-blue-500) */
export const settingsNavActive =
  'bg-blue-500 text-white shadow-lg shadow-blue-500/30';

export const settingsNavInactive =
  'dim:text-slate-400 dim:hover:bg-sd-dim-800/40 dim:hover:text-slate-100 ' +
  'night:text-gray-400 night:hover:bg-white/10 night:hover:text-gray-200';

export const settingsTopicTile =
  'flex h-full w-full flex-col gap-2 rounded-xl border p-4 text-left transition-colors shadow-sm ' +
  'dim:border-white/12 dim:bg-sd-dim-900/55 dim:hover:border-white/18 dim:hover:bg-sd-dim-800/60 ' +
  'night:border-white/10 night:bg-white/[0.06] night:hover:border-white/20 night:hover:bg-white/[0.10]';

export const settingsSegmentContainer =
  `relative flex flex-wrap gap-0 rounded-xl p-1 ${glassBorder} ` +
  'dim:bg-sd-dim-950/40 night:bg-sd-night-900/50 shadow-lg';

export const settingsSegmentPillActive =
  'absolute top-1 bottom-1 rounded-lg bg-blue-500 shadow-md shadow-blue-500/30';

export const settingsSegmentButtonActive =
  'relative z-10 text-white';

export const settingsSegmentButtonInactive =
  'relative z-10 dim:text-slate-400 dim:hover:text-slate-100 ' +
  'night:text-gray-400 night:hover:text-gray-200';

export const settingsNestedNavActive =
  'bg-blue-500/90 text-white shadow-md shadow-blue-500/25';

export const settingsNestedNavInactive =
  'dim:text-slate-400 dim:hover:bg-sd-dim-800/35 ' +
  'night:text-slate-200 night:hover:bg-white/10';

export const settingsColumnSeparator =
  'lg:border-r border-slate-300/40 dim:border-white/10 night:border-white/[0.08]';

/** Eingabefelder in Settings-Tabs */
export const settingsInputClass =
  'w-full border border-slate-400/45 dim:border-white/12 dim:bg-sd-dim-900/45 ' +
  'dim:text-slate-100 dim:placeholder-slate-500 night:border-white/10 night:bg-white/5 ' +
  'night:text-white night:placeholder-gray-400 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 ' +
  'focus:border-transparent backdrop-blur-sm transition-all text-sm';

export const settingsLabelClass =
  'block text-sm font-medium dim:text-slate-200 night:text-gray-300 mb-2';

/** Sekundäre Panel-Fläche (Modals, Dashboard-Kacheln) */
export const settingsPanelClass =
  'rounded-xl border border-slate-300/40 dim:border-white/10 sd-dim-surface ' +
  'p-4 shadow-sm dim:shadow-black/15 night:border-white/[0.08] night:sd-night-surface ' +
  'night:shadow-black/30';
