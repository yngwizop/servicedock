import React from 'react';
import { Database, HardDrives, CloudArrowUp, Archive } from 'phosphor-react';
import StatCard from './StatCard';

/**
 * Zeigt Storage nach Type an (local, lvm, nfs, ceph, zfs)
 */
function StorageByTypeCard({ storageByType }) {
  // Formatiere Bytes zu TB/GB
  const formatBytes = (bytes) => {
    if (!bytes) return '0 GB';
    const tb = bytes / (1024 * 1024 * 1024 * 1024);
    if (tb >= 1) return `${tb.toFixed(2)} TB`;
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  // Icon basierend auf Storage-Type
  const getTypeIcon = (type) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('local')) return '💾';
    if (lowerType.includes('lvm')) return '📀';
    if (lowerType.includes('nfs')) return '🌐';
    if (lowerType.includes('ceph')) return '🔷';
    if (lowerType.includes('zfs')) return '🗄️';
    return '💿';
  };

  // Farbe basierend auf Type
  const getTypeColor = (type) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('local')) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
    if (lowerType.includes('lvm')) return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
    if (lowerType.includes('nfs')) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    if (lowerType.includes('ceph')) return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300';
    if (lowerType.includes('zfs')) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
    return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
  };

  // Progress Bar Farbe
  const getProgressColor = (percent) => {
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
      title="Storage by Type"
      icon={<Database size={28} weight="duotone" />}
    >
      {storageByType && storageByType.length > 0 ? (
        <div className="space-y-2">
            {storageByType.map((typeData) => {
              const percent = typeData.percent || 0;
              
              return (
                <div 
                  key={typeData.type}
                  className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  {/* Type Header */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{getTypeIcon(typeData.type)}</span>
                      <div>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {typeData.type.toUpperCase()}
                        </span>
                        <span className="ml-1.5 text-xs text-slate-500 dark:text-slate-400">
                          ({typeData.count} Storage{typeData.count !== 1 ? 's' : ''})
                        </span>
                      </div>
                    </div>
                    <div className={`text-sm font-bold ${getTextColor(percent)}`}>
                      {percent.toFixed(1)}%
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-1.5">
                    <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(percent)}`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">
                      {formatBytes(typeData.used)} used
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {formatBytes(typeData.total)} total
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          Keine Storage-Type-Daten verfügbar
        </div>
      )}
    </StatCard>
  );
}

export default StorageByTypeCard;
