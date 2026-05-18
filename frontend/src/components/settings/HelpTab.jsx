import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Lifebuoy, CircleNotch, WarningCircle } from 'phosphor-react';
import { authenticatedFetch } from '../../utils/auth';
import { BACKEND_URL } from '../../utils/backendUrl';
import { HELP_OVERVIEW_DOC_ID, prepareHelpMarkdown } from '../../utils/helpMarkdown';
import { buildHelpMarkdownComponents } from './helpMarkdownComponents';
import AnimatedPane from '../AnimatedPane';
import { settingsDetailCardClass } from './SettingsTopicLayout';

/**
 * Help: Markdown from /api/docs/help. Overview uses readme; topics via sidebar.
 */
function HelpTab({
  activeDocId = HELP_OVERVIEW_DOC_ID,
  onDocSelect,
  listLoading = false,
  textColor,
}) {
  const { t } = useTranslation();
  const [markdown, setMarkdown] = useState('');
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [error, setError] = useState(null);

  const docId = activeDocId || HELP_OVERVIEW_DOC_ID;
  const isOverview = docId === HELP_OVERVIEW_DOC_ID;

  const markdownComponents = useMemo(
    () => buildHelpMarkdownComponents(onDocSelect),
    [onDocSelect]
  );

  const loadDoc = useCallback(
    async (id) => {
      if (!id) return;
      setLoadingDoc(true);
      setError(null);
      setMarkdown('');
      try {
        const res = await authenticatedFetch(`${BACKEND_URL}/api/docs/help/${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        setMarkdown(prepareHelpMarkdown(data.markdown || '', id));
      } catch {
        setError(t('settings.help.load_error'));
      } finally {
        setLoadingDoc(false);
      }
    },
    [t]
  );

  useEffect(() => {
    void loadDoc(docId);
  }, [docId, loadDoc]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold dim:text-slate-50 night:text-white mb-1 flex items-center gap-2.5">
          <Lifebuoy size={22} weight="duotone" className="text-cyan-400" style={textColor ? { color: textColor } : undefined} />
          {t('settings.tabs.help')}
        </h3>
        <p className="dim:text-slate-300 night:text-gray-300 text-sm">
          {t('settings.help.intro')}
        </p>
        {!listLoading && isOverview && (
          <p className="mt-2 text-sm dim:text-slate-400 night:text-slate-400">
            {t('settings.help.overview_hint')}
          </p>
        )}
      </div>

      <div className={`${settingsDetailCardClass} min-h-[min(40vh,480px)]`}>
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-200">
            <WarningCircle size={20} weight="fill" className="shrink-0" />
            {error}
          </div>
        )}

        <AnimatedPane paneKey={docId} mode="crossfade" variant="fade">
          {loadingDoc || listLoading ? (
            <div className="flex items-center gap-2 py-12 text-gray-600 dark:text-slate-400">
              <CircleNotch className="animate-spin" size={22} />
              {t('common.loading')}
            </div>
          ) : (
            <article className="help-markdown max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {markdown}
              </ReactMarkdown>
            </article>
          )}
        </AnimatedPane>
      </div>
    </div>
  );
}

export default HelpTab;
