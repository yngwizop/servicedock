import React from 'react';

/**
 * Wiederverwendbare Statistik-Card für Proxmox Status-Dashboard
 */
function StatCard({ 
  title, 
  icon, 
  children, 
  className = "", 
  compact = false,
  ...props 
}) {
  return (
    <div
      className={`
        bg-white/95 dark:bg-slate-800/95 
        backdrop-blur-md
        rounded-xl shadow-lg 
        border border-slate-200 dark:border-slate-700
        transition-all duration-200
        h-full flex flex-col
        ${compact ? 'p-3' : 'p-6'}
        ${className}
      `}
      {...props}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        {icon && (
          <div className="flex-shrink-0 text-blue-600 dark:text-blue-400">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex-1">
          {title}
        </h3>
      </div>

      {/* Content - nimmt verfügbaren Raum */}
      <div className="text-slate-700 dark:text-slate-300 flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}

export default StatCard;
