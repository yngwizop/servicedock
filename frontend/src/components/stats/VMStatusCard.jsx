import React from 'react';
import { Desktop, Play, Stop } from 'phosphor-react';
import StatCard from './StatCard';

/**
 * Zeigt VM oder LXC Status an (Running/Stopped/Total)
 */
function VMStatusCard({ title, icon, stats, type = "vm" }) {
  const { running, stopped, total } = stats;

  // Icon und Farben basierend auf Typ
  const DefaultIcon = icon || Desktop;
  const runningPercent = total > 0 ? Math.round((running / total) * 100) : 0;
  
  // Health Status berechnen
  const getHealthStatus = () => {
    if (total === 0) return { label: 'No Data', color: 'text-slate-500', bgColor: 'bg-slate-500/10' };
    if (runningPercent >= 90) return { label: 'Excellent', color: 'text-green-500', bgColor: 'bg-green-500/10' };
    if (runningPercent >= 70) return { label: 'Good', color: 'text-green-500', bgColor: 'bg-green-500/10' };
    if (runningPercent >= 40) return { label: 'Fair', color: 'text-orange-500', bgColor: 'bg-orange-500/10' };
    return { label: 'Low', color: 'text-red-500', bgColor: 'bg-red-500/10' };
  };
  
  const health = getHealthStatus();

  return (
    <StatCard 
      title={title} 
      icon={<DefaultIcon size={28} weight="duotone" />}
      compact
    >
      <div className="flex flex-col h-full">
        {/* Mini Stat - Activity Indicator */}
        <div className={`mb-3 px-2 py-1 rounded-md ${health.bgColor} flex items-center justify-between`}>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Activity</span>
          <span className={`text-xs font-bold ${health.color}`}>{health.label}</span>
        </div>

        {/* Main Stats */}
        <div className="space-y-3 flex-1">
          {/* Running */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play size={20} weight="fill" className="text-green-500" />
              <div>
                <span className="text-sm font-medium block">Running</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{runningPercent}% active</span>
              </div>
            </div>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">
              {running}
            </span>
          </div>

          {/* Stopped */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stop size={20} weight="fill" className="text-slate-400" />
              <span className="text-sm font-medium">Stopped</span>
            </div>
            <span className="text-2xl font-bold text-slate-500 dark:text-slate-400">
              {stopped}
            </span>
          </div>
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

export default VMStatusCard;
