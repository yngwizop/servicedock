import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MonitorPlay, Desktop, HardDrives, ArrowsClockwise, ArrowCounterClockwise, WarningCircle, FloppyDisk, Eye } from 'phosphor-react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import '../styles/grid-layout.css';
import { authenticatedFetch } from '../utils/auth';
import { translateProxmoxError } from '../utils/proxmoxErrors';
import { BACKEND_URL } from '../utils/backendUrl';
import {
  getProxmoxRefreshInterval,
  getProxmoxTaskHours,
  getProxmoxTopItems,
} from '../utils/proxmoxDashboardPrefs';
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
import ClusterComputeCard from './stats/ClusterComputeCard';
import CardVisibilityPanel, { CARD_DEFINITIONS, loadVisibleCards, saveVisibleCardsLocal, getDefaultVisibleCards } from './stats/CardVisibilityPanel';
import ClusterStatsLoading from './stats/ClusterStatsLoading';

const ResponsiveGridLayout = WidthProvider(Responsive);

/** Nur horizontale Breite — Höhe kommt aus Daten / min=max (kein manuelles Ziehen). */
const RESIZE_WIDTH_ONLY = ['e', 'w'];

/**
 * Proxmox Status-Dashboard mit Cluster-Übersicht und Drag & Drop Layout
 * Zeigt aggregierte Statistiken über Nodes, VMs, LXCs und Tasks
 */
