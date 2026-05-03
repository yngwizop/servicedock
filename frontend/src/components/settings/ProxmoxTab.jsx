import React, { useMemo, useState, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Desktop } from 'phosphor-react';
import ProxmoxConnectionCard from './ProxmoxConnectionCard';
import ProxmoxDashboardSettingsCard from './ProxmoxDashboardSettingsCard';
import SettingsModalShell from './SettingsModalShell';
import SettingsTopicLayout from './SettingsTopicLayout';

/**
 * Proxmox Settings Tab - Haupt-Container mit Modal-Popups
 * Zeigt Übersichtskarten und öffnet Konfigurationen in Modals
 */
function ProxmoxTab({ 
  activeDashboard, 
  onSettingsChange,
  savedTokenName,
  onTipsTopicChange,
}) {
  const { t } = useTranslation();
  const [activeTopic, setActiveTopic] = useState('connection');

  useLayoutEffect(() => {
    onTipsTopicChange?.('proxmox', activeTopic);
  }, [activeTopic, onTipsTopicChange]);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showDashboardModal, setShowDashboardModal] = useState(false);

  const proxmoxGroups = useMemo(
    () => [
      {
        key: 'proxmox',
        label: t('proxmoxTab.title'),
        items: [
          { id: 'connection', label: t('proxmoxTab.connection') },
          { id: 'dashboard', label: t('proxmoxTab.monitoring_dashboard') },
        ],
      },
    ],
    [t]
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1 flex items-center gap-2.5" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
          <Desktop size={22} weight="duotone" className="text-orange-400" />
          {t('proxmoxTab.title')}
        </h3>
        <p className="text-gray-700 dark:text-gray-300 text-sm" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6), 0 0 8px rgba(255,255,255,0.5)' }}>
          {t('proxmoxTab.description')}
        </p>
      </div>

      <SettingsTopicLayout
        groups={proxmoxGroups}
        activeId={activeTopic}
        onSelect={setActiveTopic}
        navAriaLabel={t('settings.topicNav.proxmox_nav_aria')}
      >
        {activeTopic === 'connection' && (
          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('proxmoxTab.connection')}</h4>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-3">{t('proxmoxTab.connection_desc')}</p>
            <p className="text-sm text-gray-700 dark:text-slate-200/95 leading-relaxed mb-4">{t('proxmoxTab.connection_body')}</p>
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {savedTokenName ? (
                <>
                  <span className="text-xs bg-emerald-600/90 text-white px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
                    <span>✓</span> {t('proxmoxTab.configured')}
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-300">Token: {savedTokenName}</span>
                </>
              ) : (
                <span className="text-xs bg-white/50 dark:bg-white/12 text-gray-800 dark:text-gray-200 px-3 py-1.5 rounded-full font-medium">
                  {t('common.not_configured')}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowConnectionModal(true)}
              className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-orange-700"
            >
              {t('settings.topicNav.cta_configure')}
            </button>
          </div>
        )}
        {activeTopic === 'dashboard' && (
          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('proxmoxTab.monitoring_dashboard')}</h4>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-3">{t('proxmoxTab.dashboard_desc')}</p>
            <p className="text-sm text-gray-700 dark:text-slate-200/95 leading-relaxed mb-4">{t('proxmoxTab.dashboard_body')}</p>
            <div className="mb-6 flex items-center gap-2">
              <span className="text-xs bg-blue-600/90 text-white px-3 py-1.5 rounded-full font-medium">{t('proxmoxTab.dashboard_settings')}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowDashboardModal(true)}
              className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-sky-700"
            >
              {t('settings.topicNav.cta_configure')}
            </button>
          </div>
        )}
      </SettingsTopicLayout>

      <SettingsModalShell
        open={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        title={t('proxmoxTab.connection')}
        subtitle={t('proxmoxTab.connection_header_desc')}
        icon={
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shrink-0">
            <span className="text-2xl">🔗</span>
          </div>
        }
      >
        <ProxmoxConnectionCard
          activeDashboard={activeDashboard}
          onSettingsChange={onSettingsChange}
          onClose={() => setShowConnectionModal(false)}
        />
      </SettingsModalShell>

      <SettingsModalShell
        open={showDashboardModal}
        onClose={() => setShowDashboardModal(false)}
        title={t('proxmoxTab.monitoring_dashboard')}
        subtitle={t('proxmoxTab.dashboard_header_desc')}
        icon={
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shrink-0">
            <span className="text-2xl">📊</span>
          </div>
        }
      >
        <ProxmoxDashboardSettingsCard onClose={() => setShowDashboardModal(false)} />
      </SettingsModalShell>
    </div>
  );
}

export default ProxmoxTab;
