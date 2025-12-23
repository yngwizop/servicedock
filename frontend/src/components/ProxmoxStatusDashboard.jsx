import React, { useEffect, useState } from 'react';
import { MonitorPlay, Desktop, HardDrives, ArrowsClockwise, WarningCircle } from 'phosphor-react';
import { authenticatedFetch } from '../utils/auth';
import NodeStatusCard from './stats/NodeStatusCard';
import VMStatusCard from './stats/VMStatusCard';
import TopUsageCard from './stats/TopUsageCard';
import TaskSummaryCard from './stats/TaskSummaryCard';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
  (window.location.port === '' ? 
    `${window.location.protocol}//${window.location.hostname}` :
    `${window.location.protocol}//${window.location.hostname}:8000`
  );

/**
 * Proxmox Status-Dashboard mit Cluster-Übersicht
 * Zeigt aggregierte Statistiken über Nodes, VMs, LXCs und Tasks
 */
function ProxmoxStatusDashboard({ activeDashboard, isLoggedIn }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Card-Layout (später für Drag & Drop)
  const [cardLayout, setCardLayout] = useState([
    'nodes',
    'vms', 
    'lxcs',
    'tasks',     // Oben rechts
    'top-cpu',   // Unten links (2 Spalten)
    'top-memory' // Unten rechts (2 Spalten)
  ]);

  // Statistiken laden
  const fetchStats = async () => {
    try {
      setError(null);
      const topItems = parseInt(localStorage.getItem('proxmox_top_items') || '10');
      const taskHours = parseInt(localStorage.getItem('proxmox_task_hours') || '48');
      const res = await authenticatedFetch(
        `${BACKEND_URL}/api/proxmox/cluster-stats?dashboard_id=${activeDashboard}&top_n=${topItems}&task_hours=${taskHours}`
      );
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch statistics');
      }
      
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching Proxmox stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (isLoggedIn) {
      setLoading(true);
      setStats(null);
      fetchStats();
    }
  }, [activeDashboard, isLoggedIn]);

  // Auto-refresh mit konfigurierbarem Intervall
  useEffect(() => {
    if (!autoRefresh || !isLoggedIn) return;

    const refreshInterval = parseInt(localStorage.getItem('proxmox_refresh_interval') || '30') * 1000;
    const interval = setInterval(() => {
      fetchStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, activeDashboard, isLoggedIn]);

  // Render Cards basierend auf Layout
  const renderCard = (cardType) => {
    if (!stats) return null;

    switch (cardType) {
      case 'nodes':
        return <NodeStatusCard key="nodes" stats={stats.nodes} />;
      
      case 'vms':
        return (
          <VMStatusCard 
            key="vms"
            title="Virtual Machines"
            icon={Desktop}
            stats={stats.vms}
            type="vm"
          />
        );
      
      case 'lxcs':
        return (
          <VMStatusCard 
            key="lxcs"
            title="Linux Containers"
            icon={HardDrives}
            stats={stats.lxcs}
            type="lxc"
          />
        );
      
      case 'tasks':
        return <TaskSummaryCard key="tasks" stats={stats.tasks} />;
      
      case 'top-cpu':
        return (
          <TopUsageCard 
            key="top-cpu"
            title="Highest CPU Usage"
            items={stats.top_cpu_usage}
            usageType="cpu"
          />
        );
      
      case 'top-memory':
        return (
          <TopUsageCard 
            key="top-memory"
            title="Highest Memory Usage"
            items={stats.top_memory_usage}
            usageType="memory"
          />
        );
      
      default:
        return null;
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <ArrowsClockwise 
            size={48} 
            weight="bold"
            className="mx-auto text-blue-600 dark:text-blue-400 animate-spin"
          />
          <p className="text-slate-600 dark:text-slate-400">
            Lade Cluster-Statistiken...
          </p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4 max-w-md">
          <WarningCircle 
            size={48} 
            weight="fill"
            className="mx-auto text-red-600 dark:text-red-400"
          />
          <div>
            <p className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
              Fehler beim Laden der Statistiken
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {error}
            </p>
            <button
              onClick={fetchStats}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No Data State
  if (!stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-600 dark:text-slate-400">
          Keine Daten verfügbar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header mit Cluster-Name und Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MonitorPlay size={32} weight="duotone" className="text-blue-600 dark:text-blue-400" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {stats.cluster_name || 'Server'} Status
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {stats.is_cluster ? 'Cluster' : 'Standalone'} Übersicht
            </p>
          </div>
        </div>

        {/* Refresh Toggle */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600"
            />
            Auto-Refresh ({parseInt(localStorage.getItem('proxmox_refresh_interval') || '30')}s)
          </label>
          
          <button
            onClick={fetchStats}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            title="Aktualisieren"
          >
            <ArrowsClockwise size={20} weight="bold" />
          </button>
        </div>
      </div>

      {/* Grid Layout - Responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cardLayout.map(cardType => renderCard(cardType))}
      </div>
    </div>
  );
}

export default ProxmoxStatusDashboard;
