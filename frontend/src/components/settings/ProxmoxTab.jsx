import React from 'react';
import { useTranslation } from 'react-i18next';
import { Desktop } from 'phosphor-react';
import ProxmoxConnectionCard from './ProxmoxConnectionCard';
import ProxmoxDashboardSettingsCard from './ProxmoxDashboardSettingsCard';
import SettingsModalShell from './SettingsModalShell';

/**
 * Proxmox Settings Tab - Haupt-Container mit Modal-Popups
 * Zeigt Übersichtskarten und öffnet Konfigurationen in Modals
 */
function ProxmoxTab({ 
  activeDashboard, 
  onSettingsChange,
  savedTokenName
}) {
  const { t } = useTranslation();
  const [showConnectionModal, setShowConnectionModal] = React.useState(false);
  const [showDashboardModal, setShowDashboardModal] = React.useState(false);
  
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

        {/* Proxmox Verbindung */}
        <div
          className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.01] backdrop-blur-xl p-6
            bg-gradient-to-br from-orange-200/40 via-slate-200/58 to-amber-200/42
            dark:from-orange-950/58 dark:via-slate-900/74 dark:to-slate-950/82
            ring-1 ring-inset ring-orange-300/40 dark:ring-orange-400/18
            shadow-lg shadow-orange-900/[0.06] dark:shadow-black/30
            hover:ring-orange-400/50 dark:hover:ring-orange-300/28 hover:shadow-xl"
          onClick={() => setShowConnectionModal(true)}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <span className="text-3xl">🔗</span>
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('proxmoxTab.connection')}</h4>
                <p className="text-sm text-gray-600 dark:text-slate-300">{t('proxmoxTab.connection_desc')}</p>
              </div>
            </div>
            <div className="text-2xl text-orange-600 dark:text-orange-400 group-hover:translate-x-1 transition-transform">→</div>
          </div>
          <p className="text-sm text-gray-700 dark:text-slate-200/95 mb-4">
            {t('proxmoxTab.connection_body')}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {savedTokenName ? (
              <>
                <span className="text-xs bg-emerald-600/90 text-white px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
                  <span>✓</span> {t('proxmoxTab.configured')}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  Token: {savedTokenName}
                </span>
              </>
            ) : (
              <span className="text-xs bg-white/50 dark:bg-white/12 text-gray-800 dark:text-gray-200 px-3 py-1.5 rounded-full font-medium">
                {t('common.not_configured')}
              </span>
            )}
          </div>
        </div>

        {/* Proxmox Dashboard Settings */}
        <div
          className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.01] backdrop-blur-xl p-6
            bg-gradient-to-br from-sky-200/38 via-slate-200/58 to-cyan-200/40
            dark:from-sky-950/58 dark:via-slate-900/74 dark:to-slate-950/82
            ring-1 ring-inset ring-sky-300/38 dark:ring-sky-400/16
            shadow-lg shadow-sky-900/[0.06] dark:shadow-black/30
            hover:ring-sky-400/48 dark:hover:ring-sky-300/26 hover:shadow-xl"
          onClick={() => setShowDashboardModal(true)}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <span className="text-3xl">📊</span>
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('proxmoxTab.monitoring_dashboard')}</h4>
                <p className="text-sm text-gray-600 dark:text-slate-300">{t('proxmoxTab.dashboard_desc')}</p>
              </div>
            </div>
            <div className="text-2xl text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">→</div>
          </div>
          <p className="text-sm text-gray-700 dark:text-slate-200/95 mb-4">
            {t('proxmoxTab.dashboard_body')}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-600/90 text-white px-3 py-1.5 rounded-full font-medium">
              {t('proxmoxTab.dashboard_settings')}
            </span>
          </div>
        </div>

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
