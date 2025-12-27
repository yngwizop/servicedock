import React from 'react';
import { Activity, CheckCircle, WarningCircle, XCircle } from 'phosphor-react';
import StatCard from './StatCard';

/**
 * Zeigt Ceph Health Status an
 */
function CephHealthCard({ ceph }) {
  // Wenn Ceph nicht verfügbar ist
  if (!ceph || !ceph.available) {
    return (
      <StatCard 
        title="Ceph Health"
        icon={<Activity size={28} weight="duotone" />}
      >
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-6xl mb-3">🔷</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Ceph nicht verfügbar
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
            Dieser Cluster nutzt kein Ceph Storage
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
    return <Activity size={32} weight="duotone" className="text-slate-500" />;
  };

  const getStatusColor = () => {
    if (ceph.status.includes('OK')) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    if (ceph.status.includes('WARN')) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
    if (ceph.status.includes('ERR')) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
    return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
  };

  const getStatusBadge = () => {
    if (ceph.status.includes('OK')) return 'Healthy';
    if (ceph.status.includes('WARN')) return 'Warning';
    if (ceph.status.includes('ERR')) return 'Error';
    return 'Unknown';
  };

  return (
    <StatCard 
      title="Ceph Health"
      icon={<Activity size={28} weight="duotone" />}
    >
      <div className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="mb-3">
              {getStatusIcon()}
            </div>
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor()}`}>
              {getStatusBadge()}
            </div>
            {ceph.status_message && (
              <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 max-w-xs">
                {ceph.status_message}
              </div>
            )}
          </div>
        </div>

        {/* OSD Info (falls vorhanden) */}
        {ceph.osd && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
              OSD Overview
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-center">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {ceph.osd.up}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Up</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-center">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {ceph.osd.in_count}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">In</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-center">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  {ceph.osd.down}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Down</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-center">
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {ceph.osd.out}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Out</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </StatCard>
  );
}

export default CephHealthCard;
