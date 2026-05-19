import React, { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { Palette, SquaresFour, Desktop, Plug, Lightbulb, Info, ShieldCheck, Lightning, Translate, Lifebuoy, BookOpen, Users, CaretLeft, CaretRight } from 'phosphor-react';
import AnimatedPane from './AnimatedPane';
import { useTranslation } from 'react-i18next';
import { useSettingsUnsaved } from '../contexts/SettingsUnsavedContext';
import { isAppearanceDirty } from '../utils/appearanceDirty';
import { authenticatedFetch } from '../utils/auth';
import { BACKEND_URL } from '../utils/backendUrl';
import AppearanceTab from './settings/AppearanceTab';
import ProxmoxTab from './settings/ProxmoxTab';
import DashboardsCard from './settings/DashboardsCard';
import AddOnsCard from './settings/AddOnsCard';
import LanguageCard from './settings/LanguageCard';
import HelpTab from './settings/HelpTab';
import UsersTab from './settings/UsersTab';
import SettingsNestedSubNav from './settings/SettingsNestedSubNav';
import SettingsCollapsible from './settings/SettingsCollapsible';
import { buildHelpNavSections, helpDocTitleKey } from './settings/helpNav';
import {
  settingsGlassShell,
  settingsGlassColumnNav,
  settingsGlassColumnMain,
  settingsGlassColumnAside,
  settingsGlassMobileNav,
  settingsGlassMobileSubnav,
  settingsNavActive,
  settingsNavInactive,
  settingsColumnSeparator,
} from './settings/settingsSurfaces';

function SectionCaret({ open, size = 18 }) {
  return (
    <CaretRight
      size={size}
      weight="bold"
      className={`shrink-0 opacity-90 transition-transform duration-200 ease-out ${open ? 'rotate-90' : ''}`}
      aria-hidden
    />
  );
}

const TIP_ICON_CYCLE = [Lightbulb, Info, Lightning, ShieldCheck, BookOpen];

const SECTION_TIP_META = {
  appearance: { icon: Palette, color: 'text-pink-400' },
  dashboards: { icon: SquaresFour, color: 'text-blue-400' },
  proxmox: { icon: Desktop, color: 'text-orange-400' },
  addons: { icon: Plug, color: 'text-green-400' },
  language: { icon: Translate, color: 'text-violet-400' },
  users: { icon: Users, color: 'text-emerald-400' },
  help: { icon: Lifebuoy, color: 'text-cyan-400' },
};

/** Abschnitte mit tipps.topics.* in den Locale-Dateien */
const TIPS_TOPIC_KEYS = {
  appearance: ['wallpaper', 'colors', 'layout', 'widgets', 'weather'],
  proxmox: ['connection', 'dashboard'],
  addons: ['config', 'spotify', 'ldap'],
};

const TIPS_TOPIC_DEFAULT = {
  appearance: 'wallpaper',
  proxmox: 'connection',
  addons: 'config',
};

function stringsToTipRows(strings) {
  if (!Array.isArray(strings)) return [];
  return strings.map((text, i) => ({
    icon: TIP_ICON_CYCLE[i % TIP_ICON_CYCLE.length],
    text,
  }));
}

function collectTopicTipStrings(sectionId, t) {
  const keys = TIPS_TOPIC_KEYS[sectionId];
  if (!keys) return [];
  const parts = [];
  for (const topic of keys) {
    parts.push(t(`settings.tips.topics.${sectionId}.${topic}.title`));
    const arr = t(`settings.tips.topics.${sectionId}.${topic}.tips`, { returnObjects: true });
    if (Array.isArray(arr)) parts.push(...arr);
  }
  return parts;
}

function SettingsPage({
  appearance,
  editAppearance, setEditAppearance, onSaveAppearance,
  isSavingAppearance, showSaved,
  currentTheme,
  weatherLocationInfo,
  dashboards,
  activeDashboard,
  onDashboardsChange,
  textColor,
  isAdmin = false,
  userRole = 'admin',
  searchTerm = ''
}) {
  const { t } = useTranslation();
  const { confirmLeave, registerDirty, unregisterDirty } = useSettingsUnsaved();

  // Active section for mobile navigation
  const [activeSection, setActiveSection] = useState('appearance');
  const [tipsExpanded, setTipsExpanded] = useState(false);
  const [activeAppearanceTopic, setActiveAppearanceTopic] = useState('wallpaper');
  const [activeHelpDocId, setActiveHelpDocId] = useState('readme');
  const [appearanceSubNavOpen, setAppearanceSubNavOpen] = useState(false);
  const [helpSubNavOpen, setHelpSubNavOpen] = useState(false);
  const [helpNavSections, setHelpNavSections] = useState([]);
  const [helpListLoading, setHelpListLoading] = useState(true);

  const appearanceTopics = useMemo(
    () => [
      { id: 'wallpaper', label: t('wallpaper.title') },
      { id: 'colors', label: t('appearance.font_colors') },
      { id: 'layout', label: t('appearance.layout') },
      { id: 'widgets', label: t('appearance.widgets') },
      { id: 'weather', label: t('appearance.weather_section') },
    ],
    [t]
  );

  const helpGroupedNav = useMemo(
    () =>
      helpNavSections.map((section) => ({
        key: section.key,
        label: t(`settings.help.groups.${section.key}`),
        items: section.items.map((d) => ({
          id: d.id,
          label: t(helpDocTitleKey(d.id), { defaultValue: d.id }),
        })),
      })),
    [helpNavSections, t]
  );

  const appearanceDirty = useMemo(
    () => isAppearanceDirty(appearance, editAppearance),
    [appearance, editAppearance]
  );

  useEffect(() => {
    registerDirty('appearance', appearanceDirty);
    return () => unregisterDirty('appearance');
  }, [appearanceDirty, registerDirty, unregisterDirty]);

  const requestSection = useCallback(
    (sectionId) => {
      if (sectionId === activeSection) return;
      confirmLeave(() => {
        setActiveSection(sectionId);
        if (sectionId === 'appearance') setAppearanceSubNavOpen(false);
        if (sectionId === 'help') setHelpSubNavOpen(false);
      }, {
        onDiscard: () => {
          if (appearanceDirty) setEditAppearance(appearance);
        },
        onSave: appearanceDirty ? onSaveAppearance : undefined,
      });
    },
    [
      activeSection,
      appearanceDirty,
      appearance,
      confirmLeave,
      onSaveAppearance,
      setEditAppearance,
    ]
  );

  const handleSectionClick = useCallback(
    (sectionId) => {
      if (sectionId === activeSection && (sectionId === 'appearance' || sectionId === 'help')) {
        if (sectionId === 'appearance') setAppearanceSubNavOpen((open) => !open);
        if (sectionId === 'help') setHelpSubNavOpen((open) => !open);
        return;
      }
      requestSection(sectionId);
    },
    [activeSection, requestSection]
  );

  const showAppearanceSubNav = activeSection === 'appearance' && appearanceSubNavOpen;
  const showHelpSubNav = activeSection === 'help' && helpSubNavOpen;
  const appearanceShowDetail = showAppearanceSubNav && Boolean(activeAppearanceTopic);

  // Proxmox State (nur für savedTokenName in Overview)
  const [savedTokenName, setSavedTokenName] = useState('');

  /** Aktives Topic je Settings-Tab (für kontextbezogene Tipps rechts) */
  const [tipsTopicBySection, setTipsTopicBySection] = useState({});

  const handleTipsTopicChange = useCallback((sectionId, topicId) => {
    setTipsTopicBySection((prev) => {
      if (prev[sectionId] === topicId) return prev;
      return { ...prev, [sectionId]: topicId };
    });
  }, []);

  const selectAppearanceTopic = useCallback(
    (topicId) => {
      setAppearanceSubNavOpen(true);
      setActiveAppearanceTopic(topicId);
      handleTipsTopicChange('appearance', topicId);
    },
    [handleTipsTopicChange]
  );

  const selectHelpDoc = useCallback((docId) => {
    setHelpSubNavOpen(true);
    setActiveHelpDocId(docId);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setHelpListLoading(true);
      try {
        const res = await authenticatedFetch(`${BACKEND_URL}/api/docs/help`);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const list = data.docs || [];
        if (cancelled) return;
        const sections = buildHelpNavSections(list);
        setHelpNavSections(sections);
        setActiveHelpDocId((prev) => {
          if (prev && list.some((d) => d.id === prev)) return prev;
          return sections[0]?.items[0]?.id ?? list[0]?.id ?? null;
        });
      } catch (err) {
        console.error('Failed to load help docs:', err);
        if (!cancelled) {
          setHelpNavSections([]);
        }
      } finally {
        if (!cancelled) setHelpListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sections = useMemo(
    () => [
      { id: 'appearance', label: t('settings.tabs.appearance'), icon: Palette },
      { id: 'dashboards', label: t('settings.tabs.dashboards'), icon: SquaresFour },
      { id: 'proxmox', label: t('settings.tabs.proxmox'), icon: Desktop },
      { id: 'addons', label: t('settings.tabs.addons'), icon: Plug },
      { id: 'language', label: t('settings.tabs.language'), icon: Translate },
      { id: 'users', label: t('settings.tabs.users'), icon: Users },
      { id: 'help', label: t('settings.tabs.help'), icon: Lifebuoy },
    ],
    [t]
  );

  const sectionSearchBlobs = useMemo(() => {
    const helpDocIds = [
      'readme',
      'quickstart',
      'initial-setup',
      'token-rotation',
      'proxmox',
      'spotify',
      'ldap',
      'deploy',
      'https',
    ];
    const out = {};
    for (const s of sections) {
      const parts = [s.label];
      if (TIPS_TOPIC_KEYS[s.id]) {
        parts.push(t(`settings.tips.${s.id}_title`));
        parts.push(...collectTopicTipStrings(s.id, t));
      } else {
        parts.push(t(`settings.tips.${s.id}_title`));
        const flat = t(`settings.tips.${s.id}`, { returnObjects: true });
        if (Array.isArray(flat)) parts.push(...flat);
      }
      if (s.id === 'help') {
        parts.push(t('settings.help.intro'));
        for (const docId of helpDocIds) {
          parts.push(t(`settings.help.docTitles.${docId}`));
        }
      }
      out[s.id] = parts.join('\n').toLowerCase();
    }
    return out;
  }, [sections, t]);

  const displaySections = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return sections;
    const hits = sections.filter((s) => sectionSearchBlobs[s.id]?.includes(q));
    return hits.length ? hits : sections;
  }, [sections, sectionSearchBlobs, searchTerm]);

  const settingsSearchHasMatches = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return sections.some((s) => sectionSearchBlobs[s.id]?.includes(q));
  }, [searchTerm, sections, sectionSearchBlobs]);

  useEffect(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return;
    const hits = sections.filter((s) => sectionSearchBlobs[s.id]?.includes(q));
    if (!hits.length) return;
    if (!hits.some((h) => h.id === activeSection)) {
      requestSection(hits[0].id);
    }
  }, [searchTerm, sections, sectionSearchBlobs, activeSection, requestSection]);

  // Lade Proxmox Token Name für Overview
  useEffect(() => {
    const fetchProxmoxConfig = async () => {
      try {
        const res = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/config?dashboard_id=${activeDashboard}`);
        const data = await res.json();
        if (data.configured) {
          setSavedTokenName(data.token_name || '');
        }
      } catch (err) {
        console.error('Failed to load Proxmox config:', err);
      }
    };
    fetchProxmoxConfig();
  }, [activeDashboard]);

  // Callback für Settings-Änderungen (z.B. zum Neuladen von savedTokenName)
  const handleProxmoxSettingsChange = () => {
    // Neu laden der Config
    const fetchProxmoxConfig = async () => {
      try {
        const res = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/config?dashboard_id=${activeDashboard}`);
        const data = await res.json();
        if (data.configured) {
          setSavedTokenName(data.token_name || '');
        } else {
          setSavedTokenName('');
        }
      } catch (err) {
        console.error('Failed to load Proxmox config:', err);
      }
    };
    fetchProxmoxConfig();
  };

  const currentTips = useMemo(() => {
    const meta = SECTION_TIP_META[activeSection] || SECTION_TIP_META.appearance;
    if (TIPS_TOPIC_KEYS[activeSection]) {
      const topic =
        activeSection === 'appearance' && !appearanceSubNavOpen
          ? TIPS_TOPIC_DEFAULT.appearance
          : tipsTopicBySection[activeSection] || TIPS_TOPIC_DEFAULT[activeSection];
      const tipsRaw = t(`settings.tips.topics.${activeSection}.${topic}.tips`, { returnObjects: true });
      const title = t(`settings.tips.topics.${activeSection}.${topic}.title`);
      const strings = Array.isArray(tipsRaw) ? tipsRaw : [];
      return {
        ...meta,
        title,
        tips: stringsToTipRows(strings),
      };
    }
    const flat = t(`settings.tips.${activeSection}`, { returnObjects: true });
    const strings = Array.isArray(flat) ? flat : [];
    return {
      ...meta,
      title: t(`settings.tips.${activeSection}_title`),
      tips: stringsToTipRows(strings),
    };
  }, [activeSection, appearanceSubNavOpen, tipsTopicBySection, t]);

  const TipsSectionIcon = currentTips.icon;

  return (
    <div className="w-full max-w-none pb-2">
      <div className={settingsGlassShell}>
        {/* Mobile: Sub-Nav oben in der Shell */}
        <nav
          className={`lg:hidden ${settingsGlassMobileNav}`}
          aria-label={t('settings.nav_sections_aria')}
        >
          <div className="flex gap-1 min-w-min">
            {displaySections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => handleSectionClick(section.id)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-expanded={
                    isActive && (section.id === 'appearance' || section.id === 'help')
                      ? section.id === 'appearance'
                        ? appearanceSubNavOpen
                        : helpSubNavOpen
                      : undefined
                  }
                  className={`flex items-center gap-2 shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ease-in-out ${
                    isActive ? settingsNavActive : settingsNavInactive
                  }`}
                >
                  <Icon size={20} weight={isActive ? 'fill' : 'regular'} className="shrink-0" />
                  <span className="truncate">{section.label}</span>
                  {section.id === 'appearance' && appearanceDirty && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title={t('settings.unsaved_badge')} aria-hidden />
                  )}
                  {isActive && section.id === 'appearance' && (
                    <SectionCaret open={appearanceSubNavOpen} size={16} />
                  )}
                  {isActive && section.id === 'help' && (
                    <SectionCaret open={helpSubNavOpen} size={16} />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <SettingsCollapsible
          open={showAppearanceSubNav || showHelpSubNav}
          className={`lg:hidden ${settingsGlassMobileSubnav}`}
          contentClassName="px-2 py-2 overflow-x-auto"
        >
          <nav aria-label={t('settings.topic_subnav_aria')}>
            <div className="flex gap-1 min-w-min">
              {showAppearanceSubNav &&
                appearanceTopics.map((topic) => {
                  const isTopicActive = activeAppearanceTopic === topic.id;
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => selectAppearanceTopic(topic.id)}
                      aria-current={isTopicActive ? 'true' : undefined}
                      className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isTopicActive ? settingsNavActive : settingsNavInactive
                      }`}
                    >
                      {topic.label}
                    </button>
                  );
                })}
              {showHelpSubNav &&
                helpGroupedNav.flatMap((g) => g.items).map((item) => {
                  const isDocActive = activeHelpDocId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectHelpDoc(item.id)}
                      aria-current={isDocActive ? 'true' : undefined}
                      className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isDocActive ? settingsNavActive : settingsNavInactive
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
            </div>
          </nav>
        </SettingsCollapsible>

        <div className="lg:flex lg:items-stretch lg:min-h-[min(70vh,680px)]">
          {/* Desktop-Subnav */}
          <div className={`hidden lg:flex flex-col w-56 xl:w-60 shrink-0 ${settingsGlassColumnNav} ${settingsColumnSeparator}`}>
            <nav className="space-y-1 sticky top-4 self-start w-full" role="navigation" aria-label={t('settings.nav_sections_aria')}>
              {displaySections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <Fragment key={section.id}>
                    <button
                      type="button"
                      onClick={() => handleSectionClick(section.id)}
                      aria-current={isActive ? 'page' : undefined}
                      aria-expanded={
                        isActive && (section.id === 'appearance' || section.id === 'help')
                          ? section.id === 'appearance'
                            ? appearanceSubNavOpen
                            : helpSubNavOpen
                          : undefined
                      }
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all duration-200 ease-in-out ${
                        isActive ? settingsNavActive : settingsNavInactive
                      }`}
                    >
                      <Icon size={22} weight={isActive ? 'fill' : 'regular'} className="shrink-0" />
                      <span className="text-left truncate flex-1">{section.label}</span>
                      {section.id === 'appearance' && appearanceDirty && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title={t('settings.unsaved_badge')} aria-hidden />
                      )}
                      {isActive && section.id === 'appearance' && (
                        <SectionCaret open={appearanceSubNavOpen} />
                      )}
                      {isActive && section.id === 'help' && (
                        <SectionCaret open={helpSubNavOpen} />
                      )}
                    </button>
                    {section.id === 'appearance' && (
                      <SettingsCollapsible open={showAppearanceSubNav}>
                        <SettingsNestedSubNav
                          items={appearanceTopics}
                          activeId={activeAppearanceTopic}
                          onSelect={selectAppearanceTopic}
                          ariaLabel={t('settings.topicNav.appearance_nav_aria')}
                        />
                      </SettingsCollapsible>
                    )}
                    {section.id === 'help' && (
                      <SettingsCollapsible open={showHelpSubNav}>
                        <SettingsNestedSubNav
                          groupedSections={helpGroupedNav}
                          activeId={activeHelpDocId}
                          onSelect={selectHelpDoc}
                          loading={helpListLoading}
                          loadingLabel={t('common.loading')}
                          ariaLabel={t('settings.help.nav_aria')}
                        />
                      </SettingsCollapsible>
                    )}
                  </Fragment>
                );
              })}
            </nav>
          </div>

          {/* Hauptinhalt */}
          <main className={settingsGlassColumnMain}>
            {searchTerm.trim() && !settingsSearchHasMatches && (
              <div
                role="status"
                className="mb-5 rounded-xl border border-amber-400/45 bg-amber-500/12 px-4 py-3 text-sm text-amber-950 dim:border-amber-400/35 dim:bg-amber-500/15 dim:text-amber-100 night:border-amber-400/30 night:bg-amber-500/15 night:text-amber-50"
              >
                {t('search.settings_no_match')}
              </div>
            )}
            <AnimatedPane paneKey={activeSection} mode="crossfade" className="mx-auto w-full max-w-5xl">
              {activeSection === 'appearance' && (
                <AppearanceTab
                  activeTopic={appearanceShowDetail ? activeAppearanceTopic : null}
                  topics={appearanceTopics}
                  onTopicSelect={selectAppearanceTopic}
                  appearanceDirty={appearanceDirty}
                  editAppearance={editAppearance}
                  setEditAppearance={setEditAppearance}
                  currentTheme={currentTheme}
                  weatherLocationInfo={weatherLocationInfo}
                  isSavingAppearance={isSavingAppearance}
                  showSaved={showSaved}
                  onSaveAppearance={onSaveAppearance}
                />
              )}

              {activeSection === 'dashboards' && (
                <DashboardsCard
                  dashboards={dashboards}
                  activeDashboard={activeDashboard}
                  onDashboardsChange={onDashboardsChange}
                  onTipsTopicChange={handleTipsTopicChange}
                />
              )}

              {activeSection === 'proxmox' && (
                <ProxmoxTab
                  activeDashboard={activeDashboard}
                  savedTokenName={savedTokenName}
                  onSettingsChange={handleProxmoxSettingsChange}
                  onTipsTopicChange={handleTipsTopicChange}
                />
              )}

              {activeSection === 'addons' && (
                <AddOnsCard onTipsTopicChange={handleTipsTopicChange} dashboards={dashboards} />
              )}

              {activeSection === 'language' && <LanguageCard onTipsTopicChange={handleTipsTopicChange} />}

              {activeSection === 'users' && <UsersTab onTipsTopicChange={handleTipsTopicChange} />}

              {activeSection === 'help' && (
                <HelpTab
                  activeDocId={activeHelpDocId}
                  onDocSelect={selectHelpDoc}
                  listLoading={helpListLoading}
                  textColor={textColor}
                />
              )}
            </AnimatedPane>
          </main>

          {/* Tipps rechts (Hilfe-Tab hat eigene Topic-Navigation) */}
          {activeSection !== 'help' && (
            <aside
              className={`hidden lg:flex lg:flex-col ${settingsGlassColumnAside} transition-[width] duration-200 ${
                tipsExpanded ? 'lg:w-56 xl:w-64 p-4 xl:p-5' : 'lg:w-12 xl:w-64 p-2 xl:p-5'
              }`}
              aria-label={t('settings.tips_aside_aria')}
            >
              <button
                type="button"
                onClick={() => setTipsExpanded((v) => !v)}
                className="xl:hidden flex items-center justify-center w-full py-2 mb-1 rounded-lg dim:text-slate-300 night:text-slate-200 hover:bg-white/50 dark:hover:bg-white/[0.08] transition-colors"
                aria-expanded={tipsExpanded}
                title={tipsExpanded ? t('settings.tips_toggle_hide') : t('settings.tips_toggle_show')}
              >
                {tipsExpanded ? (
                  <CaretRight size={20} weight="bold" aria-hidden />
                ) : (
                  <CaretLeft size={20} weight="bold" aria-hidden />
                )}
                <span className="sr-only">
                  {tipsExpanded ? t('settings.tips_toggle_hide') : t('settings.tips_toggle_show')}
                </span>
              </button>
              <div className={`space-y-3 min-w-0 ${tipsExpanded ? 'block' : 'hidden xl:block'}`}>
                <div className="flex items-start gap-2.5">
                  <TipsSectionIcon size={24} weight="duotone" className={`shrink-0 mt-0.5 ${currentTips.color}`} />
                  <h4 className="text-base font-semibold dim:text-slate-50 night:text-slate-50 tracking-tight leading-snug">
                    {currentTips.title}
                  </h4>
                </div>
                <ul className="list-none space-y-3 p-0 m-0">
                  {currentTips.tips.map((tip, i) => {
                    const TipIcon = tip.icon;
                    return (
                      <li key={i} className="flex gap-2.5 items-start text-left">
                        <TipIcon
                          size={18}
                          weight="duotone"
                          className={`shrink-0 mt-0.5 ${currentTips.color} opacity-80`}
                          aria-hidden
                        />
                        <p className="text-sm dim:text-slate-200/95 night:text-slate-100/95 leading-relaxed m-0">
                          {tip.text}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
