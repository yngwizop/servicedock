import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { BookOpen, CircleNotch, WarningCircle } from 'phosphor-react';
import { authenticatedFetch } from '../../utils/auth';
import { sanitizeUrl } from '../../utils/sanitize';

/** Reihenfolge der Hilfe-Themen in der Sidebar (API liefert nur Dateinamen; Gruppierung ist UI). */
const HELP_NAV_BLUEPRINT = [
  { key: 'getting_started', ids: ['readme', 'quickstart', 'initial-setup'] },
  { key: 'security', ids: ['token-rotation'] },
  { key: 'integrations', ids: ['proxmox', 'spotify', 'ldap'] },
  { key: 'infrastructure', ids: ['deploy', 'https'] },
];

function buildHelpNavSections(docs) {
  const byId = new Map(docs.map((d) => [d.id, d]));
  const inBlueprint = new Set(HELP_NAV_BLUEPRINT.flatMap((s) => s.ids));
  const sections = HELP_NAV_BLUEPRINT.map(({ key, ids }) => ({
    key,
    items: ids.map((id) => byId.get(id)).filter(Boolean),
  })).filter((s) => s.items.length > 0);
  const orphan = docs.filter((d) => !inBlueprint.has(d.id));
  if (orphan.length) sections.push({ key: 'other', items: orphan });
  return sections;
}

function docTitleKey(id) {
  return `settings.help.docTitles.${id}`;
}

const markdownComponents = {
  h1: (props) => (
    <h1
      className="mt-8 mb-3 text-2xl font-bold tracking-tight text-gray-900 first:mt-0 dark:text-white night:text-white"
      {...props}
    />
  ),
  h2: (props) => (
    <h2
      className="mt-6 mb-2 border-b border-gray-300/60 pb-1.5 text-xl font-semibold text-gray-900 dark:border-white/10 dark:text-white night:border-white/10"
      {...props}
    />
  ),
  h3: (props) => (
    <h3 className="mt-5 mb-2 text-lg font-semibold text-gray-900 dark:text-white night:text-white" {...props} />
  ),
  p: (props) => (
    <p className="mb-3 text-[15px] leading-relaxed text-gray-800 dark:text-slate-100/95 night:text-slate-100/90" {...props} />
  ),
  ul: (props) => <ul className="mb-3 list-disc space-y-1.5 pl-5 text-gray-800 dark:text-slate-100/95" {...props} />,
  ol: (props) => <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-gray-800 dark:text-slate-100/95" {...props} />,
  li: (props) => <li className="leading-relaxed" {...props} />,
  a: ({ href, children, ...rest }) => {
    const safeHref = sanitizeUrl(href || '');
    if (!safeHref) {
      return <span className="text-blue-600 dark:text-blue-400">{children}</span>;
    }
    return (
      <a
        href={safeHref}
        className="font-medium text-blue-600 underline decoration-blue-600/40 underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        target="_blank"
        rel="noopener noreferrer"
        {...rest}
      >
        {children}
      </a>
    );
  },
  code: ({ inline, className, children, ...rest }) =>
    inline ? (
      <code
        className="rounded bg-gray-200/90 px-1.5 py-0.5 text-[0.9em] text-gray-900 dark:bg-white/10 dark:text-slate-100"
        {...rest}
      >
        {children}
      </code>
    ) : (
      <code className={`text-sm text-slate-100 ${className || ''}`} {...rest}>
        {children}
      </code>
    ),
  pre: (props) => (
    <pre
      className="mb-4 overflow-x-auto rounded-lg border border-white/10 bg-gray-900/95 p-4 dark:bg-sd-night-950/95 night:border-white/[0.08]"
      {...props}
    />
  ),
  blockquote: (props) => (
    <blockquote
      className="mb-3 border-l-4 border-blue-500/50 bg-blue-500/5 py-2 pl-4 text-gray-800 dark:border-blue-400/40 dark:text-slate-100/90"
      {...props}
    />
  ),
  hr: () => <hr className="my-6 border-gray-300/50 dark:border-white/10" />,
  table: (props) => (
    <div className="mb-4 overflow-x-auto rounded-lg border border-gray-300/40 dark:border-white/10">
      <table className="min-w-full text-left text-sm text-gray-800 dark:text-slate-100" {...props} />
    </div>
  ),
  th: (props) => (
    <th className="border-b border-gray-300/60 bg-gray-100/80 px-3 py-2 font-semibold dark:border-white/10 dark:bg-white/5" {...props} />
  ),
  td: (props) => <td className="border-b border-gray-200/80 px-3 py-2 dark:border-white/[0.06]" {...props} />,
};

