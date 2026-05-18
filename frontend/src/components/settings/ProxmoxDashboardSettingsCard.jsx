import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { CheckCircle, Timer, ChartBar, CalendarBlank, Lightbulb, Palette } from 'phosphor-react';
import { useTranslation } from 'react-i18next';
import {
  clearProxmoxMonitoringPrefs,
  getProxmoxRefreshInterval,
  getProxmoxTaskHours,
  getProxmoxTopItems,
  setProxmoxMonitoringPrefs,
} from '../../utils/proxmoxDashboardPrefs';
import SettingsModalSectionTitle from './SettingsModalSectionTitle';

const choiceBase =
  'px-4 py-2.5 rounded-xl border font-medium text-sm transition-colors ' +
  'bg-white/45 dark:bg-white/[0.07] text-gray-900 night:text-slate-100 ' +
  'border-gray-300/70 dark:border-white/[0.12] ' +
  'hover:bg-white/70 dark:hover:bg-white/[0.11] hover:border-gray-400/80 dark:hover:border-white/[0.18]';

const choiceActive =
  'px-4 py-2.5 rounded-xl border font-medium text-sm transition-colors ' +
  'bg-blue-500/95 dark:bg-blue-500/90 text-white border-blue-500/90 dark:border-blue-500/80 ' +
  'shadow-sm shadow-blue-900/10 dark:shadow-black/25';

function settingsEqual(a, b) {
  if (!a || !b) return true;
  return (
    a.autoRefreshInterval === b.autoRefreshInterval &&
    a.topItemsCount === b.topItemsCount &&
    a.taskTimeRange === b.taskTimeRange
  );
}

