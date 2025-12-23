import React from 'react';
import { Cpu, Database } from 'phosphor-react';
import StatCard from './StatCard';

/**
 * Zeigt Top CPU oder Memory Usage an
 */
function TopUsageCard({ title, items, usageType = "cpu" }) {
  const isCPU = usageType === "cpu";
  const Icon = isCPU ? Cpu : Database;

  // Formatiere Bytes zu GB
  const formatBytes = (bytes) => {
    if (!bytes) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  };

  // Farbe basierend auf Auslastung
  const getColor = (percent) => {
    if (percent >= 80) return 'text-red-600 dark:text-red-400';
    if (percent >= 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  };

  // Icon basierend auf Typ
  const getTypeIcon = (type) => {
    switch (type) {
      case 'node':
        return '🖥️';
      case 'qemu':
        return '💻';
      case 'lxc':
        return '📦';
      default:
        return '❓';
    }
  };

  return (
    <StatCard 
      title={title}
      icon={<Icon size={28} weight="duotone" />}
      className="col-span-full lg:col-span-2"
    >
      {items && items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item, index) => {
            const percent = isCPU ? item.cpu_percent : item.memory_percent;
            
            return (
              <div 
                key={`${item.type}-${item.vmid || item.node}-${index}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {/* Rank */}
                <div className="flex-shrink-0 w-6 text-center">
                  <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                    {index + 1}
                  </span>
                </div>

                {/* Type Icon */}
                <div className="flex-shrink-0 text-lg">
                  {getTypeIcon(item.type)}
                </div>

                {/* Name & Node */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                    {item.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {item.type === 'node' ? 'Node' : `${item.type.toUpperCase()} • ${item.node}`}
                  </div>
                </div>

                {/* Usage */}
                <div className="flex-shrink-0 text-right">
                  <div className={`text-lg font-bold ${getColor(percent)}`}>
                    {percent.toFixed(1)}%
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {isCPU 
                      ? `${item.cpu_used?.toFixed(1) || '0'} / ${item.cpu_cores || 'N/A'} Cores`
                      : `${formatBytes(item.memory_used)} / ${formatBytes(item.memory_total)}`
                    }
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          Keine Daten verfügbar
        </div>
      )}
    </StatCard>
  );
}

export default TopUsageCard;
