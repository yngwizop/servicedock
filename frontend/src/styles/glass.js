/**
 * Shared glass style tokens.
 *
 * These return Tailwind class strings only (no DOM assumptions),
 * so components can compose them freely.
 */

export function getOrangeGlassRail(theme) {
  const isLight = theme === 'light';
  /** Same look as Sidebar's "glassRail" (vertical orange glass panel). */
  return isLight
    ? 'rounded-3xl border border-white/35 bg-white/22 shadow-lg shadow-black/10 backdrop-blur-xl ring-1 ring-inset ring-white/40'
    : 'rounded-3xl border border-orange-900/50 bg-gradient-to-b from-orange-950/78 via-orange-950/58 to-[rgb(48_20_6)]/82 shadow-xl shadow-black/40 backdrop-blur-xl ring-1 ring-inset ring-orange-300/12';
}

export function getOrangeGlassHeader(theme) {
  const isLight = theme === 'light';
  /**
   * Header variant: slightly tighter radius + padding handled by caller.
   * Still same orange family + blur/ring feel as the rail.
   */
  return isLight
    ? 'rounded-2xl border border-orange-200/70 bg-gradient-to-b from-orange-200/45 via-orange-100/38 to-amber-100/34 shadow-lg shadow-orange-950/10 backdrop-blur-xl ring-1 ring-inset ring-white/45'
    : 'rounded-2xl border border-orange-900/50 bg-gradient-to-b from-orange-950/76 via-orange-950/56 to-[rgb(48_20_6)]/80 shadow-xl shadow-black/40 backdrop-blur-xl ring-1 ring-inset ring-orange-300/12';
}

export function getOrangeHeaderLeftGlow(theme) {
  const isLight = theme === 'light';
  /**
   * Subtle left-side glow that fades to the right (overlay).
   * Use with: absolute inset-0 pointer-events-none rounded-inherit.
   */
  return isLight
    ? 'bg-gradient-to-r from-orange-300/22 via-amber-200/10 to-transparent'
    : 'bg-gradient-to-r from-orange-500/12 via-orange-400/6 to-transparent';
}

