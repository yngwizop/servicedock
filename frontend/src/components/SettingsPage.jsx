import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Palette, SquaresFour, Desktop, Plug, Lightbulb, Info, ShieldCheck, Lightning, Translate, Lifebuoy, BookOpen, Users } from 'phosphor-react';
import { useTranslation } from 'react-i18next';
import { authenticatedFetch } from '../utils/auth';
import { BACKEND_URL } from '../utils/backendUrl';
import AppearanceTab from './settings/AppearanceTab';
import ProxmoxTab from './settings/ProxmoxTab';
import DashboardsCard from './settings/DashboardsCard';
import AddOnsCard from './settings/AddOnsCard';
import LanguageCard from './settings/LanguageCard';
import HelpTab from './settings/HelpTab';
import UsersTab from './settings/UsersTab';

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
  editAppearance, setEditAppearance, onSaveAppearance,
  isSavingAppearance, showSaved,
  currentTheme,
  weatherLocationInfo,
  dashboards,
  activeDashboard,
  onDashboardsChange,
  textColor,
  isAdmin = true,
  userRole = 'admin',
  searchTerm = ''
}) {
  const { t } = useTranslation();

  // Active section for mobile navigation
  const [activeSection, setActiveSection] = useState('appearance');

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
      setActiveSection(hits[0].id);
    }
  }, [searchTerm, sections, sectionSearchBlobs, activeSection]);

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
      const topic = tipsTopicBySection[activeSection] || TIPS_TOPIC_DEFAULT[activeSection];
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
  }, [activeSection, tipsTopicBySection, t]);

  const TipsSectionIcon = currentTips.icon;

  // Sub-Nav: gleiche aktive Fläche wie Sidebar
  const navButtonActive =
    'bg-blue-500 text-white shadow-lg shadow-blue-500/30';
  const navButtonInactive =
    'text-gray-800 dark:text-gray-100 hover:bg-white/60 dark:hover:bg-white/[0.12]';

  // Shell: hell = lesbar; dunkel = Slate-Glas (weniger „reines Schwarz“), weiterhin blur
  const settingsShell =
    'overflow-hidden rounded-3xl border border-white/28 dark:border-white/[0.07] night:border-white/[0.05] ' +
    'bg-gradient-to-br from-white/[0.78] via-white/[0.65] to-white/[0.55] ' +
    'dark:from-slate-900/55 dark:via-slate-800/48 dark:to-slate-900/52 ' +
    'night:from-sd-night-900/92 night:via-sd-night-950/78 night:to-sd-night-900/95 ' +
    'backdrop-blur-2xl shadow-2xl dark:shadow-black/25 night:shadow-black/50 ' +
    'ring-1 ring-black/[0.05] dark:ring-0 night:ring-0';
  const rowDivider = 'lg:divide-x lg:divide-white/18 dark:lg:divide-white/[0.06]';

  return (
    <div className="w-full max-w-none pb-2 pr-4 md:pr-6">
      <div className={settingsShell}>
        {/* Mobile: Sub-Nav oben in der Shell */}
        <nav
          className="lg:hidden border-b border-white/22 dark:border-white/[0.06] night:border-white/[0.05] bg-white/35 dark:bg-white/[0.06] sd-night-shade-flat px-2 py-2 overflow-x-auto"
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
                  onClick={() => setActiveSection(section.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-2 shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ease-in-out ${
                    isActive ? navButtonActive : navButtonInactive
                  }`}
                  style={isActive ? { textShadow: '0 1px 4px rgba(0,0,0,0.35)' } : undefined}
                >
                  <Icon size={20} weight={isActive ? 'fill' : 'regular'} className="shrink-0" />
                  {section.label}
                </button>
              );
            })}
          </div>
        </nav>

        <div className={`lg:flex lg:items-stretch lg:min-h-[min(70vh,680px)] ${rowDivider}`}>
          {/* Desktop-Subnav */}
          <div className="hidden lg:flex flex-col w-56 xl:w-60 shrink-0 bg-white/30 dark:bg-white/[0.05] sd-night-veil-flat p-3">
            <nav className="space-y-1 sticky top-4 self-start w-full" role="navigation" aria-label={t('settings.nav_sections_aria')}>
              {displaySections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all duration-200 ease-in-out ${
                      isActive ? navButtonActive : navButtonInactive
                    }`}
                    style={isActive ? { textShadow: '0 1px 4px rgba(0,0,0,0.35)' } : undefined}
                  >
                    <Icon size={22} weight={isActive ? 'fill' : 'regular'} className="shrink-0" />
                    <span className="text-left truncate">{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Hauptinhalt */}
          <main className="flex-1 min-w-0 bg-white/22 dark:bg-white/[0.04] sd-night-tint-flat px-5 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
            {searchTerm.trim() && !settingsSearchHasMatches && (
              <div
                role="status"
                className="mb-5 rounded-xl border border-amber-400/45 bg-amber-500/12 px-4 py-3 text-sm text-amber-950 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-50"
              >
                {t('search.settings_no_match')}
              </div>
            )}
            {activeSection === 'appearance' && (
              <AppearanceTab
                editAppearance={editAppearance}
                setEditAppearance={setEditAppearance}
                currentTheme={currentTheme}
                weatherLocationInfo={weatherLocationInfo}
                isSavingAppearance={isSavingAppearance}
                showSaved={showSaved}
                onSaveAppearance={onSaveAppearance}
                onTipsTopicChange={handleTipsTopicChange}
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

            {activeSection === 'addons' && <AddOnsCard onTipsTopicChange={handleTipsTopicChange} />}

            {activeSection === 'language' && <LanguageCard onTipsTopicChange={handleTipsTopicChange} />}

            {activeSection === 'users' && <UsersTab onTipsTopicChange={handleTipsTopicChange} />}

            {activeSection === 'help' && <HelpTab textColor={textColor} />}
          </main>

          {/* Tipps rechts (Hilfe-Tab hat eigene Topic-Navigation) */}
          {activeSection !== 'help' && (
            <aside
              className="hidden lg:flex lg:flex-col lg:w-56 xl:w-64 shrink-0 border-t border-white/22 dark:border-white/[0.06] night:border-white/[0.05] lg:border-t-0 lg:border-l bg-white/28 dark:bg-white/[0.05] sd-night-veil-flat p-4 xl:p-5"
              aria-label={t('settings.tips_aside_aria')}
            >
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <TipsSectionIcon size={24} weight="duotone" className={`shrink-0 mt-0.5 ${currentTips.color}`} />
                  <h4 className="text-base font-semibold text-gray-900 dark:text-slate-50 tracking-tight leading-snug">
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
                        <p className="text-sm text-gray-800 dark:text-slate-100/95 leading-relaxed m-0">
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
