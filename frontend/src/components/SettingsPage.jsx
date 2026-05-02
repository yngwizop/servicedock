import React, { useState, useEffect } from 'react';
import { Palette, SquaresFour, Desktop, Plug, Lightbulb, Info, ShieldCheck, Lightning, Translate } from 'phosphor-react';
import { useTranslation } from 'react-i18next';
import { authenticatedFetch } from '../utils/auth';
import AppearanceTab from './settings/AppearanceTab';
import ProxmoxTab from './settings/ProxmoxTab';
import DashboardsCard from './settings/DashboardsCard';
import AddOnsCard from './settings/AddOnsCard';
import LanguageCard from './settings/LanguageCard';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
  (window.location.port === '' ? 
    `${window.location.protocol}//${window.location.hostname}` :
    `${window.location.protocol}//${window.location.hostname}:8000`
  );

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
  userRole = 'admin'
}) {
  const { t } = useTranslation();

  // Active section for mobile navigation
  const [activeSection, setActiveSection] = useState('appearance');

  // Proxmox State (nur für savedTokenName in Overview)
  const [savedTokenName, setSavedTokenName] = useState('');

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

  const sections = [
    { id: 'appearance', label: t('settings.tabs.appearance'), icon: Palette },
    { id: 'dashboards', label: t('settings.tabs.dashboards'), icon: SquaresFour },
    { id: 'proxmox', label: t('settings.tabs.proxmox'), icon: Desktop },
    { id: 'addons', label: t('settings.tabs.addons'), icon: Plug },
    { id: 'language', label: t('settings.tabs.language'), icon: Translate },
  ];

  // Contextual tips per section
  const sectionTips = {
    appearance: {
      title: t('settings.tips.appearance_title'),
      icon: Palette,
      color: 'text-pink-400',
      tips: [
        { icon: Lightbulb, text: t('settings.tips.appearance.0') },
        { icon: Info, text: t('settings.tips.appearance.1') },
        { icon: Lightning, text: t('settings.tips.appearance.2') },
        { icon: ShieldCheck, text: t('settings.tips.appearance.3') },
        { icon: Info, text: t('settings.tips.appearance.4') },
        { icon: Lightbulb, text: t('settings.tips.appearance.5') },
        { icon: Lightning, text: t('settings.tips.appearance.6') },
      ]
    },
    dashboards: {
      title: t('settings.tips.dashboards_title'),
      icon: SquaresFour,
      color: 'text-blue-400',
      tips: [
        { icon: Lightbulb, text: t('settings.tips.dashboards.0') },
        { icon: Info, text: t('settings.tips.dashboards.1') },
        { icon: ShieldCheck, text: t('settings.tips.dashboards.2') },
        { icon: Lightning, text: t('settings.tips.dashboards.3') },
        { icon: Info, text: t('settings.tips.dashboards.4') },
        { icon: Lightbulb, text: t('settings.tips.dashboards.5') },
      ]
    },
    proxmox: {
      title: t('settings.tips.proxmox_title'),
      icon: Desktop,
      color: 'text-orange-400',
      tips: [
        { icon: ShieldCheck, text: t('settings.tips.proxmox.0') },
        { icon: Info, text: t('settings.tips.proxmox.1') },
        { icon: Lightbulb, text: t('settings.tips.proxmox.2') },
        { icon: Lightning, text: t('settings.tips.proxmox.3') },
        { icon: Info, text: t('settings.tips.proxmox.4') },
        { icon: Lightbulb, text: t('settings.tips.proxmox.5') },
        { icon: ShieldCheck, text: t('settings.tips.proxmox.6') },
      ]
    },
    addons: {
      title: t('settings.tips.addons_title'),
      icon: Plug,
      color: 'text-green-400',
      tips: [
        { icon: Lightbulb, text: t('settings.tips.addons.0') },
        { icon: ShieldCheck, text: t('settings.tips.addons.1') },
        { icon: Info, text: t('settings.tips.addons.2') },
        { icon: Lightning, text: t('settings.tips.addons.3') },
        { icon: Lightbulb, text: t('settings.tips.addons.4') },
        { icon: Info, text: t('settings.tips.addons.5') },
        { icon: ShieldCheck, text: t('settings.tips.addons.6') },
        { icon: Lightning, text: t('settings.tips.addons.7') },
      ]
    },
    language: {
      title: t('settings.tips.language_title'),
      icon: Translate,
      color: 'text-violet-400',
      tips: [
        { icon: Lightbulb, text: t('settings.tips.language.0') },
        { icon: Info, text: t('settings.tips.language.1') },
        { icon: Lightning, text: t('settings.tips.language.2') },
      ]
    },
  };

  const currentTips = sectionTips[activeSection] || sectionTips.appearance;
  const TipsSectionIcon = currentTips.icon;

  // Sub-Nav: gleiche aktive Fläche wie Sidebar
  const navButtonActive =
    'bg-blue-500 text-white shadow-lg shadow-blue-500/30';
  const navButtonInactive =
    'text-gray-800 dark:text-gray-100 hover:bg-white/60 dark:hover:bg-white/[0.12]';

  // Shell: hell = lesbar; dunkel = Slate-Glas (weniger „reines Schwarz“), weiterhin blur
  const settingsShell =
    'rounded-3xl overflow-hidden border border-white/28 dark:border-white/[0.07] night:border-white/[0.05] ' +
    'bg-gradient-to-br from-white/[0.78] via-white/[0.65] to-white/[0.55] ' +
    'dark:from-slate-900/55 dark:via-slate-800/48 dark:to-slate-900/52 ' +
    'night:from-sd-night-900/92 night:via-sd-night-950/78 night:to-sd-night-900/95 ' +
    'backdrop-blur-2xl shadow-2xl dark:shadow-black/25 night:shadow-black/50 ' +
    'ring-1 ring-black/[0.05] dark:ring-0 night:ring-0';
  const rowDivider = 'lg:divide-x lg:divide-white/18 dark:lg:divide-white/[0.06]';

  return (
    <div className="max-w-[1400px] mx-auto pb-2">
      <div className={settingsShell}>
        {/* Mobile: Sub-Nav oben in der Shell */}
        <nav
          className="lg:hidden border-b border-white/22 dark:border-white/[0.06] night:border-white/[0.05] bg-white/35 dark:bg-white/[0.06] sd-night-shade-flat px-2 py-2 overflow-x-auto"
          aria-label={t('settings.nav_sections_aria')}
        >
          <div className="flex gap-1 min-w-min">
            {sections.map((section) => {
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
              {sections.map((section) => {
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
            {activeSection === 'appearance' && (
              <AppearanceTab
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
              />
            )}

            {activeSection === 'proxmox' && (
              <ProxmoxTab
                activeDashboard={activeDashboard}
                savedTokenName={savedTokenName}
                onSettingsChange={handleProxmoxSettingsChange}
              />
            )}

            {activeSection === 'addons' && <AddOnsCard />}

            {activeSection === 'language' && <LanguageCard />}
          </main>

          {/* Tipps: eigene Modul-Karte (kein extra border-l → kein schwarzer Naht-Rand) */}
          <aside className="hidden xl:block w-64 2xl:w-72 shrink-0 bg-white/25 dark:bg-white/[0.05] sd-night-veil-flat p-3 sm:p-4">
            <div className="sticky top-4 rounded-2xl border border-white/22 dark:border-white/[0.06] night:border-white/[0.05] bg-white/28 dark:bg-slate-900/40 sd-night-surface backdrop-blur-md shadow-inner dark:shadow-black/15 night:shadow-black/35 px-4 py-4 md:px-5 md:py-5">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-400/25 dark:border-white/[0.07]">
                <TipsSectionIcon size={22} weight="duotone" className="text-blue-600 dark:text-blue-400 shrink-0" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-50 leading-snug tracking-tight">
                  {currentTips.title}
                </h3>
              </div>
              <ul className="space-y-3.5 list-none m-0 p-0">
                {currentTips.tips.map((tip, i) => {
                  const TipIcon = tip.icon;
                  return (
                    <li key={i} className="flex gap-2.5 items-start">
                      <TipIcon
                        size={17}
                        weight="duotone"
                        className="text-blue-600/90 dark:text-blue-300 shrink-0 mt-0.5"
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
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