function ProxmoxStatusDashboard({
  activeDashboard,
  isLoggedIn,
  textColor,
  clusterStatsPrefetch = null,
  onClusterStatsPrefetchConsumed,
}) {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const statsRef = useRef(null);
  statsRef.current = stats;
  const layoutRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [layoutModified, setLayoutModified] = useState(false);
  /** Synchron: verhindert, dass ein spätes loadLayout() lokale Drag-/Resize-Änderungen überschreibt */
  const layoutModifiedRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });
  const layoutInitialized = useRef(false);
  const currentBreakpoint = useRef('lg');
  const savedLayoutRef = useRef(null); // Baseline zum Vergleich ob User wirklich was geändert hat
  const cephAutoDetected = useRef(false);

  // Card Visibility State — pro Dashboard (localStorage + Backend)
  const [visibleCards, setVisibleCards] = useState(() => {
    const saved = loadVisibleCards(activeDashboard);
    return saved ?? CARD_DEFINITIONS.map((c) => c.id);
  });
  const hasUserConfigured = useRef(loadVisibleCards(activeDashboard) !== null);

  useEffect(() => {
    if (!activeDashboard) return;
    const saved = loadVisibleCards(activeDashboard);
    if (saved != null) {
      setVisibleCards(saved);
      hasUserConfigured.current = true;
    } else {
      hasUserConfigured.current = false;
      setVisibleCards(CARD_DEFINITIONS.map((c) => c.id));
    }
  }, [activeDashboard]);

  // Dynamische Card-Höhen: aus geschätzter Inhaltshöhe (px) → Grid-h
  // RGL: Höhe = rowHeight*h + marginY*(h-1) = 75*h + 20*(h-1) = 95*h - 20
  const gridHFromContentPx = (contentPx, minH, maxH) => {
    const h = Math.ceil((contentPx + 20) / 95);
    return Math.min(maxH, Math.max(minH, h));
  };

  const getDynamicCardHeight = (cardId, statsData) => {
    if (!statsData) return null;

    switch (cardId) {
      case 'storage-by-node': {
        const nodeCount = statsData.storage_by_node?.length || 0;
        if (nodeCount === 0) return 4;
        // p-6 Card + Header; pro Node Block inkl. optionaler Storage-Tags (~140px)
        const contentPx = 100 + nodeCount * 140;
        return gridHFromContentPx(contentPx, 4, 20);
      }
      case 'storage-by-type': {
        const typeCount = statsData.storage_by_type?.length || 0;
        if (typeCount === 0) return 4;
        // Mittelweg: genug für 6 Typen ohne Clip (~7 Rasterzeilen), weniger Leerraum als früher
        const contentPx = 78 + typeCount * 82;
        return gridHFromContentPx(contentPx, 3, 24);
      }
      default:
        return null;
    }
  };

  // Layout-Höhen nach Stats-Update anpassen
  const applyDynamicHeights = (currentLayout, statsData) => {
    if (!statsData) return currentLayout;

    const dynamicCards = ['storage-by-node', 'storage-by-type'];

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

  /** Nur bei geänderter dynamischer Höhe neu setzen — vermeidet ständiges RGL-Reflow/Flackern bei Auto-Refresh. */
  const dynamicHeightsChanged = (prevLayout, nextLayout) => {
    const ids = ['storage-by-node', 'storage-by-type'];
    const metrics = (layout) => {
      const m = new Map();
      for (const item of layout) {
        if (ids.includes(item.i)) {
          m.set(item.i, { h: item.h, minH: item.minH, maxH: item.maxH });
        }
      }
      return m;
    };
    const a = metrics(prevLayout);
    const b = metrics(nextLayout);
    for (const id of ids) {
      const pa = a.get(id);
      const pb = b.get(id);
      if (!pa && !pb) continue;
      if (!pa || !pb) return true;
      if (pa.h !== pb.h || pa.minH !== pb.minH || pa.maxH !== pb.maxH) return true;
    }
    return false;
  };
  
  // Berechne Card-Höhe basierend auf Top-Items-Anzahl
  const getTopCardHeight = (dashboardId) => {
    const topItems = getProxmoxTopItems(dashboardId);
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
    const topCardHeight = getTopCardHeight(activeDashboard);
    return [
      // Zeile 1–2: Status Cards (Default je 2 Spalten breit, min 1; Höhe Default = min, +1 Raster möglich)
      { i: 'nodes', x: 0, y: 0, w: 2, h: 3, minW: 1, maxW: 4, minH: 3, maxH: 4 },
      { i: 'vms', x: 2, y: 0, w: 2, h: 3, minW: 1, maxW: 4, minH: 3, maxH: 4 },
      { i: 'lxcs', x: 0, y: 3, w: 2, h: 3, minW: 1, maxW: 4, minH: 3, maxH: 4 },
      { i: 'tasks', x: 2, y: 3, w: 2, h: 3, minW: 1, maxW: 4, minH: 3, maxH: 4 },

      // Compute-Pool (volle Breite unter Status-Zeilen)
      { i: 'compute-cluster', x: 0, y: 6, w: 4, h: 4, minW: 1, maxW: 4, minH: 4, maxH: 6, resizeHandles: RESIZE_WIDTH_ONLY },

      // Top Usage (unter Compute-Karte)
      { i: 'top-cpu', x: 0, y: 10, w: 1, h: topCardHeight, minW: 1, maxW: 2, minH: topCardHeight, maxH: topCardHeight, resizeHandles: RESIZE_WIDTH_ONLY },
      { i: 'top-memory', x: 1, y: 10, w: 1, h: topCardHeight, minW: 1, maxW: 2, minH: topCardHeight, maxH: topCardHeight, resizeHandles: RESIZE_WIDTH_ONLY },

      { i: 'top-disk', x: 2, y: 10 + topCardHeight, w: 1, h: topCardHeight, minW: 1, maxW: 2, minH: topCardHeight, maxH: topCardHeight, resizeHandles: RESIZE_WIDTH_ONLY },
      { i: 'storage-total', x: 3, y: 10 + topCardHeight, w: 1, h: 4, minW: 1, maxW: 4, minH: 4, maxH: 7 },
      
      { i: 'storage-by-node', x: 0, y: 15 + topCardHeight, w: 2, h: 6, minW: 1, maxW: 4, minH: 3, maxH: 6, resizeHandles: RESIZE_WIDTH_ONLY },
      { i: 'storage-by-type', x: 2, y: 15 + topCardHeight, w: 2, h: 6, minW: 1, maxW: 4, minH: 3, maxH: 6, resizeHandles: RESIZE_WIDTH_ONLY },
      
      { i: 'ceph-health', x: 0, y: 22 + topCardHeight, w: 2, h: 5, minW: 1, maxW: 4, minH: 4, maxH: 7 },
      { i: 'ceph-osd', x: 2, y: 22 + topCardHeight, w: 2, h: 5, minW: 1, maxW: 4, minH: 5, maxH: 10 }
    ];
  };
  
  const [layout, setLayout] = useState(getDefaultLayout());
  layoutRef.current = layout;

  /** Nur für Memo-Deps: gleiche Kachel-Geometrie → gleicher String, auch wenn layout-Array-Referenz neu ist */
  const layoutPositionSig = layout
    .map((i) => `${i.i}:${i.x},${i.y},${i.w},${i.h},${i.minH},${i.maxH}`)
    .join('|');

  // Save visible cards to backend + localStorage cache
  const saveVisibleCards = async (cardIds) => {
    saveVisibleCardsLocal(cardIds, activeDashboard); // sofortiger lokaler Cache (pro Dashboard)
    try {
      await authenticatedFetch(
        `${BACKEND_URL}/api/dashboards/${activeDashboard}/proxmox-visible-cards`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cardIds)
        }
      );
    } catch (err) {
      console.error('Error saving visible cards:', err);
    }
  };

  // Load visible cards from backend
  const loadVisibleCardsFromBackend = async () => {
    try {
      const res = await authenticatedFetch(
        `${BACKEND_URL}/api/dashboards/${activeDashboard}/proxmox-visible-cards`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.visible_cards && Array.isArray(data.visible_cards)) {
          setVisibleCards(data.visible_cards);
          saveVisibleCardsLocal(data.visible_cards, activeDashboard);
          hasUserConfigured.current = true;
          return true; // Loaded from backend
        }
      }
    } catch (err) {
      console.error('Error loading visible cards:', err);
    }
    return false; // Not found in backend
  };

  const applyStatsPayload = (data) => {
    setStats(data);

    if (!cephAutoDetected.current && !hasUserConfigured.current) {
      cephAutoDetected.current = true;
      const cephAvailable = data.ceph?.available === true;
      const defaultCards = getDefaultVisibleCards(cephAvailable);
      setVisibleCards(defaultCards);
      saveVisibleCards(defaultCards);
      hasUserConfigured.current = true;
    }

    setLayout((currentLayout) => {
      const nextLayout = applyDynamicHeights(currentLayout, data);
      if (!dynamicHeightsChanged(currentLayout, nextLayout)) {
        return currentLayout;
      }
      return nextLayout;
    });
  };

  // Statistiken laden
  const fetchStats = async ({ silent = false, resetLoading = false } = {}) => {
    if (resetLoading) setLoading(true);
    if (!silent) setError(null);
    try {
      const topItems = getProxmoxTopItems(activeDashboard);
      const taskHours = getProxmoxTaskHours(activeDashboard);
      const res = await authenticatedFetch(
        `${BACKEND_URL}/api/proxmox/cluster-stats?dashboard_id=${activeDashboard}&top_n=${topItems}&task_hours=${taskHours}`
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const detail = errorData?.detail;
        const err = new Error(typeof detail === 'string' ? detail : 'Failed to fetch statistics');
        if (detail && typeof detail === 'object') {
          err.code = detail.code || null;
          err.context = detail.context || null;
        }
        throw err;
      }

      const data = await res.json();
      applyStatsPayload(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching Proxmox stats:', err);
      setError(translateProxmoxError(err.code, err.context, err.message, t));
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh with visual feedback
  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchStats({ silent: false });
    setRefreshing(false);
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
          const topCardHeight = getTopCardHeight(activeDashboard);
          const defaultLayout = getDefaultLayout();
          
          // Merge: Keep saved positions but add missing cards from default layout
          const savedCardIds = new Set(data.layout.map(item => item.i));
          const missingCards = defaultLayout.filter(item => !savedCardIds.has(item.i));
          
          const updatedLayout = data.layout.map(item => {
            // Find default config for this card
            const defaultItem = defaultLayout.find(d => d.i === item.i);
            if (!defaultItem) return item;

            // Cards mit manuell einstellbarer Höhe: gespeicherte Höhe beibehalten
            const resizableHeightCards = [
              'storage-total',
              'ceph-health',
              'ceph-osd',
              'nodes',
              'vms',
              'lxcs',
              'tasks',
              'compute-cluster',
            ];
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
          // Wichtig: gespeichertes Layout setzt storage-by-type u. a. auf default-h (z. B. 6).
          // Ohne Hydration aus Stats würde das mit dem nächsten Poll hin- und herspringen.
          const withDynamicHeights = statsRef.current
            ? applyDynamicHeights(mergedLayout, statsRef.current)
            : mergedLayout;
          // Nicht das Server-Layout aufsetzen, wenn der Nutzer schon verschoben hat (sonst „zurückgesetzt“)
          if (layoutModifiedRef.current) {
            return;
          }
          savedLayoutRef.current = withDynamicHeights.map(item => ({ ...item }));
          setLayout(withDynamicHeights);
        }
      }
      // If no saved layout on backend, use current default as baseline
      if (!savedLayoutRef.current) {
        savedLayoutRef.current = getDefaultLayout().map(item => ({ ...item }));
      }
    } catch (err) {
      console.error('Error loading layout:', err);
      if (!savedLayoutRef.current) {
        savedLayoutRef.current = getDefaultLayout().map(item => ({ ...item }));
      }
    }
  };

  const prevDashboard = useRef(null);

  // Initial load: Stats + Layout (optional Hydration aus ProxmoxGrid-Prefetch)
  useEffect(() => {
    if (!isLoggedIn || !activeDashboard) return;

    const dashboardChanged = prevDashboard.current !== activeDashboard;
    if (dashboardChanged) {
      prevDashboard.current = activeDashboard;
    }

    const pf = clusterStatsPrefetch;
    const prefetchOk =
      pf?.data &&
      String(pf.dashboardId) === String(activeDashboard);

    if (prefetchOk) {
      setError(null);
      applyStatsPayload(pf.data);
      setLoading(false);
      onClusterStatsPrefetchConsumed?.();
      layoutInitialized.current = false;
      void loadLayout();
      void loadVisibleCardsFromBackend();
      void fetchStats({ silent: true });
      return;
    }

    /* Nach Prefetch-Consume: clusterStatsPrefetch wird null — ohne diesen Guard
     * würde `!stats` (stale Closure) fälschlich die frischen Daten wieder löschen. */
    if (
      !prefetchOk &&
      !dashboardChanged &&
      clusterStatsPrefetch == null &&
      statsRef.current != null
    ) {
      return;
    }

    if (dashboardChanged) {
      setLoading(true);
      setStats(null);
      layoutModifiedRef.current = false;
      // Pro Dashboard einmal Ceph-Sichtbarkeit aus aktuellen Stats ableiten (hasUserConfigured bleibt: LS/Backend)
      cephAutoDetected.current = false;
    }
    layoutInitialized.current = false;
    void fetchStats({ silent: false });
    void loadLayout();
    void loadVisibleCardsFromBackend();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDashboard, isLoggedIn, clusterStatsPrefetch]);

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
        savedLayoutRef.current = layout.map(item => ({ ...item }));
        layoutModifiedRef.current = false;
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
        savedLayoutRef.current = newLayout.map(item => ({ ...item }));
        setLayout(newLayout);
        layoutModifiedRef.current = false;
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

  // Check if layout actually differs from saved baseline (position/size changes by user drag/resize)
  const hasLayoutChanged = (currentLayout) => {
    if (!savedLayoutRef.current) return false;
    const baseMap = new Map(savedLayoutRef.current.map(item => [item.i, item]));
    return currentLayout.some(item => {
      const base = baseMap.get(item.i);
      if (!base) return false; // new cards don't count as "modified"
      return item.x !== base.x || item.y !== base.y || item.w !== base.w || item.h !== base.h;
    });
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
      // Merge visible layout changes back into the full layout
      // (react-grid-layout only reports items currently rendered)
      setLayout(prev => {
        const updatedMap = new Map(newLayout.map(item => [item.i, item]));
        // Nur Position/Größe übernehmen — RGL liefert keine resizeHandles/min/max; sonst gehen die verloren
        const merged = prev.map(item => {
          const u = updatedMap.get(item.i);
          if (!u) return item;
          // Feste Höhe (minH === maxH): RGL liefert beim Breiten-Resize oft falsches h → Kompaktierung rutscht Karten
          const heightLocked =
            item.minH != null && item.maxH != null && item.minH === item.maxH;
          return {
            ...item,
            x: u.x,
            y: u.y,
            w: u.w,
            h: heightLocked ? item.h : u.h,
          };
        });
        // Erste Änderung vor abgeschlossenem loadLayout: sonst ist savedLayoutRef null → kein „modified“ → Server überschreibt Drag
        if (!savedLayoutRef.current) {
          savedLayoutRef.current = prev.map(item => ({ ...item }));
        }
        // Only show Save button if positions actually differ from saved layout
        const changed = hasLayoutChanged(merged);
        layoutModifiedRef.current = changed;
        setLayoutModified(changed);
        return merged;
      });
    }
  };

  // Track breakpoint changes
  const handleBreakpointChange = (newBreakpoint) => {
    currentBreakpoint.current = newBreakpoint;
  };

  // Update layout when top items setting changes
  useEffect(() => {
    const handleSettingsChange = () => {
      const newHeight = getTopCardHeight(activeDashboard);
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
  }, [activeDashboard]);

  // Auto-refresh mit konfigurierbarem Intervall
  useEffect(() => {
    if (!autoRefresh || !isLoggedIn) return;

    const refreshInterval = getProxmoxRefreshInterval(activeDashboard) * 1000;
    const interval = setInterval(() => {
      fetchStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, activeDashboard, isLoggedIn]);

  // Card Visibility Handlers
  const handleToggleCard = (cardId) => {
    setVisibleCards(prev => {
      const newVisible = prev.includes(cardId)
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId];
      saveVisibleCards(newVisible);
      hasUserConfigured.current = true;
      return newVisible;
    });
  };

  const handleShowAll = () => {
    const cephAvailable = stats?.ceph?.available === true;
    const allIds = getDefaultVisibleCards(cephAvailable);
    setVisibleCards(allIds);
    saveVisibleCards(allIds);
    hasUserConfigured.current = true;
  };

  const handleHideAll = () => {
    setVisibleCards([]);
    saveVisibleCards([]);
    hasUserConfigured.current = true;
  };

  // Gefilterte Layout-Items — nur neu berechnen, wenn sich Positionen/Höhen wirklich ändern
  // (nicht bei jeder neuen layout-Referenz), sonst reflowed RGL alle Karten bei jedem Poll.
  const visibleCardsSig = visibleCards.join(',');
  const filteredLayout = useMemo(() => {
    const visibleSet = new Set(visibleCards);
    return layoutRef.current.filter(item => visibleSet.has(item.i));
  }, [layoutPositionSig, visibleCardsSig, visibleCards]);

  const layoutsForRgl = useMemo(() => ({ lg: filteredLayout }), [filteredLayout]);

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

      case 'compute-cluster':
        return (
          <ClusterComputeCard
            key="compute-cluster"
            computeCluster={stats.compute_cluster}
            topNode={stats.top_node}
            topNodeMemory={stats.top_node_memory}
          />
        );
      
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

  if (loading) {
    return <ClusterStatsLoading />;
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
              type="button"
              onClick={() => fetchStats({ silent: false, resetLoading: true })}
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
      {/* Toolbar — einheitliche Glass-Bar mit Pill-Buttons */}
      <div className="relative z-50 flex items-center justify-end mb-6">
        <div className="flex items-center gap-1.5 p-1 rounded-xl dark:bg-white/[0.04] sd-night-tint backdrop-blur-md border border-gray-300/30 dark:border-white/[0.08] night:border-white/[0.07] shadow-lg">
          {/* Card Visibility Toggle */}
          <CardVisibilityPanel
            visibleCards={visibleCards}
            onToggle={handleToggleCard}
            onShowAll={handleShowAll}
            onHideAll={handleHideAll}
            cephAvailable={stats?.ceph?.available === true}
          />
          
          <div className="w-px h-5 bg-gray-300/40 dark:bg-white/10 night:bg-sd-night-800/80" />
          
          {/* Reset Layout */}
          <button
            onClick={resetLayout}
            className="glass-btn flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/40 dark:hover:bg-white/10 night:hover:bg-sd-night-800/90 text-sm text-gray-700 dark:text-gray-300 transition-all"
            title={t('statusDashboard.reset_layout')}
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
          >
            <ArrowCounterClockwise size={16} weight="bold" />
            <span className="hidden sm:inline">{t('statusDashboard.reset_layout')}</span>
          </button>
          
          {/* Save Layout (nur bei Änderungen) */}
          {layoutModified && (
            <>
              <div className="w-px h-5 bg-gray-300/40 dark:bg-white/10 night:bg-sd-night-800/80" />
              <button
                onClick={saveLayout}
                className="glass-btn flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/15 dark:bg-blue-400/10 night:bg-blue-950/40 hover:bg-blue-500/25 dark:hover:bg-blue-400/20 night:hover:bg-blue-950/55 text-sm text-blue-600 dark:text-blue-300 transition-all"
                title={t('statusDashboard.save_layout')}
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
              >
                <FloppyDisk size={16} weight="bold" />
                <span className="hidden sm:inline">{t('statusDashboard.save_layout')}</span>
              </button>
            </>
          )}
          
          <div className="w-px h-5 bg-gray-300/40 dark:bg-white/10 night:bg-sd-night-800/80" />
          
          {/* Auto-Refresh */}
          <label className="glass-btn flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-white/40 dark:hover:bg-white/10 night:hover:bg-sd-night-800/90">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-400 dark:border-white/30 text-blue-500 focus:ring-blue-500/30"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
              Auto-Refresh ({getProxmoxRefreshInterval(activeDashboard)}s)
            </span>
          </label>
          
          <div className="w-px h-5 bg-gray-300/40 dark:bg-white/10 night:bg-sd-night-800/80" />
          
          {/* Refresh */}
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="glass-btn p-2 rounded-lg hover:bg-white/40 dark:hover:bg-white/10 night:hover:bg-sd-night-800/90 transition-all disabled:opacity-50"
            title={t('common.refresh')}
          >
            <ArrowsClockwise size={18} weight="bold" className={`text-gray-700 dark:text-gray-300 transition-transform ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {saveStatus.message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          saveStatus.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 night:bg-emerald-950/45 text-green-800 dark:text-green-300 night:text-emerald-200' :
          saveStatus.type === 'error' ? 'bg-red-100 dark:bg-red-900/30 night:bg-red-950/45 text-red-800 dark:text-red-300 night:text-red-200' :
          'bg-blue-100 dark:bg-blue-900/30 night:bg-blue-950/45 text-blue-800 dark:text-blue-300 night:text-blue-200'
        }`}>
          {saveStatus.message}
        </div>
      )}

      {/* React Grid Layout */}
      {filteredLayout.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
          <Eye size={48} weight="duotone" className="mb-3 opacity-50" />
          <p className="text-lg font-medium">{t('statusDashboard.no_cards_visible')}</p>
        </div>
      ) : (
        <ResponsiveGridLayout
          className="layout"
          layouts={layoutsForRgl}
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
          {filteredLayout.map(item => (
            <div key={item.i}>
              {renderCard(item.i)}
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </>
  );
}

export default ProxmoxStatusDashboard;
