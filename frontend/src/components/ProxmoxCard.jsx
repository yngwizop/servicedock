import React from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Stop, ArrowsClockwise, Desktop, HardDrives } from 'phosphor-react';

function ProxmoxCard({ resource, onStart, onStop, onReboot, isAdmin }) {
  const { t } = useTranslation();
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

  // Akzent-Farbe basierend auf Status
  const getAccentColor = () => {
    switch (resource.status) {
      case 'running': return '#10b981';  // emerald-500
      case 'stopped': return '#ef4444';  // red-500
      default: return '#6b7280';         // gray-500
    }
  };

  return (
    <div
      className="group relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-md rounded-2xl border border-gray-300/50 dark:border-white/[0.12] shadow-xl hover:shadow-2xl transition-all duration-200 p-5 flex flex-col gap-2 will-change-auto hover:border-gray-400/70 dark:hover:border-white/20 hover:scale-[1.025]"
      style={{ borderLeftWidth: '3px', borderLeftColor: getAccentColor() }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* VM/LXC Icon */}
          <div className={`p-2 rounded-xl shadow-sm ${resource.type === 'qemu' ? 'bg-blue-100/60 dark:bg-blue-500/10' : 'bg-purple-100/60 dark:bg-purple-500/10'}`}>
            {resource.type === 'qemu' ? (
              <Desktop size={20} className="text-blue-600 dark:text-blue-400" weight="duotone" />
            ) : (
              <HardDrives size={20} className="text-purple-600 dark:text-purple-400" weight="duotone" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-gray-950 dark:text-white truncate" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
              {resource.name}
            </h3>
            <p className="text-xs text-gray-600 dark:text-white/40 font-light" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
              {resource.type === 'qemu' ? 'VM' : 'CT'} #{resource.vmid}
            </p>
          </div>
        </div>
        {/* Status-Badge */}
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${isRunning ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor()}`}></span>
          {resource.status}
        </span>
      </div>
      
      {/* Ressourcen-Container */}
      <div className="min-h-[160px] flex flex-col justify-between mb-2">
        {isRunning ? (
          <div className="space-y-3">
            {/* CPU */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-white/50 font-medium" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>CPU</span>
                <span className="font-bold text-gray-950 dark:text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{cpuPercent}%</span>
              </div>
              <div className="w-full bg-gray-200/50 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-slate-400 to-slate-600 dark:from-slate-400 dark:to-slate-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(cpuPercent, 100)}%` }}
                ></div>
              </div>
            </div>
            
            {/* RAM */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-white/50 font-medium" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>RAM</span>
                <span className="font-bold text-gray-950 dark:text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{memPercent}%</span>
              </div>
              <div className="w-full bg-gray-200/50 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(memPercent, 100)}%` }}
                ></div>
              </div>
            </div>
            
            {/* Disk */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-white/50 font-medium" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>Disk</span>
                <span className="font-bold text-gray-950 dark:text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{diskPercent}%</span>
              </div>
              <div className="w-full bg-gray-200/50 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-amber-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(diskPercent, 100)}%` }}
                ></div>
              </div>
            </div>
            
            {/* Uptime */}
            <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-300/30 dark:border-white/10">
              <span className="text-gray-600 dark:text-white/50 font-medium flex items-center gap-1" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                <svg xmlns='http://www.w3.org/2000/svg' className='inline w-3.5 h-3.5 text-blue-500 dark:text-blue-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' /></svg>
                Uptime
              </span>
              <span className="font-bold text-gray-950 dark:text-white text-xs" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                {formatUptime(resource.uptime)}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3 flex flex-col justify-center h-full">
            <div className="text-center text-xs text-gray-600 dark:text-white/50 pt-2" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
              <span className="block font-semibold">{t('proxmox.last_started')}</span>
              {resource.lastRun ? (
                <span className="block font-mono text-gray-800 dark:text-white/70 mt-0.5">{resource.lastRun}</span>
              ) : (
                <span className="block font-mono text-gray-400 dark:text-white/30 italic mt-0.5">{t('proxmox.no_timestamp')}</span>
              )}
              <span className="block mt-2">{t('proxmox.runtime')} <span className="font-semibold">{formatUptime(resource.uptime)}</span></span>
            </div>
            <div className="text-center text-xs text-orange-600 dark:text-orange-400 bg-orange-500/10 rounded-lg px-2 py-1.5">
              {t('proxmox.vm_offline')}
            </div>
          </div>
        )}
      </div>
      
      {/* Control Buttons - nur bei Hover sichtbar */}
      {isAdmin && (
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {isRunning ? (
            <>
              <button
                onClick={() => onStop(resource.vmid, resource.type)}
                className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:border-rose-500/40 py-1.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1 text-xs font-semibold"
                title={t('proxmox.stop')}
              >
                <Stop size={14} weight="fill" />
              </button>
              <button
                onClick={() => onReboot(resource.vmid, resource.type)}
                className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:border-amber-500/40 py-1.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1 text-xs font-semibold"
                title={t('proxmox.restart')}
              >
                <ArrowsClockwise size={14} weight="bold" />
              </button>
            </>
          ) : (
            <button
              onClick={() => onStart(resource.vmid, resource.type)}
              className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 py-1.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs font-semibold"
              title={t('proxmox.start_vm')}
            >
              <Play size={14} weight="fill" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ProxmoxCard;