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
    <div className="group bg-gradient-to-br from-white/95 to-gray-50/95 dark:from-gray-800/95 dark:to-gray-900/95 backdrop-blur-md rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 p-4 border border-gray-200/50 dark:border-gray-700/50 hover:scale-[1.02] hover:border-blue-400/50 dark:hover:border-blue-500/50">
      {/* Header - Kompakter */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* VM/LXC Icon - Kleiner */}
          <div className={`p-2 rounded-xl ${resource.type === 'qemu' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}>
            {resource.type === 'qemu' ? (
              <Desktop size={20} className="text-blue-600 dark:text-blue-400" weight="duotone" />
            ) : (
              <HardDrives size={20} className="text-purple-600 dark:text-purple-400" weight="duotone" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-gray-800 dark:text-white truncate">
              {resource.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {resource.type === 'qemu' ? 'VM' : 'CT'} #{resource.vmid}
            </p>
          </div>
        </div>
        
        {/* Status-Indikator - Kompakter */}
        <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor()} ${isRunning ? 'animate-pulse' : ''}`}></div>
      </div>
      
      {/* Status Badge */}
      <div className="mb-3">
        <span className={`inline-block px-2 py-1 rounded-lg text-xs font-semibold capitalize ${
          isRunning 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
        }`}>
          {resource.status}
        </span>
      </div>
      
      {/* Ressourcen-Informationen - Kompakter */}
      {isRunning && (
        <div className="space-y-2 mb-3">
          {/* CPU */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600 dark:text-gray-400 font-medium">CPU</span>
              <span className="font-bold text-gray-800 dark:text-white">{cpuPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(cpuPercent, 100)}%` }}
              ></div>
            </div>
          </div>
          
          {/* RAM */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600 dark:text-gray-400 font-medium">RAM</span>
              <span className="font-bold text-gray-800 dark:text-white">{memPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(memPercent, 100)}%` }}
              ></div>
            </div>
          </div>
          
          {/* Disk */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Disk</span>
              <span className="font-bold text-gray-800 dark:text-white">{diskPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-500 to-purple-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(diskPercent, 100)}%` }}
              ></div>
            </div>
          </div>
          
          {/* Uptime - Kompakter */}
          <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Uptime</span>
            <span className="font-bold text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
              {formatUptime(resource.uptime)}
            </span>
          </div>
        </div>
      )}
      
      {/* Control Buttons - Kompakter mit Icons */}
      {isAdmin && (
        <div className="flex gap-1.5 mt-3">
          {!isRunning ? (
            <button
              onClick={() => onStart(resource.vmid, resource.type)}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 text-xs font-semibold shadow-md hover:shadow-lg"
              title="Start"
            >
              <Play size={14} weight="fill" />
              <span>Start</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => onStop(resource.vmid, resource.type)}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-2 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 text-xs font-semibold shadow-md hover:shadow-lg"
                title="Stop"
              >
                <Stop size={14} weight="fill" />
                <span className="hidden sm:inline">Stop</span>
              </button>
              <button
                onClick={() => onReboot(resource.vmid, resource.type)}
                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-2 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 text-xs font-semibold shadow-md hover:shadow-lg"
                title="Reboot"
              >
                <ArrowsClockwise size={14} weight="bold" />
                <span className="hidden sm:inline">Reboot</span>
              </button>
            </>
          )}
        </div>
      )}
      
      {/* Info wenn gestoppt - Kompakter */}
      {!isRunning && (
        <div className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400 italic">
          Offline
        </div>
      )}
    </div>
  );
}

export default ProxmoxCard;
