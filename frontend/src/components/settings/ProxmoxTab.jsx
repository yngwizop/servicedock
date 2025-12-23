import React from 'react';
import ProxmoxConnectionCard from './ProxmoxConnectionCard';
import ProxmoxDashboardSettingsCard from './ProxmoxDashboardSettingsCard';

/**
 * Proxmox Settings Tab - Haupt-Container
 * Zeigt zwei Cards: Verbindungseinstellungen und Dashboard-Einstellungen
 */
function ProxmoxTab({ activeDashboard, onSettingsChange }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Proxmox Einstellungen
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Konfiguriere deine Proxmox-Verbindung und passe das Monitoring-Dashboard an
        </p>
      </div>

      {/* Connection Card */}
      <ProxmoxConnectionCard 
        activeDashboard={activeDashboard}
        onSettingsChange={onSettingsChange}
      />

      {/* Dashboard Settings Card */}
      <ProxmoxDashboardSettingsCard />
    </div>
  );
}

export default ProxmoxTab;
