import React, { useEffect, useState, useRef } from 'react';
import { Desktop, PlayCircle, StopCircle, Cpu, HardDrives } from 'phosphor-react';

/**
 * Animated Counter Hook — Zählt von 0 bis target hoch
 * Startet von 0 beim ersten Mount, danach von altem Wert zum neuen
 */
function useAnimatedCounter(target, duration = 2200, delay = 0) {
  const [value, setValue] = useState(0);
  const hasAnimated = useRef(false);
  const prevTarget = useRef(0);
  const frameRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // Bestimme Startwert: 0 beim ersten Mal, danach alter Wert
    const from = hasAnimated.current ? prevTarget.current : 0;
    hasAnimated.current = true;
    prevTarget.current = target;
    
    if (target === from) { setValue(target); return; }
    
    // Cleanup vorherige Animation
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(() => {
      const start = performance.now();
      const animate = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out quart für langsameres Auslaufen
        const eased = 1 - Math.pow(1 - progress, 4);
        setValue(Math.round(from + (target - from) * eased));
        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate);
        }
      };
      frameRef.current = requestAnimationFrame(animate);
    }, delay);
    
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [target, duration, delay]);

  return value;
}

/**
 * Einzelne Stat-Card — als eigene Komponente damit React sie stabil hält
 * und nicht bei jedem Counter-Update unmountet/remountet
 */
const StatCard = React.memo(function StatCard({ title, value, icon: Icon, accentColor, iconBg, animationDelay = 0 }) {
  return (
    <div 
      className="animate-slide-in-left dark:bg-white/[0.12] sd-night-surface backdrop-blur-md rounded-xl shadow-lg night:shadow-black/40 p-6 border border-gray-400/60 dark:border-white/10 night:border-white/[0.07] hover:scale-[1.03] hover:border-gray-500/70 dark:hover:border-white/20 night:hover:border-white/12 transition-all duration-300 group"
      style={{ animationDelay: `${animationDelay}s` }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-600 dark:text-white/50 uppercase tracking-wider mb-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
            {title}
          </p>
          <p className={`text-4xl font-bold tabular-nums ${accentColor}`} style={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
            {value}
          </p>
        </div>
        <div className={`${iconBg} p-3.5 rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
          <Icon size={28} weight="duotone" className={accentColor} />
        </div>
      </div>
    </div>
  );
});

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

  // Animated Counters — gestaffelt, damit sie nacheinander starten
  const animTotal = useAnimatedCounter(total, 2200, 100);
  const animRunning = useAnimatedCounter(running, 2200, 250);
  const animStopped = useAnimatedCounter(stopped, 2200, 400);
  const animCpu = useAnimatedCounter(totalCpuCores, 2200, 550);
  const animNodes = useAnimatedCounter(nodeCount, 2200, 700);

  const cards = [
    { title: 'Total', value: animTotal, icon: Desktop, accentColor: 'text-gray-800 dark:text-white', iconBg: 'bg-gray-200/60 dark:bg-white/10 night:bg-sd-night-950/70' },
    { title: 'Running', value: animRunning, icon: PlayCircle, accentColor: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-100/60 dark:bg-emerald-500/10 night:bg-emerald-950/40' },
    { title: 'Stopped', value: animStopped, icon: StopCircle, accentColor: 'text-rose-600 dark:text-rose-400', iconBg: 'bg-rose-100/60 dark:bg-rose-500/10 night:bg-rose-950/35' },
    { title: 'CPU Cores', value: animCpu, icon: Cpu, accentColor: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-100/60 dark:bg-amber-500/10 night:bg-amber-950/35' },
    { title: 'Nodes', value: animNodes, icon: HardDrives, accentColor: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-blue-100/60 dark:bg-blue-500/10 night:bg-blue-950/40' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((card, i) => (
        <StatCard key={card.title} {...card} animationDelay={i * 0.15} />
      ))}
    </div>
  );
}

export default ProxmoxStatsCards;
