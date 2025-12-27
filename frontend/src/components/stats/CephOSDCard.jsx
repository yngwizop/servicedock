import React from 'react';
import { HardDrives, CheckCircle, XCircle } from 'phosphor-react';
import StatCard from './StatCard';

/**
 * Zeigt Ceph OSD Status im Detail an
 */
function CephOSDCard({ ceph }) {
  // Wenn Ceph nicht verfügbar ist
  if (!ceph || !ceph.available || !ceph.osd) {
    return (
      <StatCard 
        title="Ceph OSDs"
        icon={<HardDrives size={28} weight="duotone" />}
      >
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-6xl mb-3">💿</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Keine OSD-Daten verfügbar
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
      <div className="space-y-4">
        {/* Total OSDs */}
        <div className="text-center">
          <div className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-1">
            {osd.total}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Total OSDs
          </div>
        </div>

        {/* Health Percentage */}
        <div className="text-center">
          <div className={`text-2xl font-bold ${getHealthColor()}`}>
            {healthyPercent.toFixed(0)}% Healthy
          </div>
        </div>

        {/* OSD Status Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Up */}
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle size={20} weight="fill" className="text-green-600 dark:text-green-400" />
              <span className="text-xs font-semibold text-green-700 dark:text-green-300">UP</span>
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {osd.up}
            </div>
          </div>

          {/* In */}
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle size={20} weight="fill" className="text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">IN</span>
            </div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {osd.in_count}
            </div>
          </div>

          {/* Down */}
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between mb-2">
              <XCircle size={20} weight="fill" className="text-red-600 dark:text-red-400" />
              <span className="text-xs font-semibold text-red-700 dark:text-red-300">DOWN</span>
            </div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">
              {osd.down}
            </div>
          </div>

          {/* Out */}
          <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-2">
              <XCircle size={20} weight="fill" className="text-orange-600 dark:text-orange-400" />
              <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">OUT</span>
            </div>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              {osd.out}
            </div>
          </div>
        </div>

        {/* Status Info */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
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
