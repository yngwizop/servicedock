import React from 'react';
import { HardDrives } from 'phosphor-react';
import StatCard from './StatCard';

/**
 * Zeigt Storage pro Node an
 */
function StorageByNodeCard({ storageByNode }) {
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
    >
      {storageByNode && storageByNode.length > 0 ? (
        <div className="space-y-2">
            {storageByNode.map((node, index) => {
              const percent = node.percent || 0;
              
              return (
                <div 
                  key={node.node}
                  className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  {/* Node Header */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🖥️</span>
                    <span className="text-base font-semibold text-slate-800 dark:text-slate-100">
                      {node.node}
                    </span>
                  </div>
                  <div className={`text-base font-bold ${getTextColor(percent)}`}>
                    {percent.toFixed(1)}%
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-1">
                    <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getColor(percent)}`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>{formatBytes(node.used)} used</span>
                    <span>{formatBytes(node.total)} total</span>
                  </div>

                  {/* Storage Details (collapsible) */}
                  {node.storages && node.storages.length > 0 && (
                  <div className="mt-1 pt-1.5 border-t border-slate-200 dark:border-slate-600">
                    <div className="text-xs text-slate-600 dark:text-slate-400 mb-1.5">
                        {node.storages.length} Storage{node.storages.length !== 1 ? 's' : ''}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {node.storages.map((storage) => (
                          <span
                            key={storage.storage}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
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
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          Keine Node-Storage-Daten verfügbar
        </div>
      )}
    </StatCard>
  );
}

export default StorageByNodeCard;
