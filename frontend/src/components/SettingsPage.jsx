import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  textColor
}) {
  const { t } = useTranslation();

  // Active section for mobile navigation
  const [activeSection, setActiveSection] = useState('appearance');

  // Proxmox State
  const [proxmoxConfig, setProxmoxConfig] = useState({
    host: '', port: 8006, token_name: '', token_value: '',
    verify_ssl: false, node: '', is_cluster: false
  });
  const [savedTokenName, setSavedTokenName] = useState('');
  const [isSavingProxmox, setIsSavingProxmox] = useState(false);
  const [proxmoxSaved, setProxmoxSaved] = useState(false);
  const [showProxmoxDeleteModal, setShowProxmoxDeleteModal] = useState(false);
  const [showProxmoxResultModal, setShowProxmoxResultModal] = useState(false);
  const [proxmoxResultType, setProxmoxResultType] = useState('success');
  const [proxmoxResultMessage, setProxmoxResultMessage] = useState('');
  const [showProxmoxConnectionPage, setShowProxmoxConnectionPage] = useState(false);
  const [showProxmoxDashboardPage, setShowProxmoxDashboardPage] = useState(false);

  // Lade Proxmox config
  useEffect(() => {
    const fetchProxmoxConfig = async () => {
      try {
        const res = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/config?dashboard_id=${activeDashboard}`);
        const data = await res.json();
        if (data.configured) {
          setSavedTokenName(data.token_name || '');
          setProxmoxConfig({
            host: data.host || '', port: data.port || 8006,
            token_name: '', token_value: '',
            verify_ssl: data.verify_ssl || false,
            node: data.node || '', is_cluster: data.is_cluster || false
          });
        }
      } catch (err) {
        console.error('Failed to load Proxmox config:', err);
      }
    };
    fetchProxmoxConfig();
  }, [activeDashboard]);

  const handleSaveProxmox = async (e) => {
    e.preventDefault();
    setIsSavingProxmox(true);
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/config?dashboard_id=${activeDashboard}`, {
        method: 'PUT',
        body: JSON.stringify(proxmoxConfig)
      });
      if (res.ok) {
        setProxmoxSaved(true);
        try {
          const testRes = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/test?dashboard_id=${activeDashboard}`, { method: 'POST' });
          const testData = await testRes.json();
          if (testData.success) {
            const nodeInfo = testData.nodes ? ` (${testData.nodes.length} Node(s) gefunden: ${testData.nodes.join(', ')})` : '';
            setProxmoxResultType('success');
            setProxmoxResultMessage(t('settings.proxmox_save_success'));
          } else {
            setProxmoxResultType('error');
            setProxmoxResultMessage(t('settings.proxmox_save_test_failed', { error: testData.error }));
          }
        } catch {
          setProxmoxResultType('error');
          setProxmoxResultMessage(t('settings.proxmox_save_no_test'));
        }
        setShowProxmoxResultModal(true);
        setTimeout(() => setProxmoxSaved(false), 3000);
      } else {
        setProxmoxResultType('error');
        setProxmoxResultMessage(t('settings.proxmox_save_error'));
        setShowProxmoxResultModal(true);
      }
    } catch (err) {
      console.error('Failed to save Proxmox config:', err);
      setProxmoxResultType('error');
      setProxmoxResultMessage(t('settings.proxmox_save_error'));
      setShowProxmoxResultModal(true);
    } finally {
      setIsSavingProxmox(false);
    }
  };

  const handleDeleteProxmox = async () => {
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/config?dashboard_id=${activeDashboard}`, { method: 'DELETE' });
      if (res.ok) {
        setProxmoxResultType('success');
        setProxmoxResultMessage(t('settings.proxmox_delete_success'));
        setProxmoxConfig({ host: '', port: 8006, token_name: '', token_value: '', verify_ssl: false, node: '', is_cluster: false });
        setSavedTokenName('');
      } else {
        const errorData = await res.json();
        setProxmoxResultType('error');
        setProxmoxResultMessage(t('settings.proxmox_delete_error', { detail: errorData.detail || 'Unbekannter Fehler' }));
      }
      setShowProxmoxResultModal(true);
    } catch (err) {
      console.error('Failed to delete Proxmox config:', err);
      setProxmoxResultType('error');
      setProxmoxResultMessage(t('settings.proxmox_delete_error_generic'));
      setShowProxmoxResultModal(true);
    }
  };

  const sections = [
    { id: 'appearance', label: t('settings.tabs.appearance'), icon: Palette },
    { id: 'dashboards', label: t('settings.tabs.dashboards'), icon: SquaresFour },
    { id: 'proxmox', label: t('settings.tabs.proxmox'), icon: Desktop },
    { id: 'addons', label: t('settings.tabs.addons'), icon: Plug },
    { id: 'language', label: t('settings.tabs.language'), icon: Translate },
  ];

  // Refs for each section
  const sectionRefs = useRef({});
  const isScrollingTo = useRef(false);

  // Scroll-spy: update activeSection based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (isScrollingTo.current) return;

      // If scrolled to the very bottom, always activate the last section
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        setActiveSection(sections[sections.length - 1].id);
        return;
      }

      const offset = 160; // header + some padding
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = sectionRefs.current[sections[i].id];
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= offset) {
            setActiveSection(sections[i].id);
            return;
          }
        }
      }
      setActiveSection(sections[0].id);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = useCallback((id) => {
    const el = sectionRefs.current[id];
    if (!el) return;
    isScrollingTo.current = true;
    setActiveSection(id);
    const y = el.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top: y, behavior: 'smooth' });
    setTimeout(() => { isScrollingTo.current = false; }, 1200);
  }, []);

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
  const cardClass = "bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 shadow-xl p-6";

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Mobile Tab-Navigation */}
      <div className="lg:hidden flex gap-1 bg-white/70 dark:bg-white/10 backdrop-blur-xl rounded-2xl p-1.5 border border-gray-400/60 dark:border-white/20 shadow-lg mb-6">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => {
              setActiveSection(section.id);
              scrollToSection(section.id);
            }}
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

      {/* Desktop: Sidebar + All Sections */}
      <div className="lg:flex gap-6">
        {/* Sticky Sidebar Nav */}
        <div className="hidden lg:block w-64 shrink-0">
          <nav className="bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 shadow-xl p-3 sticky top-6 space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
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

        {/* Content: All Sections stacked */}
        <div className="flex-1 min-w-0 space-y-8">
          {/* Appearance */}
          <section ref={(el) => (sectionRefs.current['appearance'] = el)} id="settings-appearance">
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
          </section>

          {/* Dashboards */}
          <section ref={(el) => (sectionRefs.current['dashboards'] = el)} id="settings-dashboards">
            <div className={cardClass}>
              <DashboardsCard
                dashboards={dashboards}
                activeDashboard={activeDashboard}
                onDashboardsChange={onDashboardsChange}
              />
            </div>
          </section>

          {/* Proxmox */}
          <section ref={(el) => (sectionRefs.current['proxmox'] = el)} id="settings-proxmox">
            <div className={cardClass}>
              <ProxmoxTab
                proxmoxConfig={proxmoxConfig}
                setProxmoxConfig={setProxmoxConfig}
                savedTokenName={savedTokenName}
                isSavingProxmox={isSavingProxmox}
                proxmoxSaved={proxmoxSaved}
                handleSaveProxmox={handleSaveProxmox}
                onOpenDeleteModal={() => setShowProxmoxDeleteModal(true)}
                showProxmoxConnectionPage={showProxmoxConnectionPage}
                setShowProxmoxConnectionPage={setShowProxmoxConnectionPage}
                showProxmoxDashboardPage={showProxmoxDashboardPage}
                setShowProxmoxDashboardPage={setShowProxmoxDashboardPage}
                activeDashboard={activeDashboard}
              />
            </div>
          </section>

          {/* AddOns */}
          <section ref={(el) => (sectionRefs.current['addons'] = el)} id="settings-addons">
            <div className={cardClass}>
              <AddOnsCard />
            </div>
          </section>

          {/* Language */}
          <section ref={(el) => (sectionRefs.current['language'] = el)} id="settings-language">
            <div className={cardClass}>
              <LanguageCard />
            </div>
          </section>
        </div>

        {/* Contextual Tips Panel */}
        <div className="hidden xl:block w-72 shrink-0">
          <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 shadow-xl p-5 sticky top-6 transition-all duration-300">
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

      {/* Proxmox Delete Confirmation Modal */}
      {showProxmoxDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border-2 border-red-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-red-500">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                {t('settings.proxmox_delete_title')}
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('settings.proxmox_delete_warning')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowProxmoxDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => { setShowProxmoxDeleteModal(false); handleDeleteProxmox(); }}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                {t('common.yes_delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proxmox Result Modal */}
      {showProxmoxResultModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border-2 ${
            proxmoxResultType === 'success' ? 'border-green-500' : 'border-red-500'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={proxmoxResultType === 'success' ? 'text-green-500' : 'text-red-500'}>
                {proxmoxResultType === 'success' ? (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                {proxmoxResultType === 'success' ? t('settings.result_success') : t('settings.result_error')}
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6 whitespace-pre-line">
              {proxmoxResultMessage}
            </p>
            <button
              onClick={() => setShowProxmoxResultModal(false)}
              className={`w-full px-4 py-2 ${
                proxmoxResultType === 'success' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
              } text-white rounded-lg transition-colors`}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
