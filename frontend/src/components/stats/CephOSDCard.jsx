import React from 'react';
import { useTranslation } from 'react-i18next';
import { HardDrives, CheckCircle, XCircle, Disc } from 'phosphor-react';
import StatCard from './StatCard';

/**
 * Zeigt Ceph OSD Status im Detail an
 */
function CephOSDCard({ ceph }) {
  const { t } = useTranslation();
  // Wenn Ceph nicht verfügbar ist
  if (!ceph || !ceph.available || !ceph.osd) {
    return (
      <StatCard 
        title="Ceph OSDs"
        icon={<HardDrives size={28} weight="duotone" />}
      >
        <div className="flex h-full min-h-0 flex-col items-center justify-center py-8 text-center">
          <Disc size={72} weight="duotone" className="mb-3 text-gray-500/50 dark:text-gray-400/35" />
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('stats.no_osd')}
          </div>
        </div>
      </StatCard>
    );
  }

  const osd = ceph.osd;
  const healthyPercent = osd.total > 0 ? (osd.up / osd.total * 100) : 0;

  // Farbe basierend auf Health
  const getHealthColor = () => {
    if (healthyPercent === 100) return 'text-green-600 dark:text-green-400';
    if (healthyPercent >= 80) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <StatCard 
      title="Ceph OSDs"
      icon={<HardDrives size={28} weight="duotone" />}
    >
      <div className="flex h-full min-h-0 flex-col gap-2">
        <div className="shrink-0 space-y-1.5 text-center">
          <div>
            <div className="text-3xl font-bold text-gray-800 dark:text-white">
              {osd.total}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Total OSDs
            </div>
          </div>
          <div className="pb-0.5">
            <div className={`text-xl font-bold ${getHealthColor()}`}>
              {healthyPercent.toFixed(0)}% Healthy
            </div>
          </div>
        </div>

        {/* Spacer: bei extra Höhe Abstand nach oben; Raster selbst nur „auto“-Zeilen → kein Überlappen im Minimum */}
        <div className="min-h-0 flex-1" aria-hidden="true" />

        <div className="grid shrink-0 grid-cols-2 gap-2">
            <div className="flex flex-col justify-center rounded-lg border border-green-200 bg-green-50 p-2 dark:border-green-800 dark:bg-green-900/20">
              <div className="mb-0.5 flex items-center justify-between">
                <CheckCircle size={18} weight="fill" className="text-green-600 dark:text-green-400" />
                <span className="text-xs font-semibold text-green-700 dark:text-green-300">UP</span>
              </div>
              <div className="text-lg font-bold text-green-700 dark:text-green-300">
                {osd.up}
              </div>
            </div>

            <div className="flex flex-col justify-center rounded-lg border border-blue-200 bg-blue-50 p-2 dark:border-blue-800 dark:bg-blue-900/20">
              <div className="mb-0.5 flex items-center justify-between">
                <CheckCircle size={18} weight="fill" className="text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">IN</span>
              </div>
              <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                {osd.in_count}
              </div>
            </div>

            <div className="flex flex-col justify-center rounded-lg border border-red-200 bg-red-50 p-2 dark:border-red-800 dark:bg-red-900/20">
              <div className="mb-0.5 flex items-center justify-between">
                <XCircle size={18} weight="fill" className="text-red-600 dark:text-red-400" />
                <span className="text-xs font-semibold text-red-700 dark:text-red-300">DOWN</span>
              </div>
              <div className="text-lg font-bold text-red-700 dark:text-red-300">
                {osd.down}
              </div>
            </div>

            <div className="flex flex-col justify-center rounded-lg border border-orange-200 bg-orange-50 p-2 dark:border-orange-800 dark:bg-orange-900/20">
              <div className="mb-0.5 flex items-center justify-between">
                <XCircle size={18} weight="fill" className="text-orange-600 dark:text-orange-400" />
                <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">OUT</span>
              </div>
              <div className="text-lg font-bold text-orange-700 dark:text-orange-300">
                {osd.out}
              </div>
            </div>
        </div>

        <div className="min-h-0 flex-1" aria-hidden="true" />

        <div className="shrink-0 border-t border-gray-300/30 pt-3 dark:border-white/10">
          <div className="space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
            <div>• <strong>Up:</strong> OSD is running and reachable</div>
            <div>• <strong>In:</strong> OSD is part of the cluster</div>
            <div>• <strong>Down:</strong> OSD is not responding</div>
            <div>• <strong>Out:</strong> OSD is removed from data distribution</div>
          </div>
        </div>
      </div>
    </StatCard>
  );
}

export default CephOSDCard;
