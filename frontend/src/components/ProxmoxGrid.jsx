import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import ProxmoxCard from './ProxmoxCard';
import ProxmoxStatsCards from './ProxmoxStatsCards';
import ProxmoxStatusDashboard from './ProxmoxStatusDashboard';
import { ArrowsClockwise, WarningCircle, GearSix, LockKey, FunnelSimple, SortAscending, MagnifyingGlass, MonitorPlay, Desktop, ChartBar } from 'phosphor-react';
import CustomSelect from './CustomSelect';
import { authenticatedFetch } from '../utils/auth';
import { fetchProxmoxVmBundle, fetchProxmoxClusterStatsPrefetch } from '../utils/fetchProxmoxBundle';
import { BACKEND_URL } from '../utils/backendUrl';

function ProxmoxGrid({ isLoggedIn, textColor, onOpenSettings, activeDashboard, searchTerm = "", isAdmin = true, proxmoxWarm = null }) {
  const { t } = useTranslation();
  // Sub-Navigation State
  const [activeView, setActiveView] = useState('resources'); // 'resources' oder 'status'
  const [pillStyle, setPillStyle] = useState(null); // null = noch nicht gemessen
  
  // Pill-Position messen — wird als ref-Callback genutzt UND bei activeView-Wechsel
  const segmentContainerRef = useRef(null);
  const measurePill = useCallback((view) => {
    const container = segmentContainerRef.current;
    if (!container) return;
    // Finde den aktiven Button anhand data-view
    const btn = container.querySelector(`[data-view="${view || activeView}"]`);
    if (btn) {
      const parentRect = container.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      setPillStyle({
        left: btnRect.left - parentRect.left,
        width: btnRect.width,
      });
    }
  }, [activeView]);

  // Ref-Callback: Misst sofort wenn der Container erstmals ins DOM kommt
  const segmentRefCallback = useCallback((node) => {
    segmentContainerRef.current = node;
    if (node) {
      // Sofort messen
      const btn = node.querySelector(`[data-view="${activeView}"]`);
      if (btn) {
        const parentRect = node.getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();
        setPillStyle({
          left: btnRect.left - parentRect.left,
          width: btnRect.width,
        });
      }
    }
  }, [activeView]);

  // Bei Tab-Wechsel Pill neu messen
  useEffect(() => {
    measurePill(activeView);
  }, [activeView, measurePill]);

  // Tab-Wechsel mit Animation
  const switchView = (view) => {
    if (view === activeView) return;
    setActiveView(view);
  };
  
  const [resources, setResources] = useState([]);
  const [nodes, setNodes] = useState([]); // NEU: Node-Informationen
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [proxmoxName, setProxmoxName] = useState(''); // NEU: Cluster/Server Name
  const [isCluster, setIsCluster] = useState(false); // NEU: Ist es ein Cluster?
  /** Parallel zur Workloads-Liste geladene Cluster-Stats (Cluster-Status), damit der Tab nicht erst beim Klick 5s wartet */
  const [clusterStatsPrefetch, setClusterStatsPrefetch] = useState(null);

  // Filter & Sort States
  const [sortBy, setSortBy] = useState('name-asc'); // name-asc, name-desc, status, type
  const [filterType, setFilterType] = useState('all'); // all, qemu, lxc
  const [filterStatus, setFilterStatus] = useState('all'); // all, running, stopped

  // Workloads zuerst (schnell), cluster-stats danach im Hintergrund (Cluster-Status / Prefetch)
  const fetchProxmoxData = async (dashboardId, options = {}) => {
    const { resetForLoad = true } = options;
    const currentDashboard = dashboardId ?? activeDashboard;
    let runStatsPrefetch = false;

    if (resetForLoad) {
      setClusterStatsPrefetch(null);
      setError(null);
    }

    try {
      const bundle = await fetchProxmoxVmBundle(currentDashboard);

      if (!bundle.configured) {
        setIsConfigured(false);
        setResources([]);
        setNodes([]);
        setProxmoxName('');
        setIsCluster(false);
        setClusterStatsPrefetch(null);
        setLoading(false);
        return;
      }

      setIsConfigured(true);

      if (!bundle.ok) {
        setResources([]);
        setNodes([]);
        setProxmoxName('');
        setIsCluster(false);
        setClusterStatsPrefetch(null);
        setError(bundle.error || 'Failed to load Proxmox');
        setLoading(false);
        return;
      }

      setIsCluster(bundle.isCluster);
      setResources(bundle.resources);
      setNodes(bundle.nodes);
      setProxmoxName(bundle.proxmoxName);
      setError(null);
      runStatsPrefetch = true;
    } catch (err) {
      console.error('Error fetching Proxmox data:', err);
      setError(err.message || 'Failed to connect to Proxmox');
    } finally {
      setLoading(false);
    }

    if (runStatsPrefetch) {
      void fetchProxmoxClusterStatsPrefetch(currentDashboard).then((pref) => {
        if (pref) setClusterStatsPrefetch(pref);
      });
    }
  };

  // Initial load / Dashboard-Wechsel — bei fertigem App-Warmup sofort anzeigen, ohne leeren Zwischenstand
  useEffect(() => {
    if (!isLoggedIn) return;

    const rid = activeDashboard;
    const warm = proxmoxWarm;
    const warmReady =
      warm?.status === 'ready' &&
      warm?.bundle &&
      String(warm.dashboardId) === String(rid);

    if (warmReady) {
      const b = warm.bundle;
      if (!b.configured) {
        setIsConfigured(false);
        setResources([]);
        setNodes([]);
        setProxmoxName('');
        setIsCluster(false);
        setClusterStatsPrefetch(null);
        setError(null);
        setLoading(false);
        return;
      }
      if (!b.ok && b.error) {
        setIsConfigured(true);
        setResources([]);
        setNodes([]);
        setProxmoxName('');
        setIsCluster(false);
        setClusterStatsPrefetch(null);
        setError(b.error);
        setLoading(false);
        return;
      }
      setIsConfigured(true);
      setIsCluster(b.isCluster);
      setResources(b.resources);
      setNodes(b.nodes);
      setProxmoxName(b.proxmoxName);
      setClusterStatsPrefetch(b.clusterStatsPrefetch || null);
      setError(null);
      setLoading(false);
      void fetchProxmoxData(rid, { resetForLoad: false });
      return;
    }

    setLoading(true);
    setResources([]);
    setNodes([]);
    void fetchProxmoxData(rid, { resetForLoad: true });
  }, [isLoggedIn, activeDashboard, proxmoxWarm?.status, proxmoxWarm?.dashboardId]);

  // Warmup: cluster-stats trifft nach VM-Bundle ein — Prefetch in den Grid-State übernehmen
  useEffect(() => {
    const pref = proxmoxWarm?.bundle?.clusterStatsPrefetch;
    if (!pref || String(pref.dashboardId) !== String(activeDashboard)) return;
    setClusterStatsPrefetch(pref);
  }, [proxmoxWarm?.bundle?.clusterStatsPrefetch, activeDashboard]);

  // Auto-refresh alle 30 Sekunden
  useEffect(() => {
    if (!autoRefresh || !isConfigured || !isLoggedIn) return;
    
    const interval = setInterval(() => {
      fetchProxmoxData(activeDashboard); // Explizit dashboard_id übergeben
    }, 30000); // 30 Sekunden

    return () => clearInterval(interval);
  }, [autoRefresh, isConfigured, isLoggedIn, activeDashboard]); // ✅ activeDashboard wieder hinzugefügt

  // Login-Check: Nur für Admins (NACH allen Hooks!)
  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <LockKey size={64} className="text-gray-400 dark:text-gray-600" weight="duotone" />
        <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">
          Proxmox Monitoring
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
          {t('proxmox.admin_required')}
        </p>
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-500">
          {t('proxmox.admin_only')}
        </div>
      </div>
    );
  }

  // VM/Container Aktionen
  const handleStart = async (vmid, type) => {
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/vm/${vmid}/start?vm_type=${type}&dashboard_id=${activeDashboard}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to start VM/Container');
      }
      
      // Reload nach kurzer Verzögerung, damit Proxmox den Status aktualisiert hat
      setTimeout(() => fetchProxmoxData(activeDashboard), 2000);
    } catch (err) {
      console.error('Failed to start VM:', err);
      alert(`Failed to start VM/Container: ${err.message}`);
    }
  };

  const handleStop = async (vmid, type) => {
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/vm/${vmid}/stop?vm_type=${type}&dashboard_id=${activeDashboard}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to stop VM/Container');
      }
      
      setTimeout(() => fetchProxmoxData(activeDashboard), 2000);
    } catch (err) {
      console.error('Failed to stop VM:', err);
      alert(`Failed to stop VM/Container: ${err.message}`);
    }
  };

  const handleReboot = async (vmid, type) => {
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/vm/${vmid}/reboot?vm_type=${type}&dashboard_id=${activeDashboard}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to reboot VM/Container');
      }
      
      setTimeout(() => fetchProxmoxData(activeDashboard), 2000);
    } catch (err) {
      console.error('Failed to reboot VM:', err);
      alert(`Failed to reboot VM/Container: ${err.message}`);
    }
  };

  // Filter und Sortier-Logik
  const getFilteredAndSortedResources = () => {
    let filtered = [...resources];
    
    // Globale Suche nach Name oder VM-ID
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(query) || 
        r.vmid.toString().includes(query) ||
        r.node.toLowerCase().includes(query)
      );
    }
    
    // Filter nach Typ
    if (filterType !== 'all') {
      filtered = filtered.filter(r => r.type === filterType);
    }
    
    // Filter nach Status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus);
    }
    
    // Sortierung
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'status':
          // Running zuerst, dann stopped
          if (a.status === b.status) return a.name.localeCompare(b.name);
          return a.status === 'running' ? -1 : 1;
        case 'type':
          // QEMU zuerst, dann LXC
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === 'qemu' ? -1 : 1;
        case 'vmid-asc':
          return a.vmid - b.vmid;
        case 'vmid-desc':
          return b.vmid - a.vmid;
        default:
          return 0;
      }
    });
    
    return filtered;
  };

  const filteredResources = getFilteredAndSortedResources();

  // Nicht konfiguriert
  if (!isConfigured && !loading) {
    return (
      <div className="max-w-4xl mx-auto mt-12">
        <div className="bg-slate-900/85 dark:bg-slate-950/90 night:bg-sd-night-950/88 backdrop-blur-sm rounded-xl shadow-lg p-8 text-center border border-white/10 dark:border-white/8 night:border-white/[0.05]">
          <WarningCircle size={64} className="mx-auto mb-4 text-yellow-500" />
          <h2 className="text-2xl font-bold mb-2 text-white">
            {t('proxmox.not_configured')}
          </h2>
          <p className="text-gray-400 dark:text-gray-500 mb-6">
            {t('proxmox.configure_hint')}
          </p>
          {isLoggedIn && (
            <button
              onClick={onOpenSettings}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2 mx-auto"
            >
              <GearSix size={20} />
              <span>{t('proxmox.open_settings')}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 py-16 px-4">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500/30 border-t-blue-500" aria-hidden />
        <p
          className="text-sm text-gray-600 dark:text-gray-300 max-w-md text-center"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}
        >
          {t('proxmox.loading_proxmox')}
        </p>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-12">
        <div className="bg-red-50 dark:bg-red-900/20 night:bg-red-950/40 border border-red-200 dark:border-red-800 night:border-red-900/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <WarningCircle size={24} className="text-red-600 dark:text-red-400" />
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">
              {t('proxmox.error_loading')}
            </h3>
          </div>
          <div className="text-red-700 dark:text-red-400 mb-4 whitespace-pre-wrap">{error}</div>
          <div className="flex gap-3">
            <button
              onClick={() => fetchProxmoxData(activeDashboard)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all"
            >
              {t('common.retry')}
            </button>
            <button
              onClick={onOpenSettings}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2"
            >
              <GearSix size={18} />
              {t('proxmox.open_settings')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Glass Control Bar — Segment Tabs + Cluster Badge + Controls */}
      <div className="flex items-center justify-between mb-6 gap-4">
        {/* Left: Glass Segment Control + Cluster Badge */}
        <div className="flex items-center gap-3">
          {/* Segment Control */}
          <div ref={segmentRefCallback} className="relative flex p-1 rounded-xl dark:bg-white/[0.06] sd-night-shade backdrop-blur-md border border-gray-300/40 dark:border-white/10 night:border-white/[0.08] shadow-lg">
            {/* Sliding Pill Indicator — misst echte Button-Breiten */}
            {pillStyle && (
              <div
                className="absolute top-1 bottom-1 rounded-lg dark:bg-white/15 night:!bg-sd-night-950/90 shadow-md transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{
                  left: pillStyle.left,
                  width: pillStyle.width,
                }}
              />
            )}
            
            <button
              data-view="resources"
              onClick={() => switchView('resources')}
              className={`relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200 ${
                activeView === 'resources'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <Desktop size={18} weight={activeView === 'resources' ? 'fill' : 'regular'} />
              <span>{t('proxmox.workloads_tab')}</span>
            </button>

            <button
              data-view="status"
              onClick={() => switchView('status')}
              className={`relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200 ${
                activeView === 'status'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <ChartBar size={18} weight={activeView === 'status' ? 'fill' : 'regular'} />
              <span>{t('proxmox.cluster_status_tab')}</span>
            </button>
          </div>

          {/* Cluster Badge */}
          {proxmoxName && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl dark:bg-white/[0.04] sd-night-tint backdrop-blur-md border border-gray-300/30 dark:border-white/[0.08] night:border-white/[0.07]">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                {proxmoxName}
              </span>
            </div>
          )}
        </div>

        {/* Right: Controls Bar — wraps per-view controls in a glass bar */}
        {activeView === 'resources' && (
          <div className="flex items-center gap-1.5 p-1 rounded-xl dark:bg-white/[0.04] sd-night-tint backdrop-blur-md border border-gray-300/30 dark:border-white/[0.08] night:border-white/[0.07] shadow-lg">
            <label className="glass-btn flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-white/40 dark:hover:bg-white/10 night:hover:bg-sd-night-800/90">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-400 dark:border-white/30 text-blue-500 focus:ring-blue-500/30"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                {t('proxmox.auto_refresh', { seconds: 30 })}
              </span>
            </label>
            
            <div className="w-px h-5 bg-gray-300/50 dark:bg-white/10 night:bg-sd-night-800/80" />
            
            <button
              onClick={() => fetchProxmoxData(activeDashboard)}
              className="glass-btn p-2 rounded-lg hover:bg-white/40 dark:hover:bg-white/10 night:hover:bg-sd-night-800/90"
              title={t('common.refresh')}
            >
              <ArrowsClockwise size={18} weight="bold" className="text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        )}
      </div>

      {/* Content mit Crossfade-Animation */}

      {/* Status Dashboard - bleibt IMMER gemounted (display:none/block) */}
      <div style={{ display: activeView === 'status' ? 'block' : 'none' }}>
          {/* Hinweis wenn Suche aktiv aber in Status-View */}
          {searchTerm && activeView === 'status' && (
            <div className="mb-4 bg-yellow-500/20 dark:bg-yellow-500/10 night:bg-yellow-950/30 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span className="text-sm font-medium">
                  {t('proxmox.search_unavailable', { tab: t('proxmox.workloads_tab') })}
                </span>
              </div>
            </div>
          )}
          <ProxmoxStatusDashboard 
            activeDashboard={activeDashboard}
            isLoggedIn={isLoggedIn}
            textColor={textColor}
            clusterStatsPrefetch={clusterStatsPrefetch}
            onClusterStatsPrefetchConsumed={() => setClusterStatsPrefetch(null)}
          />
      </div>

      {/* Workloads (VM-/LXC-Liste) */}
      <div style={{ display: activeView !== 'status' ? 'block' : 'none' }}>
          {/* System Stats Cards */}
          <ProxmoxStatsCards resources={resources} nodes={nodes} />

      {/* Filter & Sort Bar */}
      <div className="dark:bg-white/[0.12] sd-night-surface backdrop-blur-md rounded-xl shadow-lg night:shadow-black/40 p-4 mb-6 border border-gray-400/60 dark:border-white/10 night:border-white/[0.07]">
        <div className="flex flex-wrap items-center gap-4">
          {/* Sort Icon */}
          <div className="flex items-center gap-2">
            <SortAscending size={20} className="text-gray-950 dark:text-white/90" />
            <span className="text-sm font-semibold text-gray-950 dark:text-white/90" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>Filter & Sort:</span>
          </div>

          {/* Hinweis zur globalen Suche */}
          {searchTerm && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 dark:bg-blue-500/20 border border-blue-500/30 rounded-lg">
              <MagnifyingGlass size={16} className="text-blue-600 dark:text-blue-400" />
              <span className="text-xs text-blue-600 dark:text-blue-400">Suche aktiv: "{searchTerm}"</span>
            </div>
          )}

          {/* Sortierung */}
          <CustomSelect
            value={sortBy}
            onChange={(val) => setSortBy(val)}
            options={[
              { value: 'name-asc', label: 'Name A-Z' },
              { value: 'name-desc', label: 'Name Z-A' },
              { value: 'vmid-asc', label: t('proxmox.sort_id_asc') },
              { value: 'vmid-desc', label: t('proxmox.sort_id_desc') },
              { value: 'status', label: t('proxmox.sort_status') },
              { value: 'type', label: t('proxmox.sort_type') },
            ]}
            className="w-44"
          />

          {/* Typ Filter */}
          <CustomSelect
            value={filterType}
            onChange={(val) => setFilterType(val)}
            options={[
              { value: 'all', label: t('proxmox.filter_all_types') },
              { value: 'qemu', label: t('proxmox.filter_vms') },
              { value: 'lxc', label: t('proxmox.filter_containers') },
            ]}
            className="w-36"
          />

          {/* Status Filter */}
          <CustomSelect
            value={filterStatus}
            onChange={(val) => setFilterStatus(val)}
            options={[
              { value: 'all', label: t('proxmox.filter_all_status') },
              { value: 'running', label: t('proxmox.filter_running') },
              { value: 'stopped', label: t('proxmox.filter_stopped') },
            ]}
            className="w-36"
          />

          {/* Reset Button */}
          {(searchTerm || sortBy !== 'name-asc' || filterType !== 'all' || filterStatus !== 'all') && (
            <button
              onClick={() => {
                setSortBy('name-asc');
                setFilterType('all');
                setFilterStatus('all');
              }}
              className="px-3 py-2 text-sm dark:bg-white/10 sd-night-muted backdrop-blur-md hover:bg-white/60 dark:hover:bg-white/20 night:hover:bg-sd-night-800/95 text-gray-950 dark:text-white/90 rounded-lg transition-all border border-gray-300/50 dark:border-white/10 night:border-white/[0.07]"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Grid mit VMs/LXCs - NOCH SCHMALER mit bis zu 6 Spalten! */}
      {filteredResources.length === 0 ? (
        <div className="text-center py-12">
          <FunnelSimple size={48} className="mx-auto mb-3 text-gray-400 dark:text-gray-600" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            {resources.length === 0 
              ? t('proxmox.no_vms') 
              : searchTerm 
                ? t('proxmox.no_search_results', { term: searchTerm })
                : t('proxmox.no_filter_results')}
          </p>
          {(searchTerm || filterType !== 'all' || filterStatus !== 'all') && (
            <button
              onClick={() => {
                setFilterType('all');
                setFilterStatus('all');
              }}
              className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all"
            >
              {t('proxmox.reset_filters')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
          {filteredResources.map((resource, index) => (
            <ProxmoxCard
              key={resource.id}
              resource={resource}
              onStart={handleStart}
              onStop={handleStop}
              onReboot={handleReboot}
              isAdmin={isAdmin}
              animationDelay={Math.min(index * 0.04, 0.4)}
            />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

export default ProxmoxGrid;
