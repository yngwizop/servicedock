import React from 'react';

/**
 * Wiederverwendbare Statistik-Card für Proxmox Status-Dashboard
 * Unterstützt verschiedene Layouts und Dark/Light Mode
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
        bg-white dark:bg-slate-800 
        rounded-xl shadow-lg 
        border border-slate-200 dark:border-slate-700
        transition-all duration-200
        hover:shadow-xl hover:scale-[1.02]
        ${compact ? 'p-4' : 'p-6'}
        ${className}
      `}
      {...props}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {icon && (
          <div className="flex-shrink-0 text-blue-600 dark:text-blue-400">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </h3>
      </div>

      {/* Content */}
      <div className="text-slate-700 dark:text-slate-300">
        {children}
      </div>
    </div>
  );
}

export default StatCard;
