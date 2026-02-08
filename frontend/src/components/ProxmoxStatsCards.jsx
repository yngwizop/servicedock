import React from 'react';
import { Desktop, PlayCircle, StopCircle, Cpu, HardDrives } from 'phosphor-react';

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
  
  // Anzahl der Cluster-Nodes
  const nodeCount = nodes?.length || 0;

  // Card-Komponente für Wiederverwendbarkeit
  const StatCard = ({ title, value, icon: Icon, accentColor, iconBg }) => (
    <div 
      className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-md rounded-xl shadow-lg p-6 border border-gray-300/50 dark:border-white/[0.12] hover:scale-105 hover:border-gray-400/70 dark:hover:border-white/20 transition-all duration-300"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-600 dark:text-white/50 uppercase tracking-wider mb-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
            {title}
          </p>
          <p className={`text-4xl font-bold ${accentColor}`} style={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
            {value}
          </p>
        </div>
        <div className={`${iconBg} p-3.5 rounded-xl`}>
          <Icon size={28} weight="duotone" className={accentColor} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {/* Total */}
      <StatCard
        title="Total"
        value={total}
        icon={Desktop}
        accentColor="text-gray-800 dark:text-white"
        iconBg="bg-gray-200/60 dark:bg-white/10"
      />

      {/* Running */}
      <StatCard
        title="Running"
        value={running}
        icon={PlayCircle}
        accentColor="text-emerald-600 dark:text-emerald-400"
        iconBg="bg-emerald-100/60 dark:bg-emerald-500/10"
      />

      {/* Stopped */}
      <StatCard
        title="Stopped"
        value={stopped}
        icon={StopCircle}
        accentColor="text-rose-600 dark:text-rose-400"
        iconBg="bg-rose-100/60 dark:bg-rose-500/10"
      />

      {/* CPU Cores (all VMs/Containers) */}
      <StatCard
        title="CPU Cores"
        value={totalCpuCores}
        icon={Cpu}
        accentColor="text-amber-600 dark:text-amber-400"
        iconBg="bg-amber-100/60 dark:bg-amber-500/10"
      />

      {/* Nodes */}
      <StatCard
        title="Nodes"
        value={nodeCount}
        icon={HardDrives}
        accentColor="text-blue-600 dark:text-blue-400"
        iconBg="bg-blue-100/60 dark:bg-blue-500/10"
      />
    </div>
  );
}

export default ProxmoxStatsCards;
