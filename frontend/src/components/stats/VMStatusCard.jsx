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
  const runningColor = type === "vm" 
    ? "text-blue-600 dark:text-blue-400"
    : "text-purple-600 dark:text-purple-400";

  return (
    <StatCard 
      title={title} 
      icon={<DefaultIcon size={28} weight="duotone" />}
      compact
    >
      <div className="space-y-3">
        {/* Running */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play size={20} weight="fill" className="text-green-500" />
            <span className="text-sm font-medium">Running</span>
          </div>
          <span className={`text-2xl font-bold ${runningColor}`}>
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

export default VMStatusCard;
