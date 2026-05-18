import React from 'react';
import { sanitizeUrl } from '../../utils/sanitize';
import { resolveHelpDocIdFromHref, slugifyHeading, isExternalHelpHref } from '../../utils/helpMarkdown';

const linkClass =
  'font-medium text-blue-600 underline decoration-blue-600/40 underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300';

const staticLinkClass = 'text-blue-600 dark:text-blue-400';

function scrollToHelpAnchor(hash) {
  const id = hash.replace(/^#/, '');
  if (!id) return;
  const root = document.querySelector('.help-markdown');
  const el =
    document.getElementById(id) ||
    root?.querySelector(`[id="${CSS.escape(id)}"]`);
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function HelpAnchor({ href, children, ...rest }) {
  const raw = (href || '').trim();

  if (raw.startsWith('#')) {
    return (
      <a
        href={raw}
        onClick={(e) => {
          e.preventDefault();
          scrollToHelpAnchor(raw);
        }}
        className={linkClass}
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <a href={raw} className={linkClass} {...rest}>
      {children}
    </a>
  );
}

function HelpDocLink({ docId, onDocSelect, children }) {
  return (
    <button type="button" onClick={() => onDocSelect(docId)} className={linkClass}>
      {children}
    </button>
  );
}

function HelpExternalLink({ href, children, ...rest }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass} {...rest}>
      {children}
    </a>
  );
}

function HelpStaticLink({ children }) {
  return <span className={staticLinkClass}>{children}</span>;
}

export function buildHelpAnchorRenderer(onDocSelect) {
  return function HelpMarkdownLink({ href, children, ...rest }) {
    const raw = (href || '').trim();

    if (raw.startsWith('#')) {
      return (
        <HelpAnchor href={raw} {...rest}>
          {children}
        </HelpAnchor>
      );
    }

    const docId = resolveHelpDocIdFromHref(raw);
    if (docId && onDocSelect) {
      return <HelpDocLink docId={docId} onDocSelect={onDocSelect}>{children}</HelpDocLink>;
    }

    if (isExternalHelpHref(raw)) {
      const safeHref = sanitizeUrl(raw);
      if (safeHref) {
        return (
          <HelpExternalLink href={safeHref} {...rest}>
            {children}
          </HelpExternalLink>
        );
      }
    }

    return <HelpStaticLink>{children}</HelpStaticLink>;
  };
}

function makeHeading(Tag, className) {
  return function HelpHeading({ children, ...props }) {
    const id = slugifyHeading(children);
    return (
      <Tag id={id || undefined} className={className} {...props}>
        {children}
      </Tag>
    );
  };
}

export function buildHelpMarkdownComponents(onDocSelect) {
  return {
    h1: makeHeading(
      'h1',
      'mt-8 mb-3 text-2xl font-bold tracking-tight dim:text-slate-50 first:mt-0 night:text-white'
    ),
    h2: makeHeading(
      'h2',
      'mt-6 mb-2 border-b border-gray-300/60 pb-1.5 text-xl font-semibold dim:text-slate-50 night:border-white/10 night:text-white'
    ),
    h3: makeHeading(
      'h3',
      'mt-5 mb-2 text-lg font-semibold dim:text-slate-50 night:text-white'
    ),
    h4: makeHeading(
      'h4',
      'mt-4 mb-2 text-base font-semibold dim:text-slate-50 night:text-white'
    ),
    h5: makeHeading(
      'h5',
      'mt-3 mb-1.5 text-sm font-semibold dim:text-slate-50 night:text-white'
    ),
    h6: makeHeading(
      'h6',
      'mt-3 mb-1 text-sm font-medium dim:text-slate-200 night:text-slate-100'
    ),
    p: (props) => (
      <p
        className="mb-3 text-[15px] leading-relaxed dim:text-slate-200 night:text-slate-100/95"
        {...props}
      />
    ),
    ul: (props) => (
      <ul
        className="mb-3 list-disc space-y-1.5 pl-5 dim:text-slate-200 night:text-slate-100/95 [&_.task-list-item]:list-none [&_.task-list-item]:pl-0"
        {...props}
      />
    ),
    ol: (props) => (
      <ol
        className="mb-3 list-decimal space-y-1.5 pl-5 dim:text-slate-200 night:text-slate-100/95"
        {...props}
      />
    ),
    li: (props) => (
      <li
        className="leading-relaxed dim:text-slate-200 night:text-slate-100/95 [&>p]:mb-0"
        {...props}
      />
    ),
    img: () => null,
    a: buildHelpAnchorRenderer(onDocSelect),
    code: ({ className, children, ...rest }) => {
      const text = String(children ?? '');
      const isBlock = Boolean(className?.includes('language-')) || text.includes('\n');
      if (isBlock) {
        return (
          <code className={`font-mono text-inherit ${className || ''}`} {...rest}>
            {children}
          </code>
        );
      }
      return (
        <code
          className="rounded bg-slate-200/90 px-1.5 py-0.5 text-[0.9em] font-normal text-slate-800 night:bg-white/12 night:text-slate-100"
          {...rest}
        >
          {children}
        </code>
      );
    },
    pre: (props) => (
      <pre
        className="help-markdown-pre mb-4 overflow-x-auto rounded-lg border border-white/10 bg-gray-900/95 p-4 text-sm leading-relaxed text-slate-100 dark:bg-sd-night-950/95 night:border-white/[0.08]"
        {...props}
      />
    ),
    blockquote: (props) => (
      <blockquote
        className="mb-3 border-l-4 border-blue-500/50 bg-blue-500/5 py-2 pl-4 text-gray-800 night:border-blue-400/40 night:text-slate-100/90"
        {...props}
      />
    ),
    hr: () => <hr className="my-6 border-gray-300/50 dark:border-white/10" />,
    table: (props) => (
      <div className="mb-4 overflow-x-auto rounded-lg border border-gray-300/40 dark:border-white/10">
        <table className="min-w-full text-left text-sm dim:text-slate-200 night:text-slate-100" {...props} />
      </div>
    ),
    thead: (props) => <thead className="bg-gray-100/80 dark:bg-white/5" {...props} />,
    th: (props) => (
      <th
        className="border-b border-gray-300/60 px-3 py-2 font-semibold dark:border-white/10"
        {...props}
      />
    ),
    td: (props) => <td className="border-b border-gray-200/80 px-3 py-2 dark:border-white/[0.06]" {...props} />,
  };
}
