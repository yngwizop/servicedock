import React from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, CheckCircle, WarningCircle, XCircle, Diamond } from 'phosphor-react';
import StatCard from './StatCard';

/**
 * Zeigt Ceph Health Status an
 */
function CephHealthCard({ ceph }) {
  const { t } = useTranslation();
  // Wenn Ceph nicht verfügbar ist
  if (!ceph || !ceph.available) {
    return (
      <StatCard 
        title={t('statusDashboard.card_ceph_health')}
        icon={<Activity size={28} weight="duotone" />}
      >
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Diamond size={72} weight="duotone" className="mb-3 text-cyan-600/35 dark:text-cyan-400/30" />
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('stats.ceph_unavailable')}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {t('stats.ceph_not_used')}
          </div>
        </div>
      </StatCard>
    );
  }

  // Status Icon & Color
  const getStatusIcon = () => {
    if (ceph.status.includes('OK')) return <CheckCircle size={32} weight="fill" className="text-green-500" />;
    if (ceph.status.includes('WARN')) return <WarningCircle size={32} weight="fill" className="text-orange-500" />;
    if (ceph.status.includes('ERR')) return <XCircle size={32} weight="fill" className="text-red-500" />;
    return <Activity size={32} weight="duotone" className="text-gray-500" />;
  };

  const getStatusColor = () => {
    if (ceph.status.includes('OK')) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    if (ceph.status.includes('WARN')) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
    if (ceph.status.includes('ERR')) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
    return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
  };

  const getStatusBadge = () => {
    if (ceph.status.includes('OK')) return 'HEALTH_OK';
    if (ceph.status.includes('WARN')) return 'HEALTH_WARN';
    if (ceph.status.includes('ERR')) return 'HEALTH_ERR';
    return 'Unknown';
  };

  return (
    <StatCard 
      title={t('statusDashboard.card_ceph_health')}
      icon={<Activity size={28} weight="duotone" />}
    >
      <div className="flex flex-col h-full">
        {/* Statusbereich - zentriert */}
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="mb-3">
            {getStatusIcon()}
          </div>
          <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusColor()}`}>
            {getStatusBadge()}
          </div>
          {ceph.status_message && (
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 max-w-xs text-center">
              {ceph.status_message}
            </div>
          )}
        </div>
        {/* OSD Info (falls vorhanden) */}
        {ceph.osd && (
          <div className="pt-2 border-t border-gray-300/30 dark:border-white/10">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
              OSD Overview
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="p-1.5 rounded-lg bg-white/10 dark:bg-white/5 night:!bg-sd-night-800/75 text-center">
                <div className="text-base font-bold text-green-600 dark:text-green-400">
                  {ceph.osd.up}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Up</div>
              </div>
              <div className="p-1.5 rounded-lg bg-white/10 dark:bg-white/5 night:!bg-sd-night-800/75 text-center">
                <div className="text-base font-bold text-blue-600 dark:text-blue-400">
                  {ceph.osd.in_count}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">In</div>
              </div>
              <div className="p-1.5 rounded-lg bg-white/10 dark:bg-white/5 night:!bg-sd-night-800/75 text-center">
                <div className="text-base font-bold text-red-600 dark:text-red-400">
                  {ceph.osd.down}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Down</div>
              </div>
              <div className="p-1.5 rounded-lg bg-white/10 dark:bg-white/5 night:!bg-sd-night-800/75 text-center">
                <div className="text-base font-bold text-orange-600 dark:text-orange-400">
                  {ceph.osd.out}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Out</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </StatCard>
  );
}

export default CephHealthCard;
