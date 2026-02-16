import React, { useState } from 'react';
import { SlidersHorizontal, CheckCircle } from 'phosphor-react';
import { useTranslation } from 'react-i18next';

/**
 * Card für Proxmox Dashboard-Einstellungen
 */
function ProxmoxDashboardSettingsCard() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({
    autoRefreshInterval: parseInt(localStorage.getItem('proxmox_refresh_interval') || '30'),
    topItemsCount: parseInt(localStorage.getItem('proxmox_top_items') || '10'),
    taskTimeRange: parseInt(localStorage.getItem('proxmox_task_hours') || '48')
  });
  const [saveStatus, setSaveStatus] = useState('');

  const handleSave = () => {
    // Speichere in localStorage
    localStorage.setItem('proxmox_refresh_interval', settings.autoRefreshInterval.toString());
    localStorage.setItem('proxmox_top_items', settings.topItemsCount.toString());
    localStorage.setItem('proxmox_task_hours', settings.taskTimeRange.toString());
    
    setSaveStatus('success');
    setTimeout(() => setSaveStatus(''), 3000);
    
    // Trigger custom event für Layout-Update
    window.dispatchEvent(new CustomEvent('proxmox-settings-changed'));
    
    // Trigger page reload um Einstellungen zu übernehmen
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleReset = () => {
    if (!window.confirm(t('proxmoxDashboardSettings.reset_confirm'))) return;
    
    const defaults = {
      autoRefreshInterval: 30,
      topItemsCount: 10,
      taskTimeRange: 48
    };
    
    setSettings(defaults);
    localStorage.removeItem('proxmox_refresh_interval');
    localStorage.removeItem('proxmox_top_items');
    localStorage.removeItem('proxmox_task_hours');
    
    setSaveStatus('reset');
    setTimeout(() => setSaveStatus(''), 3000);
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-xl p-6 border border-purple-500/50 dark:border-purple-500/40 transition-all duration-200">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <div className="bg-purple-500/10 p-3 rounded-xl">
          <SlidersHorizontal size={32} weight="duotone" className="text-purple-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {t('proxmoxDashboardSettings.title')}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('proxmoxDashboardSettings.description')}
          </p>
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-6">
        {/* Auto-Refresh Interval */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('proxmoxDashboardSettings.refresh_interval')}
          </label>
          <div className="flex gap-3">
            {[15, 30, 60, 120].map((seconds) => (
              <button
                key={seconds}
                onClick={() => setSettings({ ...settings, autoRefreshInterval: seconds })}
                className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                  settings.autoRefreshInterval === seconds
                    ? 'bg-purple-500 text-white border-purple-500'
                    : 'bg-white/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-purple-500'
                }`}
              >
                {seconds}s
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('proxmoxDashboardSettings.refresh_help')}
          </p>
        </div>

        {/* Top Items Count */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('proxmoxDashboardSettings.top_items')}
          </label>
          <div className="flex gap-3">
            {[5, 10, 15, 20].map((count) => (
              <button
                key={count}
                onClick={() => setSettings({ ...settings, topItemsCount: count })}
                className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                  settings.topItemsCount === count
                    ? 'bg-purple-500 text-white border-purple-500'
                    : 'bg-white/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-purple-500'
                }`}
              >
                Top {count}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('proxmoxDashboardSettings.top_items_help')}
          </p>
        </div>

        {/* Task Time Range */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('proxmoxDashboardSettings.task_range')}
          </label>
          <div className="flex gap-3">
            {[
              { hours: 24, label: '24h' },
              { hours: 48, label: '48h' },
              { hours: 168, label: t('proxmoxDashboardSettings.seven_days') }
            ].map(({ hours, label }) => (
              <button
                key={hours}
                onClick={() => setSettings({ ...settings, taskTimeRange: hours })}
                className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                  settings.taskTimeRange === hours
                    ? 'bg-purple-500 text-white border-purple-500'
                    : 'bg-white/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-purple-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('proxmoxDashboardSettings.task_range_help')}
          </p>
        </div>

        {/* Card Layout */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('proxmoxDashboardSettings.card_layout')}
          </label>
          <div className="bg-slate-100 dark:bg-slate-700/50 rounded-lg p-4 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t('proxmoxDashboardSettings.card_layout_placeholder')}
            </p>
          </div>
        </div>

        {/* Status Message */}
        {saveStatus === 'success' && (
          <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm flex items-center gap-2">
            <CheckCircle size={18} weight="fill" />
            {t('proxmoxDashboardSettings.save_success')}
          </div>
        )}
        
        {saveStatus === 'reset' && (
          <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm flex items-center gap-2">
            <CheckCircle size={18} weight="fill" />
            {t('proxmoxDashboardSettings.reset_success')}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {t('proxmoxDashboardSettings.save_settings')}
          </button>
          
          <button
            onClick={handleReset}
            className="bg-slate-400 hover:bg-slate-500 dark:bg-slate-600 dark:hover:bg-slate-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {t('common.reset')}
          </button>
        </div>

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-xs text-blue-800 dark:text-blue-300">
            {t('proxmoxDashboardSettings.note')}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ProxmoxDashboardSettingsCard;
