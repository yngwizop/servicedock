import React, { useEffect, useState } from 'react';
import { MonitorPlay, Desktop, HardDrives, ArrowsClockwise, WarningCircle, FloppyDisk } from 'phosphor-react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import '../styles/grid-layout.css';
import { authenticatedFetch } from '../utils/auth';
import NodeStatusCard from './stats/NodeStatusCard';
import VMStatusCard from './stats/VMStatusCard';
import TopUsageCard from './stats/TopUsageCard';
import TaskSummaryCard from './stats/TaskSummaryCard';
import TopDiskUsageCard from './stats/TopDiskUsageCard';
import StorageTotalCard from './stats/StorageTotalCard';
import StorageByNodeCard from './stats/StorageByNodeCard';
import StorageByTypeCard from './stats/StorageByTypeCard';
import CephHealthCard from './stats/CephHealthCard';
import CephOSDCard from './stats/CephOSDCard';

const ResponsiveGridLayout = WidthProvider(Responsive);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
  (window.location.port === '' ? 
    `${window.location.protocol}//${window.location.hostname}` :
    `${window.location.protocol}//${window.location.hostname}:8000`
  );

/**
 * Proxmox Status-Dashboard mit Cluster-Übersicht und Drag & Drop Layout
 * Zeigt aggregierte Statistiken über Nodes, VMs, LXCs und Tasks
 */
