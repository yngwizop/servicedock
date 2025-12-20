import React from 'react';

function ProxmoxTab({
  proxmoxConfig,
  setProxmoxConfig,
  savedTokenName,
  isSavingProxmox,
  proxmoxSaved,
  handleSaveProxmox
}) {
  const [showHelpPage, setShowHelpPage] = React.useState(false);

  // Wenn Help Page aktiv ist, zeige nur die Hilfe
  if (showHelpPage) {
    return (
      <>
        {/* Zurück-Button */}
        <button
          onClick={() => setShowHelpPage(false)}
          className="flex items-center gap-2 px-4 py-2 mb-4 bg-white/70 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 backdrop-blur-md border border-gray-400/60 dark:border-white/10 rounded-xl transition-all text-gray-700 dark:text-gray-300 font-medium shadow-lg"
        >
          <span className="text-xl">←</span>
          Zurück zur Proxmox Konfiguration
        </button>

        {/* API Token Setup Guide - Full Page */}
        <div className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-white/10 shadow-xl">
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-orange-400/5 dark:from-orange-400/20 dark:to-transparent pointer-events-none" />
          
          {/* Header */}
          <div className="relative bg-gradient-to-r from-orange-500/80 to-orange-600/80 dark:from-orange-600/90 dark:to-orange-700/90 backdrop-blur-sm p-6 flex items-center justify-between border-b border-orange-400/30 dark:border-orange-500/30">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-white/90 dark:bg-white/95 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-3xl">🔑</span>
              </div>
              <div>
                <h4 className="text-white font-bold text-xl mb-1">API Token Setup</h4>
                <p className="text-orange-100 dark:text-orange-200 text-sm">Schritt-für-Schritt Anleitung</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="relative p-6 space-y-6">
            {/* Wichtiger Hinweis */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <p className="text-base text-blue-800 dark:text-blue-300 mb-2">
                <strong>📋 Voraussetzung:</strong> Du benötigst Zugriff auf die Proxmox Web-Oberfläche als Administrator.
              </p>
              <p className="text-base text-blue-700 dark:text-blue-400">
                Erstelle den Token in Proxmox unter: <strong>Datacenter → Permissions → API Tokens</strong>
              </p>
            </div>

            {/* Step 1: User erstellen */}
            <div className="p-5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
              <h5 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                <span className="text-2xl">1️⃣</span> User erstellen
              </h5>
              <ol className="text-lg text-gray-700 dark:text-gray-300 space-y-2 ml-8 list-disc">
                <li>Gehe zu <strong>Datacenter → Permissions → Users</strong></li>
                <li>Klicke auf <strong>"Add"</strong></li>
                <li>Wähle Realm: <code className="bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded">pve</code> (Proxmox VE authentication server)</li>
                <li>Vergib einen Username, z.B. <code className="bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded">servicedock</code></li>
              </ol>
            </div>

            {/* Step 2: API Token erstellen */}
            <div className="p-5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
              <h5 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                <span className="text-2xl">2️⃣</span> API Token erstellen
              </h5>
              <ol className="text-lg text-gray-700 dark:text-gray-300 space-y-2 ml-8 list-disc">
                <li>Wähle den erstellten User aus der Liste</li>
                <li>Klicke auf <strong>"API Tokens"</strong> → <strong>"Add"</strong></li>
                <li>Vergib einen Token-Namen, z.B. <code className="bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded">dashboard</code></li>
                <li>✅ <strong>Aktiviere "Privilege Separation"</strong> (empfohlen für mehr Sicherheit)</li>
                <li>⚠️ <strong>Kopiere das Secret sofort!</strong> Es wird nur EINMAL angezeigt</li>
              </ol>
            </div>

            {/* Step 3: Berechtigungen - WICHTIGSTER TEIL */}
            <div className="p-5 bg-red-50 dark:bg-red-900/20 rounded-xl border-2 border-red-300 dark:border-red-700">
              <h5 className="text-lg font-bold text-red-900 dark:text-red-200 mb-3 flex items-center gap-2">
                <span className="text-2xl">3️⃣</span> Berechtigungen setzen <span className="text-xl">⚠️ WICHTIG!</span>
              </h5>
              
              {/* Cluster Mode */}
              <div className="mb-5 p-4 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800">
                <h6 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <span className="text-xl">🖥️</span> Für Proxmox CLUSTER
                </h6>
                <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded">
                  <p className="text-base font-bold text-yellow-900 dark:text-yellow-200 mb-1">
                    ⚠️ Proxmox Cluster Bug mit "Privilege Separation"
                  </p>
                  <p className="text-base text-yellow-800 dark:text-yellow-300">
                    Trotz aktivierter "Privilege Separation" müssen in Clustern BEIDE Berechtigungen gesetzt werden! 
                    Die Cluster-API <code className="bg-yellow-200 dark:bg-yellow-900 px-1 rounded">/cluster/resources</code> prüft User UND Token.
                  </p>
                </div>
                
                <div className="space-y-4 ml-4">
                  <div>
                    <p className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      A) API Token Berechtigung
                    </p>
                    <ol className="text-base text-gray-700 dark:text-gray-300 space-y-2 ml-6 list-decimal">
                      <li><strong>Datacenter → Permissions → Add → API Token Permission</strong></li>
                      <li>Token auswählen: <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded text-sm">servicedock@pve!dashboard</code></li>
                      <li>Path: <code className="bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded font-bold">/</code></li>
                      <li>Role: <strong className="text-orange-600 dark:text-orange-400">PVEAdmin</strong></li>
                      <li>✅ Propagate aktivieren</li>
                    </ol>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-300 dark:border-gray-600">
                    <p className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      B) User Berechtigung <span className="text-red-600 dark:text-red-400">(Auch notwendig!)</span>
                    </p>
                    <ol className="text-base text-gray-700 dark:text-gray-300 space-y-2 ml-6 list-decimal">
                      <li><strong>Datacenter → Permissions → Add → User Permission</strong></li>
                      <li>User auswählen: <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded text-sm">servicedock@pve</code></li>
                      <li>Path: <code className="bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded font-bold">/</code></li>
                      <li>Role: <strong className="text-orange-600 dark:text-orange-400">PVEAdmin</strong></li>
                      <li>✅ Propagate aktivieren</li>
                    </ol>
                    <p className="text-sm italic text-gray-600 dark:text-gray-400 mt-2 ml-6">
                      → Ja, beides ist notwendig! Ohne User-Berechtigung funktioniert die Cluster-API nicht.
                    </p>
                  </div>
                </div>
              </div>

              {/* Standalone Mode */}
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
                <h6 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <span className="text-xl">💻</span> Für Proxmox STANDALONE (Single Node)
                </h6>
                <p className="text-base text-green-700 dark:text-green-400 mb-3 font-semibold">
                  ✅ Bei Standalone funktioniert "Privilege Separation" korrekt!
                </p>
                <ol className="text-base text-gray-700 dark:text-gray-300 space-y-2 ml-6 list-decimal">
                  <li><strong>Datacenter → Permissions → Add → API Token Permission</strong></li>
                  <li>Token auswählen: <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded text-sm">servicedock@pve!dashboard</code></li>
                  <li>Path: <code className="bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded font-bold">/</code></li>
                  <li>Role: <strong className="text-orange-600 dark:text-orange-400">PVEAuditor</strong> (nur Lesen) oder <strong className="text-orange-600 dark:text-orange-400">PVEAdmin</strong> (VM Steuern)</li>
                  <li>✅ Propagate aktivieren</li>
                </ol>
                <p className="text-sm italic text-gray-600 dark:text-gray-400 mt-2 ml-6">
                  → Hier reicht die Token-Berechtigung, User-Berechtigung ist NICHT notwendig.
                </p>
              </div>
            </div>

            {/* Tipps & Troubleshooting */}
            <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
              <h5 className="text-lg font-bold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
                <span className="text-2xl">💡</span> Tipps & Troubleshooting
              </h5>
              <ul className="text-lg text-blue-800 dark:text-blue-300 space-y-2 ml-8 list-disc">
                <li>
                  <strong>Token-Format:</strong> <code className="bg-blue-200 dark:bg-blue-900 px-2 py-0.5 rounded">user@realm!tokenname</code>
                  <br />
                  <span className="text-base">Beispiel: <code className="bg-blue-200 dark:bg-blue-900 px-2 py-0.5 rounded text-sm">servicedock@pve!dashboard</code></span>
                </li>
                <li>Nach dem Speichern wird automatisch ein Verbindungstest durchgeführt</li>
                <li><strong>Fehler "Permission denied":</strong> Prüfe bei Clustern, ob BEIDE Berechtigungen gesetzt sind</li>
                <li><strong>Fehler "No VMs/Containers found":</strong> Prüfe, ob die Role ausreichend ist (PVEAuditor minimum)</li>
                <li><strong>Self-signed SSL Zertifikate:</strong> Deaktiviere "SSL-Zertifikat verifizieren" weiter unten</li>
              </ul>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Standard Config View
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Proxmox Konfiguration</h3>
      
      {/* API Token Setup Guide - Card mit Link zur Hilfe */}
      <div className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-white/10 shadow-xl">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-orange-400/5 dark:from-orange-400/20 dark:to-transparent pointer-events-none" />
        
        {/* Header - Clickable */}
        <button
          type="button"
          onClick={() => setShowHelpPage(true)}
          className="relative w-full bg-gradient-to-r from-orange-500/80 to-orange-600/80 dark:from-orange-600/90 dark:to-orange-700/90 backdrop-blur-sm p-6 flex items-center justify-between border-b border-orange-400/30 dark:border-orange-500/30 hover:from-orange-600/80 hover:to-orange-700/80 transition-all cursor-pointer group"
        >
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-white/90 dark:bg-white/95 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-3xl">🔑</span>
            </div>
            <div className="text-left">
              <h4 className="text-white font-bold text-xl mb-1">API Token Setup Hilfe</h4>
              <p className="text-orange-100 dark:text-orange-200 text-sm">Schritt-für-Schritt Anleitung anzeigen</p>
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-white text-3xl group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </button>
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

        {/* NEU: Cluster-Modus */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <input
              type="checkbox"
              id="is_cluster"
              checked={proxmoxConfig.is_cluster || false}
              onChange={(e) => setProxmoxConfig({ ...proxmoxConfig, is_cluster: e.target.checked })}
              className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="is_cluster" className="text-base font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              🌐 Dies ist ein Proxmox Cluster
            </label>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 ml-7">
            Aktiviere diese Option, wenn du einen Proxmox-Cluster (mehrere Nodes) hast. 
            Die Cluster-API <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">/cluster/resources</code> wird dann verwendet.
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
