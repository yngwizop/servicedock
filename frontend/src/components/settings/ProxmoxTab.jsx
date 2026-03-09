import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'phosphor-react';
import ProxmoxConnectionCard from './ProxmoxConnectionCard';
import ProxmoxDashboardSettingsCard from './ProxmoxDashboardSettingsCard';

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
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            {t('proxmoxTab.title')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
            {t('proxmoxTab.description')}
          </p>
        </div>

        {/* Proxmox Verbindung Card */}
        <div 
          className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ring-2 ring-orange-500/30 hover:ring-orange-500/50"
          onClick={() => setShowConnectionModal(true)}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-red-400/10 to-transparent dark:from-orange-400/30 dark:via-red-500/20 dark:to-transparent" />
            <div className="relative backdrop-blur-xl bg-white/30 dark:bg-white/[0.04] border border-gray-200/40 dark:border-white/[0.06] p-6">
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
          className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ring-2 ring-blue-500/30 hover:ring-blue-500/50"
          onClick={() => setShowDashboardModal(true)}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-cyan-400/10 to-transparent dark:from-blue-400/30 dark:via-cyan-500/20 dark:to-transparent" />
            <div className="relative backdrop-blur-xl bg-white/30 dark:bg-white/[0.04] border border-gray-200/40 dark:border-white/[0.06] p-6">
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

      {/* Connection Modal */}
      {showConnectionModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] p-4 bg-black/50 backdrop-blur-sm overflow-y-auto" onClick={() => setShowConnectionModal(false)}>
          <div className="relative w-full max-w-2xl mb-[10vh]" onClick={(e) => e.stopPropagation()}>
            <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 rounded-2xl border border-orange-200/50 dark:border-orange-500/30 shadow-2xl">
              {/* Modal Header */}
              <div className="relative overflow-hidden rounded-t-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-red-400/10 to-transparent dark:from-orange-400/30 dark:via-red-500/20 dark:to-transparent" />
                <div className="relative p-6 border-b border-gray-200/50 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                        <span className="text-2xl">🔗</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                        {t('proxmoxTab.connection')}
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowConnectionModal(false)}
                      className="p-2 hover:bg-gray-200/50 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X size={24} className="text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                    {t('proxmoxTab.connection_header_desc')}
                  </p>
                </div>
              </div>
              {/* Modal Content */}
              <div className="p-6">
                <ProxmoxConnectionCard 
                  activeDashboard={activeDashboard}
                  onSettingsChange={onSettingsChange}
                  onClose={() => setShowConnectionModal(false)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Settings Modal */}
      {showDashboardModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] p-4 bg-black/50 backdrop-blur-sm overflow-y-auto" onClick={() => setShowDashboardModal(false)}>
          <div className="relative w-full max-w-2xl mb-[10vh]" onClick={(e) => e.stopPropagation()}>
            <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 rounded-2xl border border-blue-200/50 dark:border-blue-500/30 shadow-2xl">
              {/* Modal Header */}
              <div className="relative overflow-hidden rounded-t-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-cyan-400/10 to-transparent dark:from-blue-400/30 dark:via-cyan-500/20 dark:to-transparent" />
                <div className="relative p-6 border-b border-gray-200/50 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
                        <span className="text-2xl">📊</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                        {t('proxmoxTab.monitoring_dashboard')}
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowDashboardModal(false)}
                      className="p-2 hover:bg-gray-200/50 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X size={24} className="text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                    {t('proxmoxTab.dashboard_header_desc')}
                  </p>
                </div>
              </div>
              {/* Modal Content */}
              <div className="p-6">
                <ProxmoxDashboardSettingsCard onClose={() => setShowDashboardModal(false)} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProxmoxTab;
