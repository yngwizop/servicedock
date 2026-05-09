import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'phosphor-react';
import { useTranslation } from 'react-i18next';
import {
  clearProxmoxMonitoringPrefs,
  getProxmoxRefreshInterval,
  getProxmoxTaskHours,
  getProxmoxTopItems,
  setProxmoxMonitoringPrefs,
} from '../../utils/proxmoxDashboardPrefs';

/**
 * Card für Proxmox Dashboard-Einstellungen (für Modal)
 */
function ProxmoxDashboardSettingsCard({ activeDashboard, onClose }) {
  const { t } = useTranslation();

  const readDefaults = () => ({
    autoRefreshInterval: getProxmoxRefreshInterval(activeDashboard),
    topItemsCount: getProxmoxTopItems(activeDashboard),
    taskTimeRange: getProxmoxTaskHours(activeDashboard),
  });

  const [settings, setSettings] = useState(() => readDefaults());
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    setSettings(readDefaults());
  }, [activeDashboard]);

  const handleSave = () => {
    setProxmoxMonitoringPrefs(activeDashboard, {
      autoRefreshInterval: settings.autoRefreshInterval,
      topItemsCount: settings.topItemsCount,
      taskTimeRange: settings.taskTimeRange,
    });
    
    setSaveStatus('success');
    setTimeout(() => setSaveStatus(''), 1500);
    
    // Trigger custom event für Layout-Update
    window.dispatchEvent(new CustomEvent('proxmox-settings-changed'));
    
    // Trigger page reload um Einstellungen zu übernehmen
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleReset = () => {
    if (!window.confirm(t('proxmoxDashboardSettings.reset_confirm'))) return;
    
    const defaults = {
      autoRefreshInterval: 30,
      topItemsCount: 10,
      taskTimeRange: 48
    };
    
    setSettings(defaults);
    clearProxmoxMonitoringPrefs(activeDashboard);
    
    setSaveStatus('reset');
    setTimeout(() => setSaveStatus(''), 1500);
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <div className="space-y-6">
      {/* Settings */}
      <div className="space-y-6">
        {/* Auto-Refresh Interval */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('proxmoxDashboardSettings.refresh_interval')}
          </label>
          <div className="grid grid-cols-4 gap-3">
            {[15, 30, 60, 120].map((seconds) => (
              <button
                key={seconds}
                onClick={() => setSettings({ ...settings, autoRefreshInterval: seconds })}
                className={`px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                  settings.autoRefreshInterval === seconds
                    ? 'bg-blue-500 text-white border-blue-500 shadow-lg scale-105'
                    : 'bg-white/60 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:scale-105'
                }`}
              >
                {seconds}s
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {t('proxmoxDashboardSettings.refresh_help')}
          </p>
        </div>

        {/* Top Items Count */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('proxmoxDashboardSettings.top_items')}
          </label>
          <div className="grid grid-cols-4 gap-3">
            {[5, 10, 15, 20].map((count) => (
              <button
                key={count}
                onClick={() => setSettings({ ...settings, topItemsCount: count })}
                className={`px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                  settings.topItemsCount === count
                    ? 'bg-blue-500 text-white border-blue-500 shadow-lg scale-105'
                    : 'bg-white/60 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:scale-105'
                }`}
              >
                Top {count}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {t('proxmoxDashboardSettings.top_items_help')}
          </p>
        </div>

        {/* Task Time Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('proxmoxDashboardSettings.task_range')}
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { hours: 24, label: '24h' },
              { hours: 48, label: '48h' },
              { hours: 168, label: t('proxmoxDashboardSettings.seven_days') }
            ].map(({ hours, label }) => (
              <button
                key={hours}
                onClick={() => setSettings({ ...settings, taskTimeRange: hours })}
                className={`px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                  settings.taskTimeRange === hours
                    ? 'bg-blue-500 text-white border-blue-500 shadow-lg scale-105'
                    : 'bg-white/60 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:scale-105'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {t('proxmoxDashboardSettings.task_range_help')}
          </p>
        </div>

        {/* Card Layout Info */}
        <div className="bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
            {t('proxmoxDashboardSettings.card_layout_placeholder')}
          </p>
        </div>

        {/* Status Message */}
        {saveStatus === 'success' && (
          <div className="p-4 rounded-xl bg-green-50/80 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-300 text-sm font-medium flex items-center gap-2">
            <CheckCircle size={18} weight="fill" />
            {t('proxmoxDashboardSettings.save_success')}
          </div>
        )}
        
        {saveStatus === 'reset' && (
          <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-300 text-sm font-medium flex items-center gap-2">
            <CheckCircle size={18} weight="fill" />
            {t('proxmoxDashboardSettings.reset_success')}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl"
          >
            {t('proxmoxDashboardSettings.save_settings')}
          </button>
          
          <button
            onClick={handleReset}
            className="py-3 px-4 bg-gray-400 hover:bg-gray-500 dark:bg-gray-600 dark:hover:bg-gray-500 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl"
          >
            {t('common.reset')}
          </button>
        </div>

        {/* Info */}
        <div className="bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            {t('proxmoxDashboardSettings.note')}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ProxmoxDashboardSettingsCard;
