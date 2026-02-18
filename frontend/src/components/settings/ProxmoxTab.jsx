import React from 'react';
import { useTranslation } from 'react-i18next';
import ProxmoxConnectionCard from './ProxmoxConnectionCard';
import ProxmoxDashboardSettingsCard from './ProxmoxDashboardSettingsCard';

/**
 * Proxmox Settings Tab - Haupt-Container
 * Zeigt Übersichtskarten mit Navigation zu Detailseiten
 */
function ProxmoxTab({ 
  activeDashboard, 
  onSettingsChange,
  showProxmoxConnectionPage,
  setShowProxmoxConnectionPage,
  showProxmoxDashboardPage,
  setShowProxmoxDashboardPage,
  proxmoxConfig,
  setProxmoxConfig,
  savedTokenName,
  isSavingProxmox,
  proxmoxSaved,
  handleSaveProxmox,
  onOpenDeleteModal
}) {
  const [connectionConfigured, setConnectionConfigured] = React.useState(false);
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      {!showProxmoxConnectionPage && !showProxmoxDashboardPage ? (
        /* Proxmox Übersicht */
        <>
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              {t('proxmoxTab.title')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              {t('proxmoxTab.description')}
            </p>
          </div>

          {/* Proxmox Verbindung Card */}
          <div 
            className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
            onClick={() => setShowProxmoxConnectionPage(true)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-red-400/10 to-transparent dark:from-orange-400/30 dark:via-red-500/20 dark:to-transparent" />
            <div className="relative backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <span className="text-3xl">🔗</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('proxmoxTab.connection')}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('proxmoxTab.connection_desc')}</p>
                  </div>
                </div>
                <div className="text-2xl text-orange-600 dark:text-orange-400 group-hover:translate-x-1 transition-transform">→</div>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                {t('proxmoxTab.connection_body')}
              </p>
              <div className="flex items-center gap-2">
                {savedTokenName ? (
                  <>
                    <span className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
                    <span>✓</span> {t('proxmoxTab.configured')}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Token: {savedTokenName}
                  </span>
                </>
                ) : (
                  <span className="text-xs bg-gray-500 text-white px-3 py-1.5 rounded-full font-medium">
                    {t('common.not_configured')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Proxmox Dashboard Settings Card */}
          <div 
            className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
            onClick={() => setShowProxmoxDashboardPage(true)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-cyan-400/10 to-transparent dark:from-blue-400/30 dark:via-cyan-500/20 dark:to-transparent" />
            <div className="relative backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <span className="text-3xl">📊</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('proxmoxTab.monitoring_dashboard')}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('proxmoxTab.dashboard_desc')}</p>
                  </div>
                </div>
                <div className="text-2xl text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">→</div>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                {t('proxmoxTab.dashboard_body')}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-full font-medium">
                  {t('proxmoxTab.dashboard_settings')}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : showProxmoxConnectionPage ? (
        /* Proxmox Verbindung Detail-Seite */
        <div className="space-y-6">
          {/* Back Button */}
          <button
            onClick={() => setShowProxmoxConnectionPage(false)}
            className="flex items-center gap-2 px-4 py-2 mb-4 bg-white/70 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 backdrop-blur-md border border-gray-400/60 dark:border-white/10 rounded-xl transition-all text-gray-700 dark:text-gray-300 font-medium shadow-lg"
          >
            <span className="text-xl">←</span>
            {t('proxmoxTab.back')}
          </button>

          {/* Header Card */}
          <div className="relative overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-red-400/10 to-transparent dark:from-orange-400/30 dark:via-red-500/20 dark:to-transparent" />
            <div className="relative backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-white/10 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                  <span className="text-2xl">🔗</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                  {t('proxmoxTab.connection')}
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {t('proxmoxTab.connection_header_desc')}
              </p>
            </div>
          </div>

          <ProxmoxConnectionCard 
            activeDashboard={activeDashboard}
            onSettingsChange={onSettingsChange}
          />
        </div>
      ) : showProxmoxDashboardPage ? (
        /* Proxmox Dashboard Detail-Seite */
        <div className="space-y-6">
          {/* Back Button */}
          <button
            onClick={() => setShowProxmoxDashboardPage(false)}
            className="flex items-center gap-2 px-4 py-2 mb-4 bg-white/70 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 backdrop-blur-md border border-gray-400/60 dark:border-white/10 rounded-xl transition-all text-gray-700 dark:text-gray-300 font-medium shadow-lg"
          >
            <span className="text-xl">←</span>
            {t('proxmoxTab.back')}
          </button>

          {/* Header Card */}
          <div className="relative overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-cyan-400/10 to-transparent dark:from-blue-400/30 dark:via-cyan-500/20 dark:to-transparent" />
            <div className="relative backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-white/10 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                  {t('proxmoxTab.monitoring_dashboard')}
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {t('proxmoxTab.dashboard_header_desc')}
              </p>
            </div>
          </div>

          <ProxmoxDashboardSettingsCard />
        </div>
      ) : null}
    </div>
  );
}

export default ProxmoxTab;
