import React from 'react';

/**
 * Seitenkopf im gleichen Glass-Stil wie ServiceCard / StatCard / Proxmox-Leisten
 * (sd-night-surface, blur-md, border gray/white) — nur etwas flacherer Schatten als volle Cards.
 */
export default function PageHeader({ icon: Icon, title, subtitle, textColor, children, className = '' }) {
  return (
    <div
      className={`mb-6 flex flex-col gap-4 md:flex-row md:items-stretch md:justify-between md:gap-6${className ? ` ${className}` : ''}`}
    >
      <div
        className="
          flex min-w-0 flex-1 items-start gap-3.5 rounded-2xl border border-gray-400/60 bg-white/50 px-4 py-3.5 shadow-lg backdrop-blur-md
          dark:border-white/10 dark:bg-white/[0.12] sd-night-surface night:border-white/[0.07] night:shadow-black/40
        "
      >
        {Icon ? (
          <div
            className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-400/60 bg-gradient-to-br from-gray-100 to-gray-200 backdrop-blur-sm dark:border-white/20 dark:from-white/10 dark:to-white/10 night:border-white/20 night:from-white/[0.16] night:to-white/[0.11]"
            aria-hidden
          >
            <Icon size={24} weight="duotone" style={{ color: textColor }} className="opacity-95" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1
            className="text-3xl font-bold leading-tight tracking-tight md:text-4xl"
            style={{
              color: textColor,
              textShadow: '0 1px 6px rgba(0,0,0,0.28), 0 1px 2px rgba(0,0,0,0.18)',
            }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              className="mt-2 max-w-2xl text-sm leading-relaxed opacity-80"
              style={{ color: textColor, textShadow: '0 1px 3px rgba(0,0,0,0.18)' }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {children ? (
        <div className="flex flex-shrink-0 flex-wrap items-center gap-4 md:gap-6 md:justify-end">
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** Abschnittsüberschrift unter dem Page-Header (Services / Shortcuts) */
export function SectionHeading({ icon: Icon, children, textColor }) {
  return (
    <div className="mb-4 flex min-w-0 items-center gap-3">
      {Icon ? (
        <Icon
          size={20}
          weight="duotone"
          className="shrink-0 opacity-90"
          style={{ color: textColor }}
          aria-hidden
        />
      ) : null}
      <h2
        className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.22em]"
        style={{
          color: textColor,
          textShadow: '0 1px 4px rgba(0,0,0,0.35)',
          opacity: 0.88,
        }}
      >
        {children}
      </h2>
      <div
        className="h-px min-w-[2rem] flex-1 bg-gradient-to-r from-gray-400/50 to-transparent dark:from-white/15 night:from-white/12"
        aria-hidden
      />
    </div>
  );
}
