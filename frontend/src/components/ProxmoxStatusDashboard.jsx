import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [layoutModified, setLayoutModified] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });
  const layoutInitialized = useRef(false);
  const currentBreakpoint = useRef('lg');

  // Dynamische Card-Höhen basierend auf API-Daten berechnen
  // rowHeight=75px, margin=20px → Pixel = h*75 + (h-1)*20 = 95h - 20
  const getDynamicCardHeight = (cardId, statsData) => {
    if (!statsData) return null;

    switch (cardId) {
      case 'storage-by-node': {
        const nodeCount = statsData.storage_by_node?.length || 0;
        // p-6 Card + Header ~60px + each node ~130px (header+bar+stats+tags)
        // 3 Nodes → ~450px → h=5 (455px), 5 Nodes → ~710px → h=8 (740px)
        return Math.max(4, Math.ceil(1 + nodeCount * 1.4));
      }
      case 'storage-by-type': {
        const typeCount = statsData.storage_by_type?.length || 0;
        // p-6 Card + Header ~60px + each type ~80px (header+bar+stats)
        // 5 Types → ~460px → h=6 (550px), 3 Types → ~300px → h=4 (360px)
        return Math.max(4, Math.ceil(1 + typeCount * 0.85));
      }
      case 'tasks': {
        const nodeCount = statsData.tasks?.by_node?.length || 0;
        // compact (p-3) + Header ~50px + each node ~35px + footer ~40px
        // 3 Nodes → ~195px → h=3 (265px)
        return Math.max(3, Math.ceil(1.2 + nodeCount * 0.45));
      }
      default:
        return null;
    }
  };

  // Layout-Höhen nach Stats-Update anpassen
  const applyDynamicHeights = (currentLayout, statsData) => {
    if (!statsData) return currentLayout;

    const dynamicCards = ['storage-by-node', 'storage-by-type', 'tasks'];

    return currentLayout.map(item => {
      if (dynamicCards.includes(item.i)) {
        const dynamicH = getDynamicCardHeight(item.i, statsData);
        if (dynamicH !== null) {
          return {
            ...item,
            h: dynamicH,
            minH: dynamicH,
            maxH: dynamicH, // Höhe ist fix, nur Breite resizable
          };
        }
      }
      return item;
    });
  };
  
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
      { i: 'nodes', x: 0, y: 0, w: 1, h: 3, minW: 1, maxW: 4, minH: 3, maxH: 3 },
      { i: 'vms', x: 1, y: 0, w: 1, h: 3, minW: 1, maxW: 4, minH: 3, maxH: 3 },
      { i: 'lxcs', x: 2, y: 0, w: 1, h: 3, minW: 1, maxW: 4, minH: 3, maxH: 3 },
      // Tasks: Höhe wird dynamisch nach API-Daten gesetzt
      { i: 'tasks', x: 3, y: 0, w: 1, h: 3, minW: 1, maxW: 4, minH: 3, maxH: 3 },

      // Zeile 2: Top Usage (Höhe Settings-gesteuert)
      { i: 'top-cpu', x: 0, y: 4, w: 1, h: topCardHeight, minW: 1, maxW: 2, minH: topCardHeight, maxH: topCardHeight },
      { i: 'top-memory', x: 1, y: 4, w: 1, h: topCardHeight, minW: 1, maxW: 2, minH: topCardHeight, maxH: topCardHeight },

      // Zeile 3: Disk Usage + Storage Total
      { i: 'top-disk', x: 2, y: 4 + topCardHeight, w: 1, h: topCardHeight, minW: 1, maxW: 2, minH: topCardHeight, maxH: topCardHeight },
      { i: 'storage-total', x: 3, y: 4 + topCardHeight, w: 1, h: 4, minW: 1, maxW: 4, minH: 4, maxH: 7 },
      
      // Zeile 4: Storage By Node + By Type (Höhe dynamisch nach API-Daten)
      { i: 'storage-by-node', x: 0, y: 9 + topCardHeight, w: 2, h: 6, minW: 2, maxW: 4, minH: 3, maxH: 6 },
      { i: 'storage-by-type', x: 2, y: 9 + topCardHeight, w: 2, h: 6, minW: 1, maxW: 4, minH: 3, maxH: 6 },
      
      // Zeile 5: Ceph Cards (Höhe manuell einstellbar)
      { i: 'ceph-health', x: 0, y: 16 + topCardHeight, w: 2, h: 5, minW: 1, maxW: 4, minH: 4, maxH: 7 },
      { i: 'ceph-osd', x: 2, y: 16 + topCardHeight, w: 2, h: 5, minW: 1, maxW: 4, minH: 4, maxH: 7 }
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
      
      // Layout-Höhen dynamisch an Daten anpassen
      setLayout(currentLayout => applyDynamicHeights(currentLayout, data));
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
            if (!defaultItem) return item;

            // Cards mit manuell einstellbarer Höhe: gespeicherte Höhe beibehalten
            const resizableHeightCards = ['storage-total', 'ceph-health', 'ceph-osd'];
            const savedH = resizableHeightCards.includes(item.i)
              ? Math.min(Math.max(item.h, defaultItem.minH), defaultItem.maxH)
              : defaultItem.h;

            return {
              ...defaultItem,       // Default constraints (minH, maxH, minW, maxW)
              x: item.x,            // Gespeicherte Position
              y: item.y,
              w: Math.max(item.w, defaultItem.minW),
              h: savedH,
            };
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
      layoutInitialized.current = false;
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
        setSaveStatus({ type: 'success', message: t('statusDashboard.layout_saved') });
        setTimeout(() => setSaveStatus({ type: '', message: '' }), 3000);
      } else {
        setSaveStatus({ type: 'error', message: data.detail || t('statusDashboard.save_error') });
        setTimeout(() => setSaveStatus({ type: '', message: '' }), 5000);
      }
    } catch (err) {
      console.error('Error saving layout:', err);
      setSaveStatus({ type: 'error', message: t('statusDashboard.save_network_error') });
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
        setSaveStatus({ type: 'success', message: t('statusDashboard.layout_reset') });
        setTimeout(() => setSaveStatus({ type: '', message: '' }), 3000);
      } else {
        const data = await res.json();
        setSaveStatus({ type: 'error', message: data.detail || t('statusDashboard.reset_error') });
        setTimeout(() => setSaveStatus({ type: '', message: '' }), 5000);
      }
    } catch (err) {
      console.error('Error resetting layout:', err);
      setSaveStatus({ type: 'error', message: t('statusDashboard.reset_network_error') });
      setTimeout(() => setSaveStatus({ type: '', message: '' }), 5000);
    }
  };

  // Handle layout change (Drag or Resize)
  const handleLayoutChange = (newLayout) => {
    // Skip initial mount calls from react-grid-layout
    if (!layoutInitialized.current) {
      layoutInitialized.current = true;
      return;
    }
    // Only track changes for the lg breakpoint
    if (currentBreakpoint.current === 'lg') {
      setLayout(newLayout);
      setLayoutModified(true);
    }
  };

  // Track breakpoint changes
  const handleBreakpointChange = (newBreakpoint) => {
    currentBreakpoint.current = newBreakpoint;
  };

  // Update layout when top items setting changes
  useEffect(() => {
    const handleSettingsChange = () => {
      const newHeight = getTopCardHeight();
      setLayout(currentLayout => {
        const updated = currentLayout.map(item => {
          if (item.i === 'top-cpu' || item.i === 'top-memory' || item.i === 'top-disk') {
            return { ...item, h: newHeight, minH: newHeight, maxH: newHeight };
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
          <p className="text-gray-600 dark:text-gray-400">
            {t('statusDashboard.loading')}
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
            <p className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              {t('statusDashboard.error_loading')}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {error}
            </p>
            <button
              onClick={fetchStats}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {t('common.retry')}
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
        <p className="text-gray-600 dark:text-gray-400">
          {t('statusDashboard.no_data')}
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
            className="flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
            title={t('statusDashboard.reset_layout')}
          >
            <ArrowsClockwise size={18} weight="bold" />
            {t('statusDashboard.reset_layout')}
          </button>
          
          {/* Save Layout Button */}
          {layoutModified && (
            <button
              onClick={saveLayout}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors shadow-lg"
              title={t('statusDashboard.save_layout')}
            >
              <FloppyDisk size={18} weight="bold" />
              {t('statusDashboard.save_layout')}
            </button>
          )}
          
          {/* Auto-Refresh Toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 dark:border-white/20"
            />
            Auto-Refresh ({parseInt(localStorage.getItem('proxmox_refresh_interval') || '30')}s)
          </label>
          
          {/* Refresh Button */}
          <button
            onClick={fetchStats}
            className="p-2 rounded-lg bg-white/50 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20 backdrop-blur-md border border-gray-300/50 dark:border-white/10 transition-all shadow-lg hover:shadow-xl"
            title={t('common.refresh')}
          >
            <ArrowsClockwise size={20} weight="bold" className="text-gray-700 dark:text-gray-200" />
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
        margin={[20, 20]}
        containerPadding={[0, 0]}
        isDraggable={true}
        isResizable={true}
        onLayoutChange={handleLayoutChange}
        onBreakpointChange={handleBreakpointChange}
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
