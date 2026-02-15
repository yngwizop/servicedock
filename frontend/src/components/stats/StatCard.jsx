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
        bg-white/70 dark:bg-gray-900/70 
        backdrop-blur-md
        rounded-2xl shadow-xl 
        border border-gray-300/50 dark:border-white/[0.12]
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
        <div className="drag-handle cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-500 dark:hover:text-white/60 transition-colors">
          <DotsSixVertical size={20} weight="bold" />
        </div>
        
        {icon && (
          <div className="flex-shrink-0 text-blue-600 dark:text-blue-400">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex-1">
          {title}
        </h3>
      </div>

      {/* Content - nimmt verfügbaren Raum */}
      <div className="flex-1 flex flex-col text-gray-700 dark:text-gray-200">
        {children}
      </div>
    </div>
  );
}

export default StatCard;
