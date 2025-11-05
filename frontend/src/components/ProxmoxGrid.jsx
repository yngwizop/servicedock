import React, { useEffect, useState } from 'react';
import ProxmoxCard from './ProxmoxCard';
import { ArrowsClockwise, WarningCircle, GearSix } from 'phosphor-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:8000`;

function ProxmoxGrid({ isLoggedIn, onOpenSettings }) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Lade Proxmox-Daten
  const fetchProxmoxData = async () => {
    try {
      setError(null);
      
      // Prüfe erst, ob Proxmox konfiguriert ist
      const configRes = await fetch(`${BACKEND_URL}/api/proxmox/config`);
      const configData = await configRes.json();
      
      if (!configData.configured) {
        setIsConfigured(false);
        setLoading(false);
        return;
      }
      
      setIsConfigured(true);
      
      // Hole VM/LXC Daten
      const res = await fetch(`${BACKEND_URL}/api/proxmox/vms`);
      
      if (!res.ok) {
        throw new Error('Failed to fetch Proxmox data');
      }
      
      const data = await res.json();
      setResources(data.resources || []);
    } catch (err) {
      console.error('Error fetching Proxmox data:', err);
      setError(err.message || 'Failed to connect to Proxmox');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchProxmoxData();
  }, []);

  // Auto-refresh alle 30 Sekunden
  useEffect(() => {
    if (!autoRefresh || !isConfigured) return;
    
    const interval = setInterval(() => {
      fetchProxmoxData();
    }, 30000); // 30 Sekunden

    return () => clearInterval(interval);
  }, [autoRefresh, isConfigured]);

  // VM/Container Aktionen
  const handleStart = async (vmid, type) => {
    try {
      await fetch(`${BACKEND_URL}/api/proxmox/vm/${vmid}/start?vm_type=${type}`, {
        method: 'POST'
      });
      // Reload nach kurzer Verzögerung, damit Proxmox den Status aktualisiert hat
      setTimeout(fetchProxmoxData, 2000);
    } catch (err) {
      console.error('Failed to start VM:', err);
      alert('Failed to start VM/Container');
    }
  };

  const handleStop = async (vmid, type) => {
    try {
      await fetch(`${BACKEND_URL}/api/proxmox/vm/${vmid}/stop?vm_type=${type}`, {
        method: 'POST'
      });
      setTimeout(fetchProxmoxData, 2000);
    } catch (err) {
      console.error('Failed to stop VM:', err);
      alert('Failed to stop VM/Container');
    }
  };

  const handleReboot = async (vmid, type) => {
    try {
      await fetch(`${BACKEND_URL}/api/proxmox/vm/${vmid}/reboot?vm_type=${type}`, {
        method: 'POST'
      });
      setTimeout(fetchProxmoxData, 2000);
    } catch (err) {
      console.error('Failed to reboot VM:', err);
      alert('Failed to reboot VM/Container');
    }
  };

  // Nicht konfiguriert
  if (!isConfigured && !loading) {
    return (
      <div className="max-w-4xl mx-auto mt-12">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg p-8 text-center">
          <WarningCircle size={64} className="mx-auto mb-4 text-yellow-500" />
          <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">
            Proxmox nicht konfiguriert
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Bitte konfiguriere die Proxmox-Verbindung in den Einstellungen.
          </p>
          {isLoggedIn && (
            <button
              onClick={onOpenSettings}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2 mx-auto"
            >
              <GearSix size={20} />
              <span>Einstellungen öffnen</span>
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
              Fehler beim Laden
            </h3>
          </div>
          <p className="text-red-700 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchProxmoxData}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header mit Refresh-Button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Proxmox Monitoring
          </h2>
          <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-semibold">
            {resources.length} {resources.length === 1 ? 'Resource' : 'Resources'}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Auto-Refresh Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Auto-Refresh (30s)
            </span>
          </label>
          
          {/* Manual Refresh Button */}
          <button
            onClick={fetchProxmoxData}
            className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-md p-2 rounded-lg shadow hover:shadow-lg transition-all hover:scale-105"
            title="Aktualisieren"
          >
            <ArrowsClockwise size={20} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Grid mit VMs/LXCs */}
      {resources.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Keine VMs oder Container gefunden
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((resource) => (
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
    </div>
  );
}

export default ProxmoxGrid;
