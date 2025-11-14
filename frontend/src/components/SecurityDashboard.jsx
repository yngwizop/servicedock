import React, { useState, useEffect } from 'react';
import { 
  Detective, 
  Clock, 
  Warning, 
  CheckCircle, 
  XCircle,
  ArrowsClockwise,
  ListBullets,
  ChartBar,
  Eye,
  LockKey,
  ProhibitInset,
  ShieldWarning
} from 'phosphor-react';
import { authenticatedFetch } from '../utils/auth';

// Backend-URL: Mit Nginx kein Port, ohne Nginx Port 8000
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
  (window.location.port === '' ? 
    `${window.location.protocol}//${window.location.hostname}` :
    `${window.location.protocol}//${window.location.hostname}:8000`
  );

function SecurityDashboard({ isLoggedIn, textColor, onOpenSettings }) {
  const [tokenInfo, setTokenInfo] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [auditStats, setAuditStats] = useState(null);
  const [rateLimitUsage, setRateLimitUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview'); // overview, logs, stats
  const [logFilter, setLogFilter] = useState('all'); // all, failed, failed_logins, permission_errors
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      fetchSecurityData();
      const interval = setInterval(fetchSecurityData, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, logFilter]); // Re-fetch when filter changes

  // Filter logs when filter changes (now handled by backend, but keep for immediate UI update)
  useEffect(() => {
    // Filtering now done on backend, just update display
    setFilteredLogs(auditLogs);
  }, [auditLogs]);

  const fetchSecurityData = async () => {
    try {
      const [tokenRes, logsRes, statsRes, rateLimitRes] = await Promise.all([
        authenticatedFetch(`${BACKEND_URL}/api/admin/proxmox/token-info`),
        authenticatedFetch(`${BACKEND_URL}/api/admin/audit-logs?limit=100&filter_type=${logFilter}`),
        authenticatedFetch(`${BACKEND_URL}/api/admin/audit-stats`),
        authenticatedFetch(`${BACKEND_URL}/api/admin/rate-limit-usage`)
      ]);

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        setTokenInfo(tokenData);
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setAuditLogs(logsData.logs || []);
        setFilteredLogs(logsData.logs || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setAuditStats(statsData);
      }

      if (rateLimitRes.ok) {
        const rateLimitData = await rateLimitRes.json();
        setRateLimitUsage(rateLimitData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching security data:', error);
      setLoading(false);
    }
  };

    const handleDeleteAllLogs = async () => {
    if (!deletePassword) {
      alert('Please enter admin password');
      return;
    }
    
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/admin/audit-logs/delete-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: deletePassword })
      });
      
      if (res.ok) {
        const data = await res.json();
        alert(`✅ ${data.deleted_count} Logs erfolgreich gelöscht`);
        setAuditLogs([]);
        setDeletePassword('');
        setShowDeleteModal(false);
        fetchSecurityData();
      } else if (res.status === 429) {
        alert(`⏱️ Rate Limit erreicht!\n\nDu kannst nur 3x pro Stunde alle Logs löschen.\nBitte warte eine Stunde oder starte das Backend neu.`);
      } else if (res.status === 403) {
        alert(`❌ Falsches Admin-Passwort`);
      } else {
        const errorData = await res.json();
        alert(`❌ Fehler: ${errorData.detail || 'Failed to delete logs'}`);
      }
    } catch (err) {
      console.error('Delete logs error:', err);
      alert(`❌ Fehler beim Löschen: ${err.message}`);
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
        <Detective size={40} weight="duotone" style={{ color: textColor }} />
        <h2 
          className="text-3xl font-bold transition-colors duration-300"
          style={{ 
            color: textColor,
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)'
          }}
        >
          Security Dashboard
        </h2>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-xl px-4 pt-3 pb-2 border border-gray-300/50 dark:border-gray-600/50 shadow-lg">
        <button
          onClick={() => setActiveView('overview')}
          className={`px-4 py-2 font-semibold transition-all rounded-lg ${
            activeView === 'overview'
              ? 'bg-blue-500/20 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/30 dark:hover:bg-gray-700/30'
          }`}
          style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}
        >
          <div className="flex items-center gap-2">
            <Eye size={20} />
            <span>Übersicht</span>
          </div>
        </button>
        <button
          onClick={() => setActiveView('logs')}
          className={`px-4 py-2 font-semibold transition-all rounded-lg ${
            activeView === 'logs'
              ? 'bg-blue-500/20 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/30 dark:hover:bg-gray-700/30'
          }`}
          style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}
        >
          <div className="flex items-center gap-2">
            <ListBullets size={20} />
            <span>Audit Logs</span>
          </div>
        </button>
        <button
          onClick={() => setActiveView('stats')}
          className={`px-4 py-2 font-semibold transition-all rounded-lg ${
            activeView === 'stats'
              ? 'bg-blue-500/20 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/30 dark:hover:bg-gray-700/30'
          }`}
          style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}
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
                  className={tokenInfo?.rotation_recommended ? 'text-red-500' : 'text-green-500'} 
                  weight="bold"
                />
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  Token Rotation
                </h3>
              </div>
              {tokenInfo?.rotation_recommended && (
                <Warning size={24} className="text-red-500" weight="fill" />
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
                    ? 'bg-red-100 dark:bg-red-900/30' 
                    : 'bg-green-100 dark:bg-green-900/30'
                }`}>
                  <p className={`text-sm font-semibold ${
                    tokenInfo.rotation_recommended 
                      ? 'text-red-800 dark:text-red-300' 
                      : 'text-green-800 dark:text-green-300'
                  }`}>
                    {tokenInfo.rotation_recommended 
                      ? '⚠️ Rotation empfohlen (>60 Tage)' 
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

          {/* Security Threats Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Warning size={28} className="text-orange-500" weight="bold" />
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                Security Threats (24h)
              </h3>
            </div>
            
            {auditStats?.security_threats ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <div className="flex items-center gap-2">
                    <XCircle 
                      size={24} 
                      weight="fill" 
                      className="text-red-500 dark:text-red-400" 
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Fehlgeschlagene Logins
                    </span>
                  </div>
                  <span className={`text-lg font-bold ${
                    auditStats.security_threats.failed_logins > 10 
                      ? 'text-red-600 dark:text-red-400' 
                      : 'text-gray-800 dark:text-gray-100'
                  }`}>
                    {auditStats.security_threats.failed_logins}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <div className="flex items-center gap-2">
                    <ProhibitInset 
                      size={24} 
                      weight="fill" 
                      className="text-orange-500 dark:text-orange-400" 
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      IPs mit Fehlern
                    </span>
                  </div>
                  <span className={`text-lg font-bold ${
                    auditStats.security_threats.blocked_ips > 5 
                      ? 'text-orange-600 dark:text-orange-400' 
                      : 'text-gray-800 dark:text-gray-100'
                  }`}>
                    {auditStats.security_threats.blocked_ips}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <div className="flex items-center gap-2">
                    <ShieldWarning 
                      size={24} 
                      weight="fill" 
                      className="text-yellow-500 dark:text-yellow-400" 
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Permission Denied
                    </span>
                  </div>
                  <span className={`text-lg font-bold ${
                    auditStats.security_threats.permission_errors > 5 
                      ? 'text-yellow-600 dark:text-yellow-400' 
                      : 'text-gray-800 dark:text-gray-100'
                  }`}>
                    {auditStats.security_threats.permission_errors}
                  </span>
                </div>
                
                {auditStats.security_threats.suspicious_activity ? (
                  <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center gap-2">
                    <Warning size={20} weight="fill" className="text-red-600 dark:text-red-400" />
                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                      Erhöhte Sicherheitsaktivität erkannt
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center gap-2">
                    <CheckCircle size={20} weight="fill" className="text-green-600 dark:text-green-400" />
                    <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                      Keine Bedrohungen erkannt
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">Lade Daten...</p>
            )}
          </div>

          {/* Rate Limiting Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Clock size={28} className="text-purple-500" weight="bold" />
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                Rate Limit Usage
              </h3>
            </div>
            
            {rateLimitUsage ? (
              <div className="space-y-4">
                {/* Login Endpoint */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Login</span>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                      {rateLimitUsage.login.current}/{rateLimitUsage.login.limit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        rateLimitUsage.login.percentage >= 80 
                          ? 'bg-red-500' 
                          : rateLimitUsage.login.percentage >= 50 
                          ? 'bg-orange-500' 
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${rateLimitUsage.login.percentage}%` }}
                    />
                  </div>
                </div>
                
                {/* Proxmox View */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Proxmox View</span>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                      {rateLimitUsage.proxmox_view.current}/{rateLimitUsage.proxmox_view.limit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        rateLimitUsage.proxmox_view.percentage >= 80 
                          ? 'bg-red-500' 
                          : rateLimitUsage.proxmox_view.percentage >= 50 
                          ? 'bg-orange-500' 
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${rateLimitUsage.proxmox_view.percentage}%` }}
                    />
                  </div>
                </div>
                
                {/* Proxmox Control */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Proxmox Control</span>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                      {rateLimitUsage.proxmox_control.current}/{rateLimitUsage.proxmox_control.limit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        rateLimitUsage.proxmox_control.percentage >= 80 
                          ? 'bg-red-500' 
                          : rateLimitUsage.proxmox_control.percentage >= 50 
                          ? 'bg-orange-500' 
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${rateLimitUsage.proxmox_control.percentage}%` }}
                    />
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center gap-2">
                  <Clock size={16} weight="bold" className="text-blue-600 dark:text-blue-400" />
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    Live-Daten der letzten Minute
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Login</span>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100">5/min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Proxmox Control</span>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100">30/min</span>
                </div>
                <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                    ✓ Rate Limiting aktiv
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logs View */}
      {activeView === 'logs' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  Audit Logs
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {filteredLogs.length} Einträge geladen (max. 100)
                </p>
              </div>
              
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                {/* Filter Dropdown */}
                <select
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="all">🔍 Alle Logs</option>
                  <option value="failed">❌ Alle Fehler</option>
                  <option value="failed_logins">🔐 Failed Logins</option>
                  <option value="permission_errors">⚠️ Permission Denied</option>
                  <option value="vm_operations">🖥️ VM Operationen</option>
                  <option value="success">✅ Erfolgreich</option>
                </select>

                {/* Delete Button */}
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                >
                  <XCircle size={20} weight="fill" />
                  <span className="hidden md:inline">Alle Logs löschen</span>
                  <span className="md:hidden">Löschen</span>
                </button>
              </div>
            </div>
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
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      {auditLogs.length === 0 
                        ? 'Keine Audit-Logs vorhanden' 
                        : 'Keine Logs entsprechen dem Filter'}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border-2 border-red-500">
            <div className="flex items-center gap-3 mb-4">
              <Warning size={32} className="text-red-500" weight="fill" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                Alle Audit-Logs löschen?
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Diese Aktion kann nicht rückgängig gemacht werden. Alle Audit-Log-Einträge werden permanent gelöscht.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Admin-Passwort zur Bestätigung:
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleDeleteAllLogs()}
                placeholder="Passwort eingeben"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                autoFocus
              />
              {deleteError && (
                <p className="mt-2 text-sm text-red-500">{deleteError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                  setDeleteError('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                disabled={isDeleting}
              >
                Abbrechen
              </button>
              <button
                onClick={handleDeleteAllLogs}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isDeleting}
              >
                {isDeleting ? 'Lösche...' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecurityDashboard;
