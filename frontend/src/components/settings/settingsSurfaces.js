/**
 * Settings glass surfaces — Night-Palette (--sd-night-*) für dim + night.
 * dim = Hell-Toggle (dunkler App-Hintergrund); night = Dunkel-Toggle — night:-Werte nicht ändern.
 *
 * Hellmodus: neutrales Slate-Grau (unterscheidet sich vom Night-Blau-Glas).
 */

const glassBorder =
  'border border-gray-400/60 dim:border-white/10 night:border-white/[0.08]';

const glassShadow =
  'shadow-xl night:shadow-black/45';

/** Innere Detail-Karte — dim: sd-night-900; night unverändert */
const glassFill =
  'settings-glass-inner-card bg-white/45 dim:bg-sd-night-900/60 ' +
  'dim:shadow-xl dim:shadow-black/35 night:bg-sd-night-900/75';

/** Nav / Main / Tips — dim: Slate-Grau; night: sd-night-950 */
const settingsGlassColumnFill =
  'bg-white/28 dim:bg-slate-500/22 night:bg-sd-night-950/55';

export const settingsGlassCard =
  `rounded-2xl ${glassBorder} ${glassFill} ${glassShadow} p-4 sm:p-6`;

export const settingsGlassShell =
  `settings-shell settings-glass-shell overflow-hidden rounded-3xl ${glassBorder} ` +
  'bg-white/45 backdrop-blur-md isolate dim:bg-slate-400/52 dim:backdrop-blur-xl ' +
  `${glassShadow}`;

export const settingsGlassColumnNav =
  `settings-glass-column-nav ${settingsGlassColumnFill} p-3`;

export const settingsGlassColumnMain =
  `settings-glass-column-main flex-1 min-w-0 ${settingsGlassColumnFill} ` +
  'px-5 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8';

export const settingsGlassColumnAside =
  `settings-glass-column-aside shrink-0 lg:border-l ${settingsGlassColumnFill} ` +
  'border-white/25 dim:border-white/10 night:border-white/[0.08]';

export const settingsGlassMobileNav =
  `settings-glass-mobile-nav border-b ${settingsGlassColumnFill} ` +
  'border-white/25 dim:border-white/10 night:border-white/[0.08] px-2 py-2 overflow-x-auto';

export const settingsGlassMobileSubnav =
  `settings-glass-mobile-subnav border-b ${settingsGlassColumnFill} ` +
  'border-white/25 dim:border-white/10 night:border-white/[0.08]';

export const settingsNavActive =
  'dim:bg-sd-night-800/55 dim:text-slate-50 night:bg-sd-night-950/80 night:text-white shadow-sm';

export const settingsNavInactive =
  'dim:text-slate-400 dim:hover:bg-sd-night-800/35 dim:hover:text-slate-100 ' +
  'text-gray-800 night:text-gray-400 hover:bg-white/60 night:hover:bg-white/10 night:hover:text-gray-200';

export const settingsTopicTile =
  'flex h-full w-full flex-col gap-2 rounded-xl border p-4 text-left transition-colors shadow-sm ' +
  'border-gray-300/50 bg-white/50 hover:bg-white/70 hover:border-gray-400/60 ' +
  'dim:border-white/10 dim:bg-sd-night-900/48 dim:hover:border-white/15 dim:hover:bg-sd-night-800/52 ' +
  'night:border-white/10 night:bg-white/[0.06] night:hover:border-white/20 night:hover:bg-white/[0.10]';

export const settingsSegmentContainer =
  `relative flex flex-wrap gap-0 rounded-xl p-1 ${glassBorder} ` +
  'bg-white/40 dim:bg-slate-300/30 night:bg-sd-night-900/50 shadow-lg';

export const settingsSegmentPillActive =
  'absolute top-1 bottom-1 rounded-lg bg-white/80 dim:bg-sd-night-800/65 night:bg-sd-night-950/80 shadow-sm';

export const settingsSegmentButtonActive =
  'relative z-10 dim:text-slate-50 text-gray-900 night:text-white';

export const settingsSegmentButtonInactive =
  'relative z-10 dim:text-slate-400 text-gray-700 night:text-gray-400 ' +
  'dim:hover:text-slate-100 hover:text-gray-900 night:hover:text-gray-200';

export const settingsNestedNavActive =
  'dim:bg-sd-night-800/55 dim:text-slate-50 night:bg-sd-night-950/80 night:text-white';

export const settingsNestedNavInactive =
  'dim:text-slate-400 text-gray-700 night:text-slate-200 ' +
  'dim:hover:bg-sd-night-800/30 hover:bg-white/50 night:hover:bg-white/10';

export const settingsColumnSeparator =
  'lg:border-r border-white/25 dim:border-white/10 night:border-white/[0.08]';
