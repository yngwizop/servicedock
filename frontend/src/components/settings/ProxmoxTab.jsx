import React from 'react';

function ProxmoxTab({
  proxmoxConfig,
  setProxmoxConfig,
  savedTokenName,
  isSavingProxmox,
  proxmoxSaved,
  handleSaveProxmox
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Proxmox Konfiguration</h3>
      
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
          <strong>📋 Wichtig:</strong> Du benötigst einen API Token von deinem Proxmox-Server.
        </p>
        <p className="text-sm text-blue-700 dark:text-blue-400">
          Erstelle den Token in Proxmox unter: <strong>Datacenter → Permissions → API Tokens</strong>
        </p>
      </div>

      <form onSubmit={handleSaveProxmox} className="space-y-4">
        {/* Proxmox Host */}
        <div>
          <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
            Proxmox Host/IP
          </label>
          <input
            type="text"
            value={proxmoxConfig.host}
            onChange={(e) => setProxmoxConfig({ ...proxmoxConfig, host: e.target.value })}
            placeholder="z.B. 192.168.1.100 oder pve.example.com"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Port */}
        <div>
          <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
            Port
          </label>
          <input
            type="number"
            value={proxmoxConfig.port}
            onChange={(e) => setProxmoxConfig({ ...proxmoxConfig, port: parseInt(e.target.value) })}
            placeholder="8006"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Token Name */}
        <div>
          <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
            API Token Name
          </label>
          <input
            type="text"
            value={proxmoxConfig.token_name}
            onChange={(e) => setProxmoxConfig({ ...proxmoxConfig, token_name: e.target.value })}
            placeholder={savedTokenName || "z.B. root@pam!mytoken"}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            required
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Format: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">user@realm!tokenname</code>
            {savedTokenName && (
              <span className="ml-2 text-blue-500">
                (Aktuell: {savedTokenName})
              </span>
            )}
          </p>
        </div>

        {/* Token Secret */}
        <div>
          <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
            API Token Secret
          </label>
          <input
            type="password"
            value={proxmoxConfig.token_value}
            onChange={(e) => setProxmoxConfig({ ...proxmoxConfig, token_value: e.target.value })}
            placeholder="********-****-****-****-************"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            required={!proxmoxConfig.host}
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Der Secret wird nur beim ersten Einrichten oder beim Ändern benötigt
          </p>
        </div>

        {/* Node (Optional) */}
        <div>
          <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
            Node Name (optional)
          </label>
          <input
            type="text"
            value={proxmoxConfig.node}
            onChange={(e) => setProxmoxConfig({ ...proxmoxConfig, node: e.target.value })}
            placeholder="z.B. pve oder leer für alle Nodes"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Leer lassen, um VMs/LXCs von allen Nodes anzuzeigen
          </p>
        </div>

        {/* SSL Verification */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <input
            type="checkbox"
            id="verify_ssl"
            checked={proxmoxConfig.verify_ssl}
            onChange={(e) => setProxmoxConfig({ ...proxmoxConfig, verify_ssl: e.target.checked })}
            className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
          />
          <label htmlFor="verify_ssl" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            SSL-Zertifikat verifizieren
          </label>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2 ml-1">
          ⚠️ Deaktiviere dies nur bei self-signed Zertifikaten
        </p>

        {/* Save Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSavingProxmox}
            className={`bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg w-full font-medium transition-colors shadow-md hover:shadow-lg ${
              isSavingProxmox ? 'opacity-70 cursor-wait' : ''
            }`}
          >
            {isSavingProxmox ? 'Wird gespeichert...' : proxmoxSaved ? '✓ Gespeichert' : 'Konfiguration speichern'}
          </button>
        </div>
      </form>

      {/* Info */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
        <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">
          🔒 Sicherheitshinweis
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Der API Token wird verschlüsselt in der Datenbank gespeichert. 
          Stelle sicher, dass der Token nur die minimal notwendigen Berechtigungen hat.
        </p>
      </div>
    </div>
  );
}

export default ProxmoxTab;