function ProxmoxDashboardSettingsCard({ activeDashboard, onDirtyChange, onBindDiscard }) {
  const { t } = useTranslation();

  const readDefaults = useCallback(
    () => ({
      autoRefreshInterval: getProxmoxRefreshInterval(activeDashboard),
      topItemsCount: getProxmoxTopItems(activeDashboard),
      taskTimeRange: getProxmoxTaskHours(activeDashboard),
    }),
    [activeDashboard]
  );

  const [settings, setSettings] = useState(() => readDefaults());
  const [snapshot, setSnapshot] = useState(() => readDefaults());
  const [saveStatus, setSaveStatus] = useState('');

  const isDirty = useMemo(() => !settingsEqual(settings, snapshot), [settings, snapshot]);

  const resetToSnapshot = useCallback(() => {
    setSettings({ ...snapshot });
    setSaveStatus('');
  }, [snapshot]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    onBindDiscard?.(resetToSnapshot);
  }, [onBindDiscard, resetToSnapshot]);

  useEffect(() => {
    const defaults = readDefaults();
    setSettings(defaults);
    setSnapshot(defaults);
  }, [activeDashboard, readDefaults]);

  const handleSave = () => {
    setProxmoxMonitoringPrefs(activeDashboard, {
      autoRefreshInterval: settings.autoRefreshInterval,
      topItemsCount: settings.topItemsCount,
      taskTimeRange: settings.taskTimeRange,
    });

    setSnapshot({ ...settings });
    setSaveStatus('success');
    setTimeout(() => setSaveStatus(''), 1500);

    window.dispatchEvent(new CustomEvent('proxmox-settings-changed'));

    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleReset = () => {
    if (!window.confirm(t('proxmoxDashboardSettings.reset_confirm'))) return;

    const defaults = {
      autoRefreshInterval: 30,
      topItemsCount: 10,
      taskTimeRange: 48,
    };

    setSettings(defaults);
    clearProxmoxMonitoringPrefs(activeDashboard);

    setSaveStatus('reset');
    setTimeout(() => setSaveStatus(''), 1500);
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-8">
        <div>
          <SettingsModalSectionTitle icon={Timer} divider>
            {t('proxmoxDashboardSettings.refresh_interval')}
          </SettingsModalSectionTitle>
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {[15, 30, 60, 120].map((seconds) => (
              <button
                key={seconds}
                type="button"
                onClick={() => setSettings({ ...settings, autoRefreshInterval: seconds })}
                className={settings.autoRefreshInterval === seconds ? choiceActive : choiceBase}
              >
                {seconds}s
              </button>
            ))}
          </div>
          <p className="text-xs sm:text-sm text-gray-700 dark:text-slate-300 mt-2.5 leading-relaxed">
            {t('proxmoxDashboardSettings.refresh_help')}
          </p>
        </div>

        <div>
          <SettingsModalSectionTitle icon={ChartBar} divider>
            {t('proxmoxDashboardSettings.top_items')}
          </SettingsModalSectionTitle>
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {[5, 10, 15, 20].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setSettings({ ...settings, topItemsCount: count })}
                className={settings.topItemsCount === count ? choiceActive : choiceBase}
              >
                Top {count}
              </button>
            ))}
          </div>
          <p className="text-xs sm:text-sm text-gray-700 dark:text-slate-300 mt-2.5 leading-relaxed">
            {t('proxmoxDashboardSettings.top_items_help')}
          </p>
        </div>

        <div>
          <SettingsModalSectionTitle icon={CalendarBlank} divider>
            {t('proxmoxDashboardSettings.task_range')}
          </SettingsModalSectionTitle>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { hours: 24, label: '24h' },
              { hours: 48, label: '48h' },
              { hours: 168, label: t('proxmoxDashboardSettings.seven_days') },
            ].map(({ hours, label }) => (
              <button
                key={hours}
                type="button"
                onClick={() => setSettings({ ...settings, taskTimeRange: hours })}
                className={settings.taskTimeRange === hours ? choiceActive : choiceBase}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs sm:text-sm text-gray-700 dark:text-slate-300 mt-2.5 leading-relaxed">
            {t('proxmoxDashboardSettings.task_range_help')}
          </p>
        </div>

        <div className="rounded-xl border border-blue-400/35 dark:border-blue-400/30 bg-blue-500/[0.08] dark:bg-blue-950/45 px-4 py-3">
          <div className="flex gap-2.5 items-start">
            <Palette size={18} weight="duotone" className="shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
            <p className="text-sm text-blue-950 dark:text-blue-100 leading-relaxed m-0">
              {t('proxmoxDashboardSettings.card_layout_placeholder')}
            </p>
          </div>
        </div>

        {saveStatus === 'success' && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/35 dark:border-emerald-500/25 bg-emerald-500/10 dark:bg-emerald-950/40 px-4 py-3 text-sm font-medium text-emerald-950 dark:text-emerald-100">
            <CheckCircle size={18} weight="fill" className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            {t('proxmoxDashboardSettings.save_success')}
          </div>
        )}

        {saveStatus === 'reset' && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-400/35 dark:border-blue-500/25 bg-blue-500/10 dark:bg-blue-950/40 px-4 py-3 text-sm font-medium text-blue-950 dark:text-blue-100">
            <CheckCircle size={18} weight="fill" className="shrink-0 text-blue-600 dark:text-blue-400" />
            {t('proxmoxDashboardSettings.reset_success')}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center py-2 px-4 rounded-lg text-sm font-medium border border-gray-300/80 dark:border-white/[0.14] bg-white/50 dark:bg-white/[0.06] text-gray-900 night:text-slate-100 hover:bg-white/80 dark:hover:bg-white/[0.1] transition-colors"
          >
            {t('common.reset')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center justify-center py-2 px-5 rounded-lg text-sm font-medium bg-blue-500/90 hover:bg-blue-600 text-white shadow-sm transition-colors sm:min-w-[10rem]"
          >
            {t('proxmoxDashboardSettings.save_settings')}
          </button>
        </div>
        <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed m-0">
          {t('proxmoxDashboardSettings.reload_hint')}
        </p>

        <div className="rounded-xl border border-amber-400/40 dark:border-amber-500/30 bg-amber-500/[0.09] dark:bg-amber-950/50 px-4 py-3">
          <div className="flex gap-2.5 items-start">
            <Lightbulb size={18} weight="duotone" className="shrink-0 mt-0.5 text-amber-700 dark:text-amber-300" />
            <p className="text-xs sm:text-sm text-amber-950 dark:text-amber-50 leading-relaxed m-0">
              {t('proxmoxDashboardSettings.note')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProxmoxDashboardSettingsCard;
