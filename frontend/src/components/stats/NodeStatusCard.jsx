import React from 'react';
import { HardDrives, CheckCircle, XCircle } from 'phosphor-react';
import StatCard from './StatCard';

/**
 * Zeigt Node-Status an (Online/Offline/Total)
 */
function NodeStatusCard({ stats }) {
  const { online, offline, total } = stats;
  const onlinePercent = total > 0 ? Math.round((online / total) * 100) : 0;
  
  // Health Status berechnen
  const getHealthStatus = () => {
    if (onlinePercent === 100) return { label: 'Excellent', color: 'text-green-500', bgColor: 'bg-green-500/10' };
    if (onlinePercent >= 80) return { label: 'Good', color: 'text-green-500', bgColor: 'bg-green-500/10' };
    if (onlinePercent >= 50) return { label: 'Warning', color: 'text-orange-500', bgColor: 'bg-orange-500/10' };
    return { label: 'Critical', color: 'text-red-500', bgColor: 'bg-red-500/10' };
  };
  
  const health = getHealthStatus();

  return (
    <StatCard 
      title="Virtual Environment Nodes" 
      icon={<HardDrives size={28} weight="duotone" />}
      compact
    >
      <div className="flex flex-col h-full">
        {/* Mini Stat - Health Indicator */}
        <div className={`mb-3 px-2 py-1 rounded-md ${health.bgColor} flex items-center justify-between`}>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Health</span>
          <span className={`text-xs font-bold ${health.color}`}>{health.label}</span>
        </div>

        {/* Main Stats */}
        <div className="space-y-3 flex-1">
          {/* Online Nodes */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={20} weight="fill" className="text-green-500" />
              <div>
                <span className="text-sm font-medium block">Online</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{onlinePercent}% available</span>
              </div>
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
        </div>

        {/* Total - am Ende */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
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
