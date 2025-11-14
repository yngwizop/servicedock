import React from 'react';
import { Desktop, PlayCircle, StopCircle, Cpu } from 'phosphor-react';

/**
 * ProxmoxStatsCards - Zeigt System-Übersicht wie im Screenshot
 * Inspiriert von modernen Dashboards (Total, Running, Stopped, CPU Cores)
 */
function ProxmoxStatsCards({ resources, nodes }) {
  // Statistiken berechnen
  const total = resources.length;
  const running = resources.filter(r => r.status === 'running').length;
  const stopped = resources.filter(r => r.status === 'stopped').length;
  
  // CPU Cores von allen Nodes summieren (physische CPU Cores des Hosts)
  const totalCpuCores = nodes?.reduce((sum, node) => sum + (node.cpus || 0), 0) || 0;

  // Card-Komponente für Wiederverwendbarkeit
  const StatCard = ({ title, value, icon: Icon, gradient, iconColor }) => (
    <div 
      className={`${gradient} rounded-xl shadow-lg p-6 backdrop-blur-sm border border-white/20 hover:scale-105 transition-transform duration-300`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white/80 uppercase tracking-wide mb-2">
            {title}
          </p>
          <p className="text-4xl font-bold text-white">
            {value}
          </p>
        </div>
        <div className={`${iconColor} bg-white/20 p-4 rounded-lg`}>
          <Icon size={32} weight="duotone" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total */}
      <StatCard
        title="Total"
        value={total}
        icon={Desktop}
        gradient="bg-gradient-to-br from-slate-600/90 to-slate-800/90"
        iconColor="text-white"
      />

      {/* Running */}
      <StatCard
        title="Running"
        value={running}
        icon={PlayCircle}
        gradient="bg-gradient-to-br from-emerald-700/90 to-emerald-900/90"
        iconColor="text-white"
      />

      {/* Stopped */}
      <StatCard
        title="Stopped"
        value={stopped}
        icon={StopCircle}
        gradient="bg-gradient-to-br from-rose-700/90 to-rose-900/90"
        iconColor="text-white"
      />

      {/* CPU Cores (all VMs/Containers) */}
      <StatCard
        title="CPU Cores"
        value={totalCpuCores}
        icon={Cpu}
        gradient="bg-gradient-to-br from-amber-700/90 to-amber-900/90"
        iconColor="text-white"
      />
    </div>
  );
}

export default ProxmoxStatsCards;