function ProxmoxStatusDashboard({ activeDashboard, isLoggedIn, textColor }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [layoutModified, setLayoutModified] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });
  
  // Berechne Card-Höhe basierend auf Top-Items-Anzahl
  const getTopCardHeight = () => {
    const topItems = parseInt(localStorage.getItem('proxmox_top_items') || '10');
    // Pixel-basierte Höhen (bei rowHeight=75px):
    // Top 5: 400px → h: 6 (450px)
    // Top 10: 720px → h: 10 (750px)
    // Top 15: 1020px → h: 14 (1050px)
    // Top 20: 1350px → h: 18 (1350px)
    if (topItems <= 5) return 5;
    if (topItems <= 10) return 9;
    if (topItems <= 15) return 13;
    return 17; // Top 20
  };

  // Default Layout: 4-Spalten-Grid mit dynamischer Höhe
  const getDefaultLayout = () => {
    const topCardHeight = getTopCardHeight();
    return [
      // Zeile 1: Status Cards (4x Cards nebeneinander)
      { i: 'nodes', x: 0, y: 0, w: 1, h: 3, minW: 1, maxW: 4, minH: 3, maxH: 6 },
      { i: 'vms', x: 1, y: 0, w: 1, h: 3, minW: 1, maxW: 4, minH: 3, maxH: 6 },
      { i: 'lxcs', x: 2, y: 0, w: 1, h: 3, minW: 1, maxW: 4, minH: 3, maxH: 6 },
      { i: 'tasks', x: 3, y: 0, w: 1, h: 3, minW: 1, maxW: 4, minH: 3, maxH: 6 },
      

      // Zeile 2: Top Usage (schmaler)
      { i: 'top-cpu', x: 0, y: 4, w: 1, h: topCardHeight, minW: 1, maxW: 2, minH: 6, maxH: 20 },
      { i: 'top-memory', x: 1, y: 4, w: 1, h: topCardHeight, minW: 1, maxW: 2, minH: 6, maxH: 20 },

      // Zeile 3: Disk Usage + Storage Total
      { i: 'top-disk', x: 2, y: 4 + topCardHeight, w: 1, h: topCardHeight, minW: 1, maxW: 2, minH: 6, maxH: 20 },
      { i: 'storage-total', x: 3, y: 4 + topCardHeight, w: 1, h: 4, minW: 1, maxW: 4, minH: 4, maxH: 6 },
      
      // Zeile 4: Storage By Node + By Type
      { i: 'storage-by-node', x: 0, y: 9 + topCardHeight, w: 2, h: 6, minW: 2, maxW: 4, minH: 6, maxH: 12 },
      { i: 'storage-by-type', x: 2, y: 9 + topCardHeight, w: 2, h: 6, minW: 1, maxW: 4, minH: 6, maxH: 12 },
      
      // Zeile 5: Ceph Cards (nur wenn Ceph verfügbar)
      { i: 'ceph-health', x: 0, y: 16 + topCardHeight, w: 2, h: 5, minW: 1, maxW: 4, minH: 4, maxH: 10 },
      { i: 'ceph-osd', x: 2, y: 16 + topCardHeight, w: 2, h: 5, minW: 1, maxW: 4, minH: 5, maxH: 5 }
    ];
  };
  
  const [layout, setLayout] = useState(getDefaultLayout());

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

  // Load saved layout from backend
  const loadLayout = async () => {
    try {
      const res = await authenticatedFetch(
        `${BACKEND_URL}/api/dashboards/${activeDashboard}/proxmox-layout`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.layout && Array.isArray(data.layout)) {
          // Update top card heights dynamically based on current settings
          const topCardHeight = getTopCardHeight();
          const defaultLayout = getDefaultLayout();
          
          // Merge: Keep saved positions but add missing cards from default layout
          const savedCardIds = new Set(data.layout.map(item => item.i));
          const missingCards = defaultLayout.filter(item => !savedCardIds.has(item.i));
          
          const updatedLayout = data.layout.map(item => {
            // Find default config for this card
            const defaultItem = defaultLayout.find(d => d.i === item.i);
            // Top Cards: Höhe immer Settings-gesteuert, nicht resizable
            if (item.i === 'top-cpu' || item.i === 'top-memory' || item.i === 'top-disk') {
              // Höhe immer Settings-gesteuert, Breite bleibt frei
              return {
                ...item,
                h: topCardHeight,
                minH: topCardHeight,
                maxH: topCardHeight
              };
            }
            // Ceph OSD Card: Fixed height (only width resizable)
            if (item.i === 'ceph-osd') {
              return {
                ...item,
                h: 5,
                minH: 5,
                maxH: 5
              };
            }
            // Enforce minH/maxH for cards that need minimum height
            const cardsWithMinHeight = ['storage-total', 'storage-by-node', 'storage-by-type', 'ceph-health'];
            if (cardsWithMinHeight.includes(item.i) && defaultItem) {
              return { 
                ...item, 
                minH: defaultItem.minH,
                maxH: defaultItem.maxH,
                minW: defaultItem.minW, // Enforce minW for horizontal resizing
                maxW: defaultItem.maxW,
                h: Math.max(item.h, defaultItem.minH) // Ensure h is not below minH
              };
            }
            return item;
          });
          
          // Add missing cards at the bottom
          const mergedLayout = [...updatedLayout, ...missingCards];
          setLayout(mergedLayout);
        }
      }
    } catch (err) {
      console.error('Error loading layout:', err);
    }
  };

  // Initial load: Stats + Layout
  useEffect(() => {
    if (isLoggedIn && activeDashboard) {
      setLoading(true);
      setStats(null);
      fetchStats();
      loadLayout();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDashboard, isLoggedIn]);

  // Save layout to backend
  const saveLayout = async () => {
    try {
      console.log('Saving layout:', layout);
      const res = await authenticatedFetch(
        `${BACKEND_URL}/api/dashboards/${activeDashboard}/proxmox-layout`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(layout)
        }
      );
      console.log('Save response status:', res.status);
      const data = await res.json();
      console.log('Save response data:', data);
      if (res.ok) {
        setLayoutModified(false);
        setSaveStatus({ type: 'success', message: 'Layout gespeichert!' });
        setTimeout(() => setSaveStatus({ type: '', message: '' }), 3000);
      } else {
        setSaveStatus({ type: 'error', message: data.detail || 'Fehler beim Speichern' });
        setTimeout(() => setSaveStatus({ type: '', message: '' }), 5000);
      }
    } catch (err) {
      console.error('Error saving layout:', err);
      setSaveStatus({ type: 'error', message: 'Netzwerkfehler beim Speichern' });
      setTimeout(() => setSaveStatus({ type: '', message: '' }), 5000);
    }
  };

  // Reset layout to default
  const resetLayout = async () => {
    try {
      const res = await authenticatedFetch(
        `${BACKEND_URL}/api/dashboards/${activeDashboard}/proxmox-layout`,
        {
          method: 'DELETE'
        }
      );
      if (res.ok) {
        const newLayout = getDefaultLayout();
        setLayout(newLayout);
        setLayoutModified(false);
        setSaveStatus({ type: 'success', message: 'Layout zurückgesetzt!' });
        setTimeout(() => setSaveStatus({ type: '', message: '' }), 3000);
      } else {
        const data = await res.json();
        setSaveStatus({ type: 'error', message: data.detail || 'Fehler beim Zurücksetzen' });
        setTimeout(() => setSaveStatus({ type: '', message: '' }), 5000);
      }
    } catch (err) {
      console.error('Error resetting layout:', err);
      setSaveStatus({ type: 'error', message: 'Netzwerkfehler beim Zurücksetzen' });
      setTimeout(() => setSaveStatus({ type: '', message: '' }), 5000);
    }
  };

  // Handle layout change (Drag or Resize)
  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout);
    setLayoutModified(true);
  };

  // Update layout when top items setting changes
  useEffect(() => {
    const handleSettingsChange = () => {
      const newHeight = getTopCardHeight();
      setLayout(currentLayout => {
        const updated = currentLayout.map(item => {
          if (item.i === 'top-cpu' || item.i === 'top-memory') {
            return { ...item, h: newHeight };
          }
          return item;
        });
        return updated;
      });
    };

    window.addEventListener('proxmox-settings-changed', handleSettingsChange);
    return () => window.removeEventListener('proxmox-settings-changed', handleSettingsChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh mit konfigurierbarem Intervall
  useEffect(() => {
    if (!autoRefresh || !isLoggedIn) return;

    const refreshInterval = parseInt(localStorage.getItem('proxmox_refresh_interval') || '30') * 1000;
    const interval = setInterval(() => {
      fetchStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      
      case 'top-disk':
        return (
          <TopDiskUsageCard 
            key="top-disk"
            title="Highest Disk Usage"
            items={stats.top_disk_usage}
          />
        );
      
      case 'storage-total':
        return (
          <StorageTotalCard 
            key="storage-total"
            storageTotal={stats.storage_total}
          />
        );
      
      case 'storage-by-node':
        return (
          <StorageByNodeCard 
            key="storage-by-node"
            storageByNode={stats.storage_by_node}
          />
        );
      
      case 'storage-by-type':
        return (
          <StorageByTypeCard 
            key="storage-by-type"
            storageByType={stats.storage_by_type}
          />
        );
      
      case 'ceph-health':
        return (
          <CephHealthCard 
            key="ceph-health"
            ceph={stats.ceph}
          />
        );
      
      case 'ceph-osd':
        return (
          <CephOSDCard 
            key="ceph-osd"
            ceph={stats.ceph}
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
    <>
      {/* Header mit Actions */}
      <div className="flex items-center justify-end mb-6">
        {/* Actions */}
        <div className="flex items-center gap-4">
          {/* Reset Layout Button */}
          <button
            onClick={resetLayout}
            className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors"
            title="Layout zurücksetzen"
          >
            <ArrowsClockwise size={18} weight="bold" />
            Layout zurücksetzen
          </button>
          
          {/* Save Layout Button */}
          {layoutModified && (
            <button
              onClick={saveLayout}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors shadow-lg"
              title="Layout speichern"
            >
              <FloppyDisk size={18} weight="bold" />
              Layout speichern
            </button>
          )}
          
          {/* Auto-Refresh Toggle */}
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600"
            />
            Auto-Refresh ({parseInt(localStorage.getItem('proxmox_refresh_interval') || '30')}s)
          </label>
          
          {/* Refresh Button */}
          <button
            onClick={fetchStats}
            className="p-2 rounded-lg bg-white/50 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20 backdrop-blur-md border border-gray-300/50 dark:border-white/10 transition-all shadow-lg hover:shadow-xl"
            title="Aktualisieren"
          >
            <ArrowsClockwise size={20} weight="bold" className="text-slate-700 dark:text-slate-300" />
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {saveStatus.message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          saveStatus.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
          saveStatus.type === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
          'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
        }`}>
          {saveStatus.message}
        </div>
      )}

      {/* React Grid Layout */}
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: layout }}
        breakpoints={{ lg: 1024, md: 768, sm: 640, xs: 0 }}
        cols={{ lg: 4, md: 2, sm: 1, xs: 1 }}
        rowHeight={75}
        isDraggable={true}
        isResizable={true}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        compactType="vertical"
      >
        {layout.map(item => (
          <div key={item.i}>
            {renderCard(item.i)}
          </div>
        ))}
      </ResponsiveGridLayout>
    </>
  );
}

export default ProxmoxStatusDashboard;
