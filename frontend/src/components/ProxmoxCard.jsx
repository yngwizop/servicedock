import React from 'react';
import { Play, Stop, ArrowsClockwise, Desktop, HardDrives } from 'phosphor-react';

function ProxmoxCard({ resource, onStart, onStop, onReboot, isAdmin }) {
  const isRunning = resource.status === 'running';
  
  // Berechne Prozentsätze für CPU, RAM, Disk
  const cpuPercent = (resource.cpu * 100).toFixed(1);
  const memPercent = resource.maxmem > 0 ? ((resource.mem / resource.maxmem) * 100).toFixed(1) : 0;
  const diskPercent = resource.maxdisk > 0 ? ((resource.disk / resource.maxdisk) * 100).toFixed(1) : 0;
  
  // Formatiere Bytes zu GB
  const formatBytes = (bytes) => {
    if (!bytes) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };
  
  // Formatiere Uptime
  const formatUptime = (seconds) => {
    if (!seconds) return 'Offline';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };
  
  // Status-Farben
  const getStatusColor = () => {
    switch (resource.status) {
      case 'running':
        return 'bg-green-500';
      case 'stopped':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  const getStatusTextColor = () => {
    switch (resource.status) {
      case 'running':
        return 'text-green-600 dark:text-green-400';
      case 'stopped':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="group relative bg-white/80 dark:bg-gray-900/85 backdrop-blur-md rounded-3xl border border-gray-400/60 dark:border-white/20 shadow-xl hover:shadow-2xl transition-all duration-200 p-6 flex flex-col gap-2 will-change-auto hover:border-blue-500/70 dark:hover:border-blue-500/60 hover:scale-[1.025]">
      {/* Header - Modern, mehr Luft, Status-Badge */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* VM/LXC Icon */}
          <div className={`p-2 rounded-2xl shadow-sm ${resource.type === 'qemu' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}>
            {resource.type === 'qemu' ? (
              <Desktop size={22} className="text-blue-600 dark:text-blue-400" weight="duotone" />
            ) : (
              <HardDrives size={22} className="text-purple-600 dark:text-purple-400" weight="duotone" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-base text-gray-950 dark:text-white truncate">
              {resource.name}
            </h3>
            <p className="text-xs text-gray-700 dark:text-gray-400 font-light">
              {resource.type === 'qemu' ? 'VM' : 'CT'} #{resource.vmid}
            </p>
          </div>
        </div>
        {/* Status-Badge */}
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold capitalize shadow-sm ${isRunning ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
          <span className={`w-2 h-2 rounded-full ${getStatusColor()} mr-1`}></span>
          {resource.status}
        </span>
      </div>
      
      {/* Abstand nach Header */}
      <div className="mb-2"></div>
      
      {/* Ressourcen-Container mit fester Mindesthöhe */}
      <div className="min-h-[180px] flex flex-col justify-between mb-4">
        {/* Ressourcen-Informationen - Modern, mehr Luft, weichere Bars */}
        {isRunning ? (
          <div className="space-y-3">
            {/* CPU */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-700 dark:text-gray-400 font-medium">CPU</span>
                <span className="font-bold text-gray-950 dark:text-white">{cpuPercent}%</span>
              </div>
              <div className="w-full bg-gray-200/70 dark:bg-gray-700/70 rounded-full h-2 overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-slate-500 to-slate-700 h-2 rounded-full transition-all duration-500 shadow-md"
                  style={{ width: `${Math.min(cpuPercent, 100)}%` }}
                ></div>
              </div>
            </div>
            
            {/* RAM */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-700 dark:text-gray-400 font-medium">RAM</span>
                <span className="font-bold text-gray-950 dark:text-white">{memPercent}%</span>
              </div>
              <div className="w-full bg-gray-200/70 dark:bg-gray-700/70 rounded-full h-2 overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-emerald-600 to-emerald-800 h-2 rounded-full transition-all duration-500 shadow-md"
                  style={{ width: `${Math.min(memPercent, 100)}%` }}
                ></div>
              </div>
            </div>
            
            {/* Disk */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-700 dark:text-gray-400 font-medium">Disk</span>
                <span className="font-bold text-gray-950 dark:text-white">{diskPercent}%</span>
              </div>
              <div className="w-full bg-gray-200/70 dark:bg-gray-700/70 rounded-full h-2 overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-amber-600 to-amber-800 h-2 rounded-full transition-all duration-500 shadow-md"
                  style={{ width: `${Math.min(diskPercent, 100)}%` }}
                ></div>
              </div>
            </div>
            
            {/* Uptime - Kompakter */}
            <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-300/50 dark:border-gray-700/50">
              <span className="text-gray-700 dark:text-gray-400 font-medium flex items-center gap-1">
                <svg xmlns='http://www.w3.org/2000/svg' className='inline w-4 h-4 text-blue-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' /></svg>
                Uptime
              </span>
              <span className="font-bold text-gray-950 dark:text-white bg-gray-200/80 dark:bg-gray-800/80 px-2 py-0.5 rounded-full shadow-sm">
                {formatUptime(resource.uptime)}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3 flex flex-col justify-center h-full">
            {/* Infozeile mit last run und Uptime */}
            <div className="text-center text-xs text-gray-700 dark:text-gray-300 pt-2">
              <span className="block font-semibold">Zuletzt gestartet:</span>
              {resource.lastRun ? (
                <span className="block font-mono text-gray-900 dark:text-gray-200 mt-0.5">{resource.lastRun}</span>
              ) : (
                <span className="block font-mono text-gray-400 dark:text-gray-500 italic mt-0.5">kein Zeitstempel verfügbar</span>
              )}
              <span className="block mt-2">Laufzeit: <span className="font-semibold">{formatUptime(resource.uptime)}</span></span>
            </div>
            {/* Warnhinweis */}
            <div className="text-center text-xs text-orange-600 dark:text-orange-400 bg-orange-100/60 dark:bg-orange-900/30 rounded px-2 py-1.5">
              VM ist offline
            </div>
          </div>
        )}
      </div>
      
      {/* Control Buttons */}
      {isAdmin && (
        <div className="flex gap-2">
          {isRunning ? (
            <>
              <button
                onClick={() => onStop(resource.vmid, resource.type)}
                className="flex-1 border border-rose-700 text-rose-700 dark:text-rose-400 bg-transparent hover:bg-rose-50 dark:hover:bg-rose-900/20 py-1.5 px-2 rounded-full transition-all flex items-center justify-center gap-1 text-xs font-semibold shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-rose-400 group"
                title="Stoppen"
              >
                <Stop size={16} weight="fill" className="group-hover:scale-110 transition-transform" />
                <span className="hidden xs:inline">Stop</span>
              </button>
              <button
                onClick={() => onReboot(resource.vmid, resource.type)}
                className="flex-1 border border-amber-700 text-amber-700 dark:text-amber-400 bg-transparent hover:bg-amber-50 dark:hover:bg-amber-900/20 py-1.5 px-2 rounded-full transition-all flex items-center justify-center gap-1 text-xs font-semibold shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400 group"
                title="Neustarten"
              >
                <ArrowsClockwise size={16} weight="bold" className="group-hover:rotate-180 transition-transform duration-500" />
                <span className="hidden xs:inline">Reboot</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => onStart(resource.vmid, resource.type)}
              className="w-full border border-emerald-700 text-emerald-700 dark:text-emerald-400 bg-transparent hover:bg-emerald-50 dark:hover:bg-emerald-900/20 py-1.5 px-2 rounded-full transition-all flex items-center justify-center gap-1.5 text-xs font-semibold shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-400 group"
              title="VM/Container starten"
            >
              <Play size={16} weight="fill" className="group-hover:scale-110 transition-transform" />
              <span className="hidden xs:inline">Start</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ProxmoxCard;