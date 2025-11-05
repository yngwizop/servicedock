import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Clock, 
  Warning, 
  CheckCircle, 
  XCircle,
  ArrowsClockwise,
  ListBullets,
  ChartBar,
  Eye,
  LockKey
} from 'phosphor-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:8000`;

function SecurityDashboard({ isLoggedIn, onOpenSettings }) {
  const [tokenInfo, setTokenInfo] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditStats, setAuditStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview'); // overview, logs, stats

  useEffect(() => {
    if (isLoggedIn) {
      fetchSecurityData();
      const interval = setInterval(fetchSecurityData, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  const fetchSecurityData = async () => {
    try {
      const [tokenRes, logsRes, statsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/admin/proxmox/token-info`),
        fetch(`${BACKEND_URL}/api/admin/audit-logs?limit=10`),
        fetch(`${BACKEND_URL}/api/admin/audit-stats`)
      ]);

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        setTokenInfo(tokenData);
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setAuditLogs(logsData.logs || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setAuditStats(statsData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching security data:', error);
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    if (status === 'success') {
      return <CheckCircle size={20} className="text-green-500" weight="fill" />;
    }
    return <XCircle size={20} className="text-red-500" weight="fill" />;
  };

  const getActionColor = (action) => {
    const colors = {
      VIEW_VMS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      START_VM: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      STOP_VM: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      REBOOT_VM: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    };
    return colors[action] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  };

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Shield size={64} className="text-gray-400 dark:text-gray-600" />
        <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">
          Security Dashboard
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
          Bitte melde dich als Admin an, um die Sicherheitsfunktionen zu sehen.
        </p>
        <LockKey size={32} className="text-gray-400 dark:text-gray-600 mt-4" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield size={32} className="text-blue-600 dark:text-blue-400" weight="fill" />
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
          Security Dashboard
        </h2>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 border-b border-gray-300 dark:border-gray-700">
        <button
          onClick={() => setActiveView('overview')}
          className={`px-4 py-2 font-semibold transition-all ${
            activeView === 'overview'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Eye size={20} />
            <span>Übersicht</span>
          </div>
        </button>
        <button
          onClick={() => setActiveView('logs')}
          className={`px-4 py-2 font-semibold transition-all ${
            activeView === 'logs'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <ListBullets size={20} />
            <span>Audit Logs</span>
          </div>
        </button>
        <button
          onClick={() => setActiveView('stats')}
          className={`px-4 py-2 font-semibold transition-all ${
            activeView === 'stats'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <ChartBar size={20} />
            <span>Statistiken</span>
          </div>
        </button>
      </div>

      {/* Overview View */}
      {activeView === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Token Rotation Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <ArrowsClockwise 
                  size={28} 
                  className={tokenInfo?.rotation_recommended ? 'text-orange-500' : 'text-green-500'} 
                  weight="bold"
                />
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  Token Rotation
                </h3>
              </div>
              {tokenInfo?.rotation_recommended && (
                <Warning size={24} className="text-orange-500" weight="fill" />
              )}
            </div>
            
            {tokenInfo?.configured ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Token Alter</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    {tokenInfo.age_days} Tage
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Erstellt am</p>
                  <p className="text-sm text-gray-800 dark:text-gray-100">
                    {formatTimestamp(tokenInfo.created_at)}
                  </p>
                </div>
                {tokenInfo.last_rotated && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Letzte Rotation</p>
                    <p className="text-sm text-gray-800 dark:text-gray-100">
                      {formatTimestamp(tokenInfo.last_rotated)}
                    </p>
                  </div>
                )}
                <div className={`mt-4 p-3 rounded-lg ${
                  tokenInfo.rotation_recommended 
                    ? 'bg-orange-100 dark:bg-orange-900/30' 
                    : 'bg-green-100 dark:bg-green-900/30'
                }`}>
                  <p className={`text-sm font-semibold ${
                    tokenInfo.rotation_recommended 
                      ? 'text-orange-800 dark:text-orange-300' 
                      : 'text-green-800 dark:text-green-300'
                  }`}>
                    {tokenInfo.rotation_recommended 
                      ? '⚠️ Rotation empfohlen (>90 Tage)' 
                      : '✓ Token ist aktuell'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">
                Proxmox nicht konfiguriert
              </p>
            )}
          </div>

          {/* Audit Stats Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <ChartBar size={28} className="text-blue-500" weight="bold" />
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                Aktivität (24h)
              </h3>
            </div>
            
            {auditStats && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Gesamt</p>
                    <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                      {auditStats.error_stats.total}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Erfolgreich</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {auditStats.error_stats.success}
                    </p>
                  </div>
                </div>
                
                {auditStats.error_stats.failed > 0 && (
                  <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                      ⚠️ {auditStats.error_stats.failed} fehlgeschlagene Anfragen
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rate Limiting Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Clock size={28} className="text-purple-500" weight="bold" />
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                Rate Limiting
              </h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">View Operations</span>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-100">30/min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Control Operations</span>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-100">10/min</span>
              </div>
              <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                  ✓ Rate Limiting aktiv
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs View */}
      {activeView === 'logs' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              Letzte 10 Audit-Einträge
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Zeitstempel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Aktion
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    IP-Adresse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      Keine Audit-Logs vorhanden
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                        {log.ip_address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusIcon(log.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {log.details && typeof log.details === 'object' 
                          ? JSON.stringify(log.details) 
                          : log.details || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats View */}
      {activeView === 'stats' && auditStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Top Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              Top Aktionen (24h)
            </h3>
            <div className="space-y-3">
              {auditStats.actions_24h.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">Keine Aktivitäten</p>
              ) : (
                auditStats.actions_24h.map((action, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getActionColor(action.action)}`}>
                      {action.action}
                    </span>
                    <span className="text-lg font-bold text-gray-800 dark:text-gray-100">
                      {action.count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top IPs */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              Top IP-Adressen (24h)
            </h3>
            <div className="space-y-3">
              {auditStats.top_ips.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">Keine Zugriffe</p>
              ) : (
                auditStats.top_ips.map((ip, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-mono text-gray-800 dark:text-gray-100">
                      {ip.ip}
                    </span>
                    <span className="text-lg font-bold text-gray-800 dark:text-gray-100">
                      {ip.count} Requests
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecurityDashboard;
