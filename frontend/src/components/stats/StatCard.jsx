import React from 'react';
import { DotsSixVertical } from 'phosphor-react';

/**
 * Wiederverwendbare Statistik-Card für Proxmox Status-Dashboard
 * Unterstützt Drag & Drop mit react-grid-layout
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
      {/* Header mit Drag Handle */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        {/* Drag Handle - muss die Klasse "drag-handle" haben */}
        <div className="drag-handle cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <DotsSixVertical size={20} weight="bold" />
        </div>
        
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
      <div className="flex-1 flex flex-col text-slate-700 dark:text-slate-300">
        {children}
      </div>
    </div>
  );
}

export default StatCard;