/**
 * Help: Markdown-Dokumente aus dem Repo (API /api/docs/help).
 */
function HelpTab({ textColor }) {
  const { t } = useTranslation();
  const [docs, setDocs] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [markdown, setMarkdown] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [error, setError] = useState(null);

  const navSections = useMemo(() => buildHelpNavSections(docs), [docs]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingList(true);
      setError(null);
      try {
        const res = await authenticatedFetch('/api/docs/help');
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const list = data.docs || [];
        if (!cancelled) {
          setDocs(list);
          if (list.length) {
            setActiveId((prev) => {
              if (prev && list.some((d) => d.id === prev)) return prev;
              const sections = buildHelpNavSections(list);
              return sections[0]?.items[0]?.id ?? list[0].id;
            });
          }
        }
      } catch (e) {
        if (!cancelled) setError(t('settings.help.load_error'));
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const loadDoc = useCallback(
    async (id) => {
      if (!id) return;
      setLoadingDoc(true);
      setError(null);
      setMarkdown('');
      try {
        const res = await authenticatedFetch(`/api/docs/help/${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        setMarkdown(data.markdown || '');
      } catch (e) {
        setError(t('settings.help.load_error'));
      } finally {
        setLoadingDoc(false);
      }
    },
    [t]
  );

  useEffect(() => {
    if (activeId) void loadDoc(activeId);
  }, [activeId, loadDoc]);

  const labelFor = (id) => t(docTitleKey(id), { defaultValue: id });

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <nav
        className="flex w-full min-w-0 shrink-0 flex-col gap-1 rounded-xl border border-gray-300/40 bg-white/40 p-2 dark:border-white/10 dark:bg-white/[0.04] lg:w-56 xl:w-60 night:border-white/[0.07]"
        aria-label={t('settings.help.nav_aria')}
      >
        <div className="mb-1 flex items-center gap-2 px-2 py-1.5">
          <BookOpen size={22} weight="duotone" style={{ color: textColor }} className="shrink-0 opacity-90" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{t('settings.help.nav_title')}</span>
        </div>
        {loadingList ? (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-slate-300">
            <CircleNotch className="animate-spin" size={18} />
            {t('common.loading')}
          </div>
        ) : (
          <div className="flex max-h-[min(70vh,560px)] flex-col gap-3 overflow-y-auto pr-0.5">
            {navSections.map((section) => (
              <div key={section.key}>
                <p className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  {t(`settings.help.groups.${section.key}`)}
                </p>
                <div className="flex flex-col gap-0.5">
                  {section.items.map((d) => {
                    const active = d.id === activeId;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setActiveId(d.id)}
                        className={`rounded-lg px-3 py-2 text-left text-sm font-medium leading-snug transition-colors ${
                          active
                            ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25'
                            : 'text-gray-800 hover:bg-white/70 dark:text-slate-100 dark:hover:bg-white/[0.08]'
                        }`}
                      >
                        {labelFor(d.id)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </nav>

      <div className="min-h-[min(60vh,520px)] min-w-0 flex-1 rounded-xl border border-gray-300/40 bg-white/35 p-4 dark:border-white/10 dark:bg-white/[0.04] sm:p-6 night:border-white/[0.07]">
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-200">
            <WarningCircle size={20} weight="fill" className="shrink-0" />
            {error}
          </div>
        )}
        <p className="mb-4 text-sm leading-relaxed text-gray-700 dark:text-slate-300/95">{t('settings.help.intro')}</p>
        {loadingDoc ? (
          <div className="flex items-center gap-2 py-12 text-gray-600 dark:text-slate-400">
            <CircleNotch className="animate-spin" size={22} />
            {t('common.loading')}
          </div>
        ) : (
          <article className="help-markdown max-w-none">
            <ReactMarkdown components={markdownComponents}>{markdown}</ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
}

export default HelpTab;
