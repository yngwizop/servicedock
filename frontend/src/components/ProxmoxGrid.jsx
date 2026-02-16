import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ProxmoxCard from './ProxmoxCard';
import ProxmoxStatsCards from './ProxmoxStatsCards';
import ProxmoxStatusDashboard from './ProxmoxStatusDashboard';
import { ArrowsClockwise, WarningCircle, GearSix, LockKey, FunnelSimple, SortAscending, MagnifyingGlass, MonitorPlay, Desktop, ChartBar } from 'phosphor-react';
import CustomSelect from './CustomSelect';
import { authenticatedFetch } from '../utils/auth';

// Backend-URL: Mit Nginx kein Port, ohne Nginx Port 8000
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
  (window.location.port === '' ? 
    `${window.location.protocol}//${window.location.hostname}` :
    `${window.location.protocol}//${window.location.hostname}:8000`
  );

function ProxmoxGrid({ isLoggedIn, textColor, onOpenSettings, activeDashboard, searchTerm = "" }) {
  const { t } = useTranslation();
  // Sub-Navigation State
  const [activeView, setActiveView] = useState('resources'); // 'resources' oder 'status'
  
  const [resources, setResources] = useState([]);
  const [nodes, setNodes] = useState([]); // NEU: Node-Informationen
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [proxmoxName, setProxmoxName] = useState(''); // NEU: Cluster/Server Name
  const [isCluster, setIsCluster] = useState(false); // NEU: Ist es ein Cluster?
  
  // Filter & Sort States
  const [sortBy, setSortBy] = useState('name-asc'); // name-asc, name-desc, status, type
  const [filterType, setFilterType] = useState('all'); // all, qemu, lxc
  const [filterStatus, setFilterStatus] = useState('all'); // all, running, stopped

  // Lade Proxmox-Daten
  const fetchProxmoxData = async (dashboardId) => {
    // dashboardId als Parameter, um stale closure zu vermeiden
    const currentDashboard = dashboardId ?? activeDashboard;
    
    try {
      setError(null);
      
      // Prüfe erst, ob Proxmox konfiguriert ist
      const configRes = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/config?dashboard_id=${currentDashboard}`);
      const configData = await configRes.json();
      
      if (!configData.configured) {
        setIsConfigured(false);
        setResources([]); // ✅ Leere die alten Daten
        setNodes([]); // ✅ Leere die alten Node-Daten
        setProxmoxName(''); // ✅ Leere den Namen
        setIsCluster(false);
        setLoading(false);
        return;
      }
      
      setIsConfigured(true);
      setIsCluster(configData.is_cluster || false);
      
      // Hole VM/LXC Daten
      const res = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/vms?dashboard_id=${currentDashboard}`);
      
      if (!res.ok) {
        // Versuche detaillierte Fehlermeldung vom Backend zu holen
        try {
          const errorData = await res.json();
          throw new Error(errorData.detail || 'Failed to fetch Proxmox data');
        } catch (jsonErr) {
          throw new Error(`HTTP ${res.status}: Failed to fetch Proxmox data`);
        }
      }
      
      const data = await res.json();
      setResources(data.resources || []);
      setNodes(data.nodes || []); // NEU: Speichere Node-Daten
      
      // Setze den Namen basierend auf Modus und API-Daten
      if (configData.is_cluster) {
        // Cluster: Nutze Clusternamen vom Backend
        setProxmoxName(data.cluster_name || 'Cluster');
      } else {
        // Standalone: Nutze ersten Node-Namen aus nodes array
        if (data.nodes && data.nodes.length > 0) {
          setProxmoxName(data.nodes[0].node || 'Server');
        } else {
          setProxmoxName('Server');
        }
      }
    } catch (err) {
      console.error('Error fetching Proxmox data:', err);
      setError(err.message || 'Failed to connect to Proxmox');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (isLoggedIn) {
      // ✅ Beim Dashboard-Wechsel sofort Daten zurücksetzen
      setLoading(true);
      setResources([]);
      setNodes([]);
      fetchProxmoxData(activeDashboard); // Explizit dashboard_id übergeben
    }
  }, [isLoggedIn, activeDashboard]);

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
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg p-8 text-center">
          <WarningCircle size={64} className="mx-auto mb-4 text-yellow-500" />
          <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">
            {t('proxmox.not_configured')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
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
      {/* Header - ÜBER den Stats Cards */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MonitorPlay size={40} weight="duotone" style={{ color: textColor }} />
          <h2 
            className="text-3xl font-bold transition-colors duration-300"
            style={{ 
              color: textColor,
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)'
            }}
          >
            Proxmox Monitoring{proxmoxName ? ` - ${proxmoxName}` : ''}
          </h2>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Auto-Refresh Toggle (nur bei VM/LXC View) */}
          {activeView === 'resources' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                {t('proxmox.auto_refresh', { seconds: 30 })}
              </span>
            </label>
          )}
          
          {/* Manual Refresh Button (nur bei VM/LXC View) */}
          {activeView === 'resources' && (
            <button
              onClick={() => fetchProxmoxData(activeDashboard)}
              className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-md p-2 rounded-lg shadow hover:shadow-lg transition-all hover:scale-105"
              title={t('common.refresh')}
            >
              <ArrowsClockwise size={20} className="text-gray-700 dark:text-gray-300" />
            </button>
          )}
          
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="mb-6">
        <div className="flex gap-2 border-b border-gray-300/50 dark:border-white/10">
          <button
            onClick={() => setActiveView('resources')}
            className={`
              px-6 py-3 font-semibold transition-all relative
              ${activeView === 'resources' 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <Desktop size={20} weight={activeView === 'resources' ? 'fill' : 'regular'} />
              <span>VM/LXC</span>
            </div>
            {activeView === 'resources' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
            )}
          </button>

          <button
            onClick={() => setActiveView('status')}
            className={`
              px-6 py-3 font-semibold transition-all relative
              ${activeView === 'status' 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <ChartBar size={20} weight={activeView === 'status' ? 'fill' : 'regular'} />
              <span>{t('proxmox.status_overview')}</span>
            </div>
            {activeView === 'status' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
            )}
          </button>
        </div>
      </div>

      {/* Content basierend auf aktiver View */}
      {activeView === 'status' ? (
        <>
          {/* Hinweis wenn Suche aktiv aber in Status-View */}
          {searchTerm && (
            <div className="mb-4 bg-yellow-500/20 dark:bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span className="text-sm font-medium">{t('proxmox.search_unavailable')}</span>
              </div>
            </div>
          )}
          <ProxmoxStatusDashboard 
            activeDashboard={activeDashboard}
            isLoggedIn={isLoggedIn}
            textColor={textColor}
          />
        </>
      ) : (
        <>
          {/* System Stats Cards - NACH der Überschrift */}
          <ProxmoxStatsCards resources={resources} nodes={nodes} />

      {/* Filter & Sort Bar */}
      <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-md rounded-xl shadow-lg p-4 mb-6 border border-gray-300/50 dark:border-white/[0.12]">
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
              className="px-3 py-2 text-sm bg-white/40 dark:bg-white/10 backdrop-blur-md hover:bg-white/60 dark:hover:bg-white/20 text-gray-950 dark:text-white/90 rounded-lg transition-all border border-gray-300/50 dark:border-white/10"
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
          {filteredResources.map((resource) => (
            <ProxmoxCard
              key={resource.id}
              resource={resource}
              onStart={handleStart}
              onStop={handleStop}
              onReboot={handleReboot}
              isAdmin={isLoggedIn}
            />
          ))}
        </div>
      )}
        </>
      )}
    </div>
  );
}

export default ProxmoxGrid;
