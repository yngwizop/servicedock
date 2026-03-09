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
  const cardClass = "glass rounded-2xl shadow-xl p-6";

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Mobile Tab-Navigation */}
      <div className="lg:hidden flex gap-1 bg-white/70 dark:bg-white/10 backdrop-blur-xl rounded-2xl p-1.5 border border-gray-400/60 dark:border-white/20 shadow-lg mb-6">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex-1 py-2 px-2 transition-all duration-300 rounded-xl text-sm font-semibold ${
              activeSection === section.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-white/10'
            }`}
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
          >
            <section.icon size={16} weight="bold" className="inline mr-1 -mt-0.5" />
            {section.label}
          </button>
        ))}
      </div>

      {/* Desktop: Sidebar + Active Section */}
      <div className="lg:flex gap-6">
        {/* Sticky Sidebar Nav */}
        <div className="hidden lg:block w-64 shrink-0">
          <nav className="glass rounded-2xl shadow-xl p-3 sticky top-6 space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl text-base font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-white/10'
                  }`}
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
                >
                  <Icon size={22} weight={isActive ? 'fill' : 'duotone'} />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content: Only active section */}
        <div className="flex-1 min-w-0">
          {activeSection === 'appearance' && (
            <div className={cardClass}>
              <AppearanceTab
                editAppearance={editAppearance}
                setEditAppearance={setEditAppearance}
                currentTheme={currentTheme}
                weatherLocationInfo={weatherLocationInfo}
                isSavingAppearance={isSavingAppearance}
                showSaved={showSaved}
                onSaveAppearance={onSaveAppearance}
              />
            </div>
          )}

          {activeSection === 'dashboards' && (
            <div className={cardClass}>
              <DashboardsCard
                dashboards={dashboards}
                activeDashboard={activeDashboard}
                onDashboardsChange={onDashboardsChange}
              />
            </div>
          )}

          {activeSection === 'proxmox' && (
            <div className={cardClass}>
              <ProxmoxTab
                activeDashboard={activeDashboard}
                savedTokenName={savedTokenName}
                onSettingsChange={handleProxmoxSettingsChange}
              />
            </div>
          )}

          {activeSection === 'addons' && (
            <div className={cardClass}>
              <AddOnsCard />
            </div>
          )}

          {activeSection === 'language' && (
            <div className={cardClass}>
              <LanguageCard />
            </div>
          )}
        </div>

        {/* Contextual Tips Panel */}
        <div className="hidden xl:block w-72 shrink-0">
          <div className="glass rounded-2xl shadow-xl p-5 sticky top-6 transition-all duration-300">
            <div className="flex items-center gap-2.5 mb-4">
              <currentTips.icon size={22} weight="duotone" className={currentTips.color} />
              <h3 className="text-base font-bold text-gray-800 dark:text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{currentTips.title}</h3>
            </div>
            <div className="space-y-3">
              {currentTips.tips.map((tip, i) => {
                const TipIcon = tip.icon;
                return (
                  <div key={i} className="flex gap-2.5 items-start">
                    <TipIcon size={16} weight="duotone" className="text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>{tip.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
