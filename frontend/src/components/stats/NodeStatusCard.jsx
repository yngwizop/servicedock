import React from 'react';
import { HardDrives, CheckCircle, XCircle } from 'phosphor-react';
import StatCard from './StatCard';

/**
 * Zeigt Node-Status an (Online/Offline/Total)
 */
function NodeStatusCard({ stats }) {
  const { online, offline, total } = stats;

  return (
    <StatCard 
      title="Virtual Environment Nodes" 
      icon={<HardDrives size={28} weight="duotone" />}
      compact
    >
      <div className="space-y-3">
        {/* Online Nodes */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle size={20} weight="fill" className="text-green-500" />
            <span className="text-sm font-medium">Online</span>
          </div>
          <span className="text-2xl font-bold text-green-600 dark:text-green-400">
            {online}
          </span>
        </div>

        {/* Offline Nodes */}
        {offline > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle size={20} weight="fill" className="text-red-500" />
              <span className="text-sm font-medium">Offline</span>
            </div>
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">
              {offline}
            </span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total</span>
            <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {total}
            </span>
          </div>
        </div>
      </div>
    </StatCard>
  );
}

export default NodeStatusCard;
