import React from 'react';
import { useTranslation } from 'react-i18next';
import { Cpu, Database } from 'phosphor-react';
import StatCard from './StatCard';
import { TopListResourceIcon } from './StatusDashboardIcons';

/**
 * Zeigt Top CPU oder Memory Usage an
 */
function TopUsageCard({ title, items, usageType = "cpu" }) {
  const { t } = useTranslation();
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
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 dark:hover:bg-white/5 night:hover:bg-sd-night-950/55 transition-colors"
              >
                {/* Rank */}
                <div className="flex-shrink-0 w-6 text-center">
                  <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                    {index + 1}
                  </span>
                </div>

                {/* Type Icon */}
                <div className="flex-shrink-0 flex items-center justify-center w-7">
                  <TopListResourceIcon type={item.type} />
                </div>

                {/* Name & Node */}
                <div className="flex-1 min-w-0 mr-2">
                  <div className="text-base font-medium text-gray-800 dark:text-white truncate">
                    {item.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {item.type === 'node' ? 'Node' : `${item.type.toUpperCase()} • ${item.node}`}
                  </div>
                </div>

                {/* Usage */}
                <div className="flex-shrink-0 text-right ml-2">
                  <div className={`text-lg font-bold ${getColor(percent)}`}>
                    {percent.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
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
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {t('stats.no_data')}
        </div>
      )}
    </StatCard>
  );
}

export default TopUsageCard;
