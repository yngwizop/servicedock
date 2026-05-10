import React, { useMemo, useState, useLayoutEffect, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Desktop,
  PlugsConnected,
  ShieldCheck,
  Lightning,
  Timer,
  ChartLineUp,
  GridFour,
  Check,
} from 'phosphor-react';
import ProxmoxConnectionCard from './ProxmoxConnectionCard';
import ProxmoxDashboardSettingsCard from './ProxmoxDashboardSettingsCard';
import SettingsModalShell from './SettingsModalShell';
import SettingsTopicLayout from './SettingsTopicLayout';
import SettingsTopicPreviewGrid from './SettingsTopicPreviewGrid';
import SettingsLastModifiedLine from './SettingsLastModifiedLine';
import { authenticatedFetch } from '../../utils/auth';
import { BACKEND_URL } from '../../utils/backendUrl';

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
  const [connectionUpdatedAt, setConnectionUpdatedAt] = useState(null);
  const [monitoringUpdatedAt, setMonitoringUpdatedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [resCfg, resLayout] = await Promise.all([
          authenticatedFetch(`${BACKEND_URL}/api/proxmox/config?dashboard_id=${activeDashboard}`),
          authenticatedFetch(`${BACKEND_URL}/api/dashboards/${activeDashboard}/proxmox-layout`),
        ]);
        const cfg = await resCfg.json();
        const layout = await resLayout.json();
        if (cancelled) return;
        setConnectionUpdatedAt(cfg?.configured && cfg?.updated_at ? cfg.updated_at : null);
        setMonitoringUpdatedAt(layout?.updated_at || null);
      } catch {
        if (!cancelled) {
          setConnectionUpdatedAt(null);
          setMonitoringUpdatedAt(null);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [activeDashboard, showConnectionModal, showDashboardModal]);

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
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {savedTokenName ? (
                <>
                  <span className="text-xs bg-emerald-600/90 text-white px-3 py-1.5 rounded-full font-medium inline-flex items-center gap-1.5">
                    <Check size={14} weight="bold" className="shrink-0" aria-hidden />
                    {t('proxmoxTab.configured')}
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-300">Token: {savedTokenName}</span>
                </>
              ) : (
                <span className="text-xs bg-white/50 dark:bg-white/12 text-gray-800 dark:text-gray-200 px-3 py-1.5 rounded-full font-medium">
                  {t('common.not_configured')}
                </span>
              )}
            </div>
            <SettingsTopicPreviewGrid
              accent="orange"
              icons={[PlugsConnected, ShieldCheck, Lightning]}
              items={t('proxmoxTab.connection_preview_cards', { returnObjects: true })}
            />
            <button
              type="button"
              onClick={() => setShowConnectionModal(true)}
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-orange-500/90 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600"
            >
              {t('settings.topicNav.cta_configure')}
            </button>
            <SettingsLastModifiedLine iso={connectionUpdatedAt} />
          </div>
        )}
        {activeTopic === 'dashboard' && (
          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('proxmoxTab.monitoring_dashboard')}</h4>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-3">{t('proxmoxTab.dashboard_desc')}</p>
            <p className="text-sm text-gray-700 dark:text-slate-200/95 leading-relaxed mb-4">{t('proxmoxTab.dashboard_body')}</p>
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs bg-blue-500/85 text-white px-3 py-1 rounded-full font-medium">{t('proxmoxTab.dashboard_settings')}</span>
            </div>
            <SettingsTopicPreviewGrid
              accent="sky"
              icons={[Timer, ChartLineUp, GridFour]}
              items={t('proxmoxTab.dashboard_preview_cards', { returnObjects: true })}
            />
            <button
              type="button"
              onClick={() => setShowDashboardModal(true)}
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-sky-600/90 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700"
            >
              {t('settings.topicNav.cta_configure')}
            </button>
            <SettingsLastModifiedLine iso={monitoringUpdatedAt} />
          </div>
        )}
      </SettingsTopicLayout>

      <SettingsModalShell
        open={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        title={t('proxmoxTab.connection')}
        subtitle={t('proxmoxTab.connection_header_desc')}
        icon={
          <div className="w-12 h-12 rounded-xl bg-orange-500/15 dark:bg-orange-400/20 flex items-center justify-center shrink-0 ring-1 ring-orange-500/20 dark:ring-orange-400/15">
            <PlugsConnected size={26} weight="duotone" className="text-orange-600 dark:text-orange-300" />
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
          <div className="w-12 h-12 rounded-xl bg-sky-500/15 dark:bg-sky-400/20 flex items-center justify-center shrink-0 ring-1 ring-sky-500/20 dark:ring-sky-400/15">
            <ChartLineUp size={26} weight="duotone" className="text-sky-600 dark:text-sky-300" />
          </div>
        }
      >
        <ProxmoxDashboardSettingsCard activeDashboard={activeDashboard} />
      </SettingsModalShell>
    </div>
  );
}

export default ProxmoxTab;
