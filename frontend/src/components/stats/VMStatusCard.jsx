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
    if (total === 0) return { label: 'No Data', color: 'text-gray-500', bgColor: 'bg-gray-500/10' };
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
      <div className="flex flex-col">
        {/* Mini Stat - Activity Indicator */}
        <div className={`mb-3 px-2 py-1 rounded-md ${health.bgColor} flex items-center justify-between`}>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Activity</span>
          <span className={`text-xs font-bold ${health.color}`}>{health.label}</span>
        </div>

        {/* Main Stats — kein flex-1, sonst Leerraum in der Grid-Zelle */}
        <div className="space-y-3">
          {/* Running */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play size={20} weight="fill" className="text-green-500" />
              <div>
                <span className="text-base font-medium block">Running</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{runningPercent}% active</span>
              </div>
            </div>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">
              {running}
            </span>
          </div>

          {/* Stopped */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stop size={20} weight="fill" className="text-gray-400" />
              <span className="text-sm font-medium">Stopped</span>
            </div>
            <span className="text-2xl font-bold text-gray-500 dark:text-gray-400">
              {stopped}
            </span>
          </div>
        </div>

        {/* Total - am Ende */}
        <div className="border-t border-gray-300/30 dark:border-white/10 pt-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-base font-medium">Total</span>
            <span className="text-xl font-bold text-gray-800 dark:text-white">
              {total}
            </span>
          </div>
        </div>
      </div>
    </StatCard>
  );
}

export default VMStatusCard;
