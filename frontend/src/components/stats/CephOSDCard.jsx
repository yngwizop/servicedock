import React from 'react';
import { useTranslation } from 'react-i18next';
import { HardDrives, CheckCircle, XCircle, Disc } from 'phosphor-react';
import StatCard from './StatCard';

/**
 * Ceph OSD reachability (up/total) — cluster health is on CephHealthCard.
 */
function CephOSDCard({ ceph }) {
  const { t } = useTranslation();

  if (!ceph || !ceph.available || !ceph.osd) {
    return (
      <StatCard
        title={t('statusDashboard.card_ceph_osd')}
        icon={<HardDrives size={28} weight="duotone" />}
      >
        <div className="flex h-full min-h-0 flex-col items-center justify-center py-8 text-center">
          <Disc size={72} weight="duotone" className="mb-3 text-gray-500/50 dark:text-gray-400/35" />
          <div className="text-sm text-gray-600 dark:text-gray-400">{t('stats.no_osd')}</div>
        </div>
      </StatCard>
    );
  }

  const osd = ceph.osd;
  const upPercent = osd.total > 0 ? (osd.up / osd.total) * 100 : 0;
  const clusterOk = ceph.status?.includes('OK');
  const clusterWarn = ceph.status?.includes('WARN');
  const clusterErr = ceph.status?.includes('ERR');

  const getUpPercentColor = () => {
    if (upPercent < 80) return 'text-red-600 dark:text-red-400';
    if (upPercent < 100) return 'text-orange-600 dark:text-orange-400';
    if (!clusterOk && (clusterWarn || clusterErr)) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  };

  return (
    <StatCard
      title={t('statusDashboard.card_ceph_osd')}
      icon={<HardDrives size={28} weight="duotone" />}
    >
      <div className="flex h-full min-h-0 flex-col gap-2">
        <div className="shrink-0 space-y-1.5 text-center">
          <div>
            <div className="text-3xl font-bold text-gray-800 dark:text-white">{osd.total}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{t('stats.ceph_osd_total')}</div>
          </div>
          <div className="pb-0.5">
            <div className={`text-xl font-bold ${getUpPercentColor()}`}>
              {t('stats.ceph_osd_up_percent', { percent: upPercent.toFixed(0) })}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('stats.ceph_osd_up_hint')}</p>
          </div>
        </div>

        <div className="min-h-0 flex-1" aria-hidden="true" />

        <div className="grid shrink-0 grid-cols-2 gap-2">
          <div className="flex flex-col justify-center rounded-lg border border-green-200 bg-green-50 p-2 dark:border-green-800 dark:bg-green-900/20">
            <div className="mb-0.5 flex items-center justify-between">
              <CheckCircle size={18} weight="fill" className="text-green-600 dark:text-green-400" />
              <span className="text-xs font-semibold text-green-700 dark:text-green-300">UP</span>
            </div>
            <div className="text-lg font-bold text-green-700 dark:text-green-300">{osd.up}</div>
          </div>

          <div className="flex flex-col justify-center rounded-lg border border-blue-200 bg-blue-50 p-2 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="mb-0.5 flex items-center justify-between">
              <CheckCircle size={18} weight="fill" className="text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">IN</span>
            </div>
            <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{osd.in_count}</div>
          </div>

          <div className="flex flex-col justify-center rounded-lg border border-red-200 bg-red-50 p-2 dark:border-red-800 dark:bg-red-900/20">
            <div className="mb-0.5 flex items-center justify-between">
              <XCircle size={18} weight="fill" className="text-red-600 dark:text-red-400" />
              <span className="text-xs font-semibold text-red-700 dark:text-red-300">DOWN</span>
            </div>
            <div className="text-lg font-bold text-red-700 dark:text-red-300">{osd.down}</div>
          </div>

          <div className="flex flex-col justify-center rounded-lg border border-orange-200 bg-orange-50 p-2 dark:border-orange-800 dark:bg-orange-900/20">
            <div className="mb-0.5 flex items-center justify-between">
              <XCircle size={18} weight="fill" className="text-orange-600 dark:text-orange-400" />
              <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">OUT</span>
            </div>
            <div className="text-lg font-bold text-orange-700 dark:text-orange-300">{osd.out}</div>
          </div>
        </div>

        <div className="min-h-0 flex-1" aria-hidden="true" />

        <div className="shrink-0 border-t border-gray-300/30 pt-3 dark:border-white/10">
          <div className="space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
            <div>• <strong>Up:</strong> {t('stats.ceph_osd_legend_up')}</div>
            <div>• <strong>In:</strong> {t('stats.ceph_osd_legend_in')}</div>
            <div>• <strong>Down:</strong> {t('stats.ceph_osd_legend_down')}</div>
            <div>• <strong>Out:</strong> {t('stats.ceph_osd_legend_out')}</div>
          </div>
        </div>
      </div>
    </StatCard>
  );
}

export default CephOSDCard;
