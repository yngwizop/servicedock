/**
 * Shared glass style tokens.
 *
 * These return Tailwind class strings only (no DOM assumptions),
 * so components can compose them freely.
 */

export function getOrangeGlassRail(theme) {
  const isLight = theme === 'light';
  /** Sidebar rail glass (neutral in light, orange in night). */
  return isLight
    ? 'rounded-3xl border border-white/35 bg-white/22 shadow-lg shadow-black/10 backdrop-blur-xl ring-1 ring-inset ring-white/40'
    : 'rounded-3xl border border-orange-900/50 bg-gradient-to-b from-orange-950/78 via-orange-950/58 to-[rgb(48_20_6)]/82 shadow-xl shadow-black/40 backdrop-blur-xl ring-1 ring-inset ring-orange-300/12';
}

