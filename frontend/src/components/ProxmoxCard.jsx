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
    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all p-5">
      {/* Header mit Icon, Name und Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* VM/LXC Icon */}
          <div className="text-3xl">
            {resource.type === 'qemu' ? (
              <Desktop size={32} className="text-blue-600 dark:text-blue-400" />
            ) : (
              <HardDrives size={32} className="text-purple-600 dark:text-purple-400" />
            )}
          </div>
          
          <div>
            <h3 className="font-bold text-lg text-gray-800 dark:text-white">
              {resource.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {resource.type === 'qemu' ? 'VM' : 'LXC'} • ID {resource.vmid} • {resource.node}
            </p>
          </div>
        </div>
        
        {/* Status-Indikator */}
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`}></div>
          <span className={`text-sm font-semibold capitalize ${getStatusTextColor()}`}>
            {resource.status}
          </span>
        </div>
      </div>
      
      {/* Ressourcen-Informationen */}
      {isRunning && (
        <div className="space-y-3 mb-4">
          {/* CPU */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">CPU</span>
              <span className="font-semibold text-gray-800 dark:text-white">{cpuPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(cpuPercent, 100)}%` }}
              ></div>
            </div>
          </div>
          
          {/* RAM */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">RAM</span>
              <span className="font-semibold text-gray-800 dark:text-white">
                {formatBytes(resource.mem)} / {formatBytes(resource.maxmem)}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(memPercent, 100)}%` }}
              ></div>
            </div>
          </div>
          
          {/* Disk */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">Disk</span>
              <span className="font-semibold text-gray-800 dark:text-white">
                {formatBytes(resource.disk)} / {formatBytes(resource.maxdisk)}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(diskPercent, 100)}%` }}
              ></div>
            </div>
          </div>
          
          {/* Uptime */}
          <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">Uptime</span>
            <span className="font-semibold text-gray-800 dark:text-white">
              {formatUptime(resource.uptime)}
            </span>
          </div>
        </div>
      )}
      
      {/* Control Buttons (nur für Admin) */}
      {isAdmin && (
        <div className="flex gap-2 mt-4">
          {!isRunning ? (
            <button
              onClick={() => onStart(resource.vmid, resource.type)}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2"
              title="Start"
            >
              <Play size={18} weight="fill" />
              <span>Start</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => onStop(resource.vmid, resource.type)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                title="Stop"
              >
                <Stop size={18} weight="fill" />
                <span>Stop</span>
              </button>
              <button
                onClick={() => onReboot(resource.vmid, resource.type)}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                title="Reboot"
              >
                <ArrowsClockwise size={18} />
                <span>Reboot</span>
              </button>
            </>
          )}
        </div>
      )}
      
      {/* Info wenn gestoppt */}
      {!isRunning && (
        <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          VM/Container ist offline
        </div>
      )}
    </div>
  );
}

export default ProxmoxCard;
