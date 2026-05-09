import React from 'react';
import { useTranslation } from 'react-i18next';
import { HardDrives, Monitor } from 'phosphor-react';
import StatCard from './StatCard';

/**
 * Zeigt Storage pro Node an
 */
function StorageByNodeCard({ storageByNode }) {
  const { t } = useTranslation();
  // Formatiere Bytes zu TB/GB
  const formatBytes = (bytes) => {
    if (!bytes) return '0 GB';
    const tb = bytes / (1024 * 1024 * 1024 * 1024);
    if (tb >= 1) return `${tb.toFixed(2)} TB`;
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  // Farbe basierend auf Auslastung
  const getColor = (percent) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 75) return 'bg-orange-500';
    if (percent >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTextColor = (percent) => {
    if (percent >= 90) return 'text-red-600 dark:text-red-400';
    if (percent >= 75) return 'text-orange-600 dark:text-orange-400';
    if (percent >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  return (
    <StatCard
      title="Storage per Node"
      icon={<HardDrives size={28} weight="duotone" />}
      bodyScrollable={false}
    >
      {storageByNode && storageByNode.length > 0 ? (
        <div className="space-y-2 min-h-0 min-w-0">
            {storageByNode.map((node) => {
              const percent = node.percent || 0;
              
              return (
                <div 
                  key={node.node}
                  className="p-2.5 rounded-lg bg-white/5 dark:bg-white/[0.03] sd-night-faint-flat hover:bg-white/10 dark:hover:bg-white/5 night:hover:bg-sd-night-700/90 transition-colors min-w-0"
                >
                  {/* Node Header */}
                <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Monitor size={22} weight="duotone" className="shrink-0 text-gray-600 dark:text-gray-400" />
                    <span className="truncate text-base font-semibold text-gray-800 dark:text-white">
                      {node.node}
                    </span>
                  </div>
                  <div className={`shrink-0 text-base font-bold tabular-nums ${getTextColor(percent)}`}>
                    {percent.toFixed(1)}%
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-1">
                    <div className="w-full bg-gray-300/30 dark:bg-white/10 night:bg-sd-night-950/70 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getColor(percent)}`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid min-w-0 grid-cols-2 gap-x-2 text-xs text-gray-600 dark:text-gray-400">
                    <span className="truncate whitespace-nowrap">{formatBytes(node.used)} used</span>
                    <span className="truncate whitespace-nowrap text-right">{formatBytes(node.total)} total</span>
                  </div>

                  {/* Storage Details — ein Zeile Tags + horizontal scrollen statt Wrap (verhindert Höhen-Sprung) */}
                  {node.storages && node.storages.length > 0 && (
                  <div className="mt-1 min-w-0 border-t border-gray-300/30 pt-1.5 dark:border-white/10">
                    <div className="mb-1.5 text-xs text-gray-600 dark:text-gray-400">
                        {node.storages.length} Storage{node.storages.length !== 1 ? 's' : ''}
                      </div>
                      <div className="-mx-0.5 flex min-h-[1.75rem] flex-nowrap gap-1 overflow-x-auto overflow-y-hidden px-0.5 pb-0.5 [scrollbar-width:thin]">
                        {node.storages.map((storage) => (
                          <span
                            key={storage.storage}
                            className="inline-flex shrink-0 items-center whitespace-nowrap rounded px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            title={`${storage.storage} (${storage.type})`}
                          >
                            {storage.storage}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {t('stats.no_node_storage')}
        </div>
      )}
    </StatCard>
  );
}

export default StorageByNodeCard;
