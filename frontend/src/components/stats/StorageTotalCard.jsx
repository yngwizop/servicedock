import React from 'react';
import { HardDrives, Database } from 'phosphor-react';
import StatCard from './StatCard';

/**
 * Zeigt Total Storage Overview an
 */
function StorageTotalCard({ storageTotal }) {
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

  if (!storageTotal) {
    return (
      <StatCard 
        title="Total Storage"
        icon={<Database size={28} weight="duotone" />}
      >
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Keine Storage-Daten verfügbar
        </div>
      </StatCard>
    );
  }

  const percent = storageTotal.percent || 0;

  return (
    <StatCard 
      title="Total Storage"
      icon={<Database size={28} weight="duotone" />}
      compact={true}
    >
      <div className="flex flex-col justify-center h-full space-y-3">
        {/* Percentage Circle */}
        <div className="flex items-center justify-center">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background Circle */}
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-300/50 dark:text-white/10"
              />
              {/* Progress Circle */}
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                className={getColor(percent)}
                style={{
                  strokeDasharray: `${2 * Math.PI * 56}`,
                  strokeDashoffset: `${2 * Math.PI * 56 * (1 - percent / 100)}`
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getTextColor(percent)}`}>
                  {percent.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Used
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-white/10 dark:bg-white/5">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Used</div>
            <div className="text-sm font-semibold text-gray-800 dark:text-white">
              {formatBytes(storageTotal.used)}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-white/10 dark:bg-white/5">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total</div>
            <div className="text-sm font-semibold text-gray-800 dark:text-white">
              {formatBytes(storageTotal.total)}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-white/10 dark:bg-white/5">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Free</div>
            <div className="text-sm font-semibold text-gray-800 dark:text-white">
              {formatBytes(storageTotal.available)}
            </div>
          </div>
        </div>
      </div>
    </StatCard>
  );
}

export default StorageTotalCard;
