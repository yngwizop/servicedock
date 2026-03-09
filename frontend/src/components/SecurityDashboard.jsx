import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import CustomSelect from './CustomSelect';
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
  ShieldWarning,
  Shield
} from 'phosphor-react';
import { authenticatedFetch } from '../utils/auth';

/**
 * Animated Counter Hook — Zählt von 0 bis target hoch
 */
function useAnimatedCounter(target, duration = 2200, delay = 0) {
  const [value, setValue] = useState(0);
  const hasAnimated = useRef(false);
  const prevTarget = useRef(0);
  const frameRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const from = hasAnimated.current ? prevTarget.current : 0;
    hasAnimated.current = true;
    prevTarget.current = target;
    if (target === from) { setValue(target); return; }
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const start = performance.now();
      const animate = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        setValue(Math.round(from + (target - from) * eased));
        if (progress < 1) frameRef.current = requestAnimationFrame(animate);
      };
      frameRef.current = requestAnimationFrame(animate);
    }, delay);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [target, duration, delay]);
  return value;
}

/**
 * Animated Progress Bar — animiert Breite von 0 auf Zielwert
 */
const AnimatedBar = React.memo(function AnimatedBar({ percentage, colorClass, delay = 0 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setWidth(percentage), delay + 100);
    return () => clearTimeout(timer);
  }, [percentage, delay]);
  return (
    <div className="w-full bg-gray-300/30 dark:bg-white/10 rounded-full h-2.5 overflow-hidden">
      <div
        className={`h-2.5 rounded-full transition-all duration-1000 ease-out ${colorClass}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
});

// Backend-URL: Mit Nginx kein Port, ohne Nginx Port 8000
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
  (window.location.port === '' ? 
    `${window.location.protocol}//${window.location.hostname}` :
    `${window.location.protocol}//${window.location.hostname}:8000`
  );

/**
 * Overview Cards — als eigene Komponente für stabile Counter-Animationen
 */
const OverviewCards = React.memo(function OverviewCards({ tokenInfo, auditStats, rateLimitUsage, formatTimestamp, t }) {
  // Animated Counters für Activity Card
  const animTotal = useAnimatedCounter(auditStats?.error_stats?.total || 0, 2200, 200);
  const animSuccess = useAnimatedCounter(auditStats?.error_stats?.success || 0, 2200, 400);
  const animFailed = useAnimatedCounter(auditStats?.error_stats?.failed || 0, 2200, 500);
  
  // Animated Counters für Threats Card
  const animFailedLogins = useAnimatedCounter(auditStats?.security_threats?.failed_logins || 0, 2200, 300);
  const animBlockedIPs = useAnimatedCounter(auditStats?.security_threats?.blocked_ips || 0, 2200, 450);
  const animPermErrors = useAnimatedCounter(auditStats?.security_threats?.permission_errors || 0, 2200, 600);
  
  // Animated Counter für Token Age
  const animTokenAge = useAnimatedCounter(tokenInfo?.age_days || 0, 2200, 200);

  // Rate-Limit Bar-Farben
  const getBarColor = (pct) => pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-orange-500' : 'bg-green-500';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      
      {/* Token Rotation Card */}
      <div className="animate-slide-in-left bg-white/50 dark:bg-white/[0.12] backdrop-blur-md rounded-2xl shadow-xl p-6 border border-gray-400/60 dark:border-white/10 hover:scale-[1.02] hover:border-gray-500/70 dark:hover:border-white/20 transition-all duration-300 group" style={{ animationDelay: '0s' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${tokenInfo?.rotation_recommended ? 'bg-red-100/60 dark:bg-red-500/10' : 'bg-green-100/60 dark:bg-green-500/10'}`}>
              <ArrowsClockwise 
                size={24} 
                className={tokenInfo?.rotation_recommended ? 'text-red-500' : 'text-green-500'} 
                weight="duotone"
              />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
              Token Rotation
            </h3>
          </div>
          {tokenInfo?.rotation_recommended && (
            <Warning size={24} className="text-red-500 animate-pulse" weight="fill" />
          )}
        </div>
        
        {tokenInfo?.configured ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-white/50 uppercase tracking-wider" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{t('security.token_age')}</p>
              <p className="text-3xl font-bold tabular-nums text-gray-800 dark:text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                {animTokenAge} <span className="text-lg font-medium text-gray-500 dark:text-gray-400">{t('security.days')}</span>
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-white/50 uppercase tracking-wider">{t('security.created_on')}</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {formatTimestamp(tokenInfo.created_at)}
              </p>
            </div>
            {tokenInfo.last_rotated && (
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-white/50 uppercase tracking-wider">{t('security.last_rotation')}</p>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {formatTimestamp(tokenInfo.last_rotated)}
                </p>
              </div>
            )}
            <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 ${
              tokenInfo.rotation_recommended 
                ? 'bg-red-100 dark:bg-red-900/30' 
                : 'bg-green-100 dark:bg-green-900/30'
            }`}>
              {tokenInfo.rotation_recommended 
                ? <Warning size={16} weight="fill" className="text-red-600 dark:text-red-400" />
                : <CheckCircle size={16} weight="fill" className="text-green-600 dark:text-green-400" />
              }
              <p className={`text-sm font-semibold ${
                tokenInfo.rotation_recommended 
                  ? 'text-red-800 dark:text-red-300' 
                  : 'text-green-800 dark:text-green-300'
              }`}>
                {tokenInfo.rotation_recommended 
                  ? t('security.rotation_recommended') 
                  : t('security.token_current')}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">{t('security.proxmox_not_configured')}</p>
        )}
      </div>

      {/* Activity Card */}
      <div className="animate-slide-in-left bg-white/50 dark:bg-white/[0.12] backdrop-blur-md rounded-2xl shadow-xl p-6 border border-gray-400/60 dark:border-white/10 hover:scale-[1.02] hover:border-gray-500/70 dark:hover:border-white/20 transition-all duration-300 group" style={{ animationDelay: '0.15s' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-100/60 dark:bg-blue-500/10 p-3 rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            <ChartBar size={24} className="text-blue-500" weight="duotone" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            {t('security.activity_24h')}
          </h3>
        </div>
        
        {auditStats && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-white/50 uppercase tracking-wider" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{t('security.total')}</p>
                <p className="text-3xl font-bold tabular-nums text-gray-800 dark:text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                  {animTotal}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-white/50 uppercase tracking-wider" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{t('security.successful')}</p>
                <p className="text-3xl font-bold tabular-nums text-green-600 dark:text-green-400" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                  {animSuccess}
                </p>
              </div>
            </div>
            
            {auditStats.error_stats.failed > 0 && (
              <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-xl flex items-center gap-2">
                <XCircle size={16} weight="fill" className="text-red-600 dark:text-red-400" />
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                  {t('security.failed_requests', { count: animFailed })}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Security Threats Card */}
      <div className="animate-slide-in-left bg-white/50 dark:bg-white/[0.12] backdrop-blur-md rounded-2xl shadow-xl p-6 border border-gray-400/60 dark:border-white/10 hover:scale-[1.02] hover:border-gray-500/70 dark:hover:border-white/20 transition-all duration-300 group" style={{ animationDelay: '0.3s' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-red-100/60 dark:bg-red-500/10 p-3 rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            <Detective size={24} className="text-red-500" weight="duotone" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            Security Threats (24h)
          </h3>
        </div>
        
        {auditStats?.security_threats ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/30 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-2.5">
                <XCircle size={22} weight="fill" className="text-red-500 dark:text-red-400" />
                <span className="text-sm text-gray-700 dark:text-gray-400">{t('security.failed_logins')}</span>
              </div>
              <span className={`text-xl font-bold tabular-nums ${
                auditStats.security_threats.failed_logins > 10 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-white'
              }`} style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                {animFailedLogins}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/30 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-2.5">
                <ProhibitInset size={22} weight="fill" className="text-orange-500 dark:text-orange-400" />
                <span className="text-sm text-gray-700 dark:text-gray-400">{t('security.ips_with_errors')}</span>
              </div>
              <span className={`text-xl font-bold tabular-nums ${
                auditStats.security_threats.blocked_ips > 5 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-800 dark:text-white'
              }`} style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                {animBlockedIPs}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/30 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-2.5">
                <ShieldWarning size={22} weight="fill" className="text-yellow-500 dark:text-yellow-400" />
                <span className="text-sm text-gray-700 dark:text-gray-400">Permission Denied</span>
              </div>
              <span className={`text-xl font-bold tabular-nums ${
                auditStats.security_threats.permission_errors > 5 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-800 dark:text-white'
              }`} style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                {animPermErrors}
              </span>
            </div>
            
            {auditStats.security_threats.suspicious_activity ? (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center gap-2">
                <Warning size={18} weight="fill" className="text-red-600 dark:text-red-400" />
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">{t('security.threat_detected')}</p>
              </div>
            ) : (
              <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center gap-2">
                <CheckCircle size={18} weight="fill" className="text-green-600 dark:text-green-400" />
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">{t('security.no_threats')}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">{t('security.loading_data')}</p>
        )}
      </div>

      {/* Rate Limiting Card */}
      <div className="animate-slide-in-left bg-white/50 dark:bg-white/[0.12] backdrop-blur-md rounded-2xl shadow-xl p-6 border border-gray-400/60 dark:border-white/10 hover:scale-[1.02] hover:border-gray-500/70 dark:hover:border-white/20 transition-all duration-300 group" style={{ animationDelay: '0.45s' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-purple-100/60 dark:bg-purple-500/10 p-3 rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            <Clock size={24} className="text-purple-500" weight="duotone" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            Rate Limit Usage
          </h3>
        </div>
        
        {rateLimitUsage ? (
          <div className="space-y-4">
            {/* Login */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-gray-700 dark:text-gray-400">Login</span>
                <span className="text-sm font-bold tabular-nums text-gray-800 dark:text-white">
                  {rateLimitUsage.login.current}/{rateLimitUsage.login.limit}
                </span>
              </div>
              <AnimatedBar percentage={rateLimitUsage.login.percentage} colorClass={getBarColor(rateLimitUsage.login.percentage)} delay={200} />
            </div>
            
            {/* Proxmox View */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-gray-700 dark:text-gray-400">Proxmox View</span>
                <span className="text-sm font-bold tabular-nums text-gray-800 dark:text-white">
                  {rateLimitUsage.proxmox_view.current}/{rateLimitUsage.proxmox_view.limit}
                </span>
              </div>
              <AnimatedBar percentage={rateLimitUsage.proxmox_view.percentage} colorClass={getBarColor(rateLimitUsage.proxmox_view.percentage)} delay={400} />
            </div>
            
            {/* Proxmox Control */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-gray-700 dark:text-gray-400">Proxmox Control</span>
                <span className="text-sm font-bold tabular-nums text-gray-800 dark:text-white">
                  {rateLimitUsage.proxmox_control.current}/{rateLimitUsage.proxmox_control.limit}
                </span>
              </div>
              <AnimatedBar percentage={rateLimitUsage.proxmox_control.percentage} colorClass={getBarColor(rateLimitUsage.proxmox_control.percentage)} delay={600} />
            </div>
            
            <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center gap-2">
              <Clock size={16} weight="bold" className="text-blue-600 dark:text-blue-400" />
              <p className="text-xs text-blue-800 dark:text-blue-300">{t('security.live_data')}</p>
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
            <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">{t('security.rate_limiting_active')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

function SecurityDashboard({ isLoggedIn, textColor, onOpenSettings, activeDashboard = 1, searchTerm = "" }) {
  const { t } = useTranslation();
  const [tokenInfo, setTokenInfo] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [auditStats, setAuditStats] = useState(null);
  const [rateLimitUsage, setRateLimitUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const [logFilter, setLogFilter] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Glass Segment Control — Pill-Position
  const [pillStyle, setPillStyle] = useState(null);
  const segmentContainerRef = useRef(null);

  const measurePill = useCallback((view) => {
    const container = segmentContainerRef.current;
    if (!container) return;
    const btn = container.querySelector(`[data-view="${view || activeView}"]`);
    if (btn) {
      const parentRect = container.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      setPillStyle({ left: btnRect.left - parentRect.left, width: btnRect.width });
    }
  }, [activeView]);

  const segmentRefCallback = useCallback((node) => {
    segmentContainerRef.current = node;
    if (node) {
      const btn = node.querySelector(`[data-view="${activeView}"]`);
      if (btn) {
        const parentRect = node.getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();
        setPillStyle({ left: btnRect.left - parentRect.left, width: btnRect.width });
      }
    }
  }, [activeView]);

  useEffect(() => {
    measurePill(activeView);
  }, [activeView, measurePill]);

  // Hinweis: Suche ist nur in bestimmten Views sinnvoll
  const isSearchRelevant = activeView === 'overview';

  useEffect(() => {
    if (isLoggedIn) {
      fetchSecurityData();
      const interval = setInterval(fetchSecurityData, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, logFilter, activeDashboard]); // Re-fetch when filter or dashboard changes

  // Filter logs when filter changes (now handled by backend, but keep for immediate UI update)
  useEffect(() => {
    // Filtering now done on backend, just update display
    setFilteredLogs(auditLogs);
  }, [auditLogs]);

  const fetchSecurityData = async () => {
    try {
      const [tokenRes, logsRes, statsRes, rateLimitRes] = await Promise.all([
        authenticatedFetch(`${BACKEND_URL}/api/admin/proxmox/token-info?dashboard_id=${activeDashboard}`),
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
      alert(t('security.enter_password'));
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
        alert(t('security.delete_success', { count: data.deleted_count }));
        setAuditLogs([]);
        setDeletePassword('');
        setShowDeleteModal(false);
        fetchSecurityData();
      } else if (res.status === 429) {
        alert(t('security.delete_rate_limit'));
      } else if (res.status === 403) {
        alert(t('security.wrong_password'));
      } else {
        const errorData = await res.json();
        alert(t('security.delete_error_detail', { detail: errorData.detail || 'Failed to delete logs' }));
      }
    } catch (err) {
      console.error('Delete logs error:', err);
      alert(t('security.delete_error', { message: err.message }));
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
          {t('security.admin_required')}
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

      {/* Glass Segment Control */}
      <div className="flex items-center gap-3 mb-2">
        <div ref={segmentRefCallback} className="relative flex p-1 rounded-xl bg-white/40 dark:bg-white/[0.06] backdrop-blur-md border border-gray-300/40 dark:border-white/10 shadow-lg">
          {/* Sliding Pill */}
          {pillStyle && (
            <div
              className="absolute top-1 bottom-1 rounded-lg bg-white/80 dark:bg-white/15 shadow-md transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ left: pillStyle.left, width: pillStyle.width }}
            />
          )}
          <button
            data-view="overview"
            onClick={() => setActiveView('overview')}
            className={`relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200 ${
              activeView === 'overview'
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <Eye size={18} weight={activeView === 'overview' ? 'fill' : 'regular'} />
            <span>{t('security.overview')}</span>
          </button>
          <button
            data-view="logs"
            onClick={() => setActiveView('logs')}
            className={`relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200 ${
              activeView === 'logs'
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <ListBullets size={18} weight={activeView === 'logs' ? 'fill' : 'regular'} />
            <span>Audit Logs</span>
          </button>
          <button
            data-view="stats"
            onClick={() => setActiveView('stats')}
            className={`relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200 ${
              activeView === 'stats'
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <ChartBar size={18} weight={activeView === 'stats' ? 'fill' : 'regular'} />
            <span>{t('security.statistics')}</span>
          </button>
        </div>
      </div>

      {/* Hinweis wenn Suche aktiv aber View nicht durchsuchbar */}
      {searchTerm && !isSearchRelevant && (
        <div className="mb-4 bg-yellow-500/20 dark:bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span className="text-sm font-medium">{t('security.search_unavailable')}</span>
          </div>
        </div>
      )}

      {/* Overview View */}
      {activeView === 'overview' && (
        <OverviewCards
          tokenInfo={tokenInfo}
          auditStats={auditStats}
          rateLimitUsage={rateLimitUsage}
          formatTimestamp={formatTimestamp}
          t={t}
        />
      )}

      {/* Logs View */}
      {activeView === 'logs' && (
        <div className="animate-fade-up bg-white/50 dark:bg-white/[0.12] backdrop-blur-md rounded-2xl shadow-xl border border-gray-400/60 dark:border-white/10 overflow-hidden">
          <div className="p-6 border-b border-gray-300/50 dark:border-white/10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                  Audit Logs
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-400 mt-1">
                  {filteredLogs.length} {t('security.entries_loaded')}
                </p>
              </div>
              
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                {/* Filter Dropdown */}
                <CustomSelect
                  value={logFilter}
                  onChange={(val) => setLogFilter(val)}
                  options={[
                    { value: 'all', label: t('security.all_logs') },
                    { value: 'failed', label: t('security.all_errors') },
                    { value: 'failed_logins', label: t('security.failed_logins_filter') },
                    { value: 'permission_errors', label: t('security.permission_denied') },
                    { value: 'vm_operations', label: t('security.vm_operations') },
                    { value: 'success', label: t('security.successful_filter') },
                  ]}
                  className="w-full md:w-56"
                />

                {/* Delete Button */}
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                >
                  <XCircle size={20} weight="fill" />
                  <span className="hidden md:inline">{t('security.delete_all_logs')}</span>
                  <span className="md:hidden">{t('common.delete')}</span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/20 dark:bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                    {t('security.timestamp')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                    {t('security.action')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                    {t('security.ip_address')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                    {t('security.details')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300/30 dark:divide-white/10">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-700 dark:text-gray-400">
                      {auditLogs.length === 0 
                        ? t('security.no_logs') 
                        : t('security.no_logs_filter')}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, index) => (
                    <tr key={log.id} className="animate-fade-up hover:bg-white/20 dark:hover:bg-white/5 transition-colors" style={{ animationDelay: `${Math.min(index * 0.03, 0.6)}s` }}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white">
                        {log.ip_address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusIcon(log.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-400">
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
          <div className="animate-slide-in-left bg-white/50 dark:bg-white/[0.12] backdrop-blur-md rounded-2xl shadow-xl p-6 border border-gray-400/60 dark:border-white/10 hover:border-gray-500/70 dark:hover:border-white/20 transition-all duration-300">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
              {t('security.top_actions')}
            </h3>
            <div className="space-y-3">
              {auditStats.actions_24h.length === 0 ? (
                <p className="text-gray-700 dark:text-gray-400">{t('security.no_activities')}</p>
              ) : (
                auditStats.actions_24h.map((action, index) => (
                  <div key={index} className="animate-fade-up flex items-center justify-between p-3 bg-white/30 dark:bg-white/5 rounded-xl hover:bg-white/50 dark:hover:bg-white/10 transition-all duration-200" style={{ animationDelay: `${index * 0.1}s` }}>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getActionColor(action.action)}`}>
                      {action.action}
                    </span>
                    <span className="text-lg font-bold tabular-nums text-gray-800 dark:text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                      {action.count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top IPs */}
          <div className="animate-slide-in-left bg-white/50 dark:bg-white/[0.12] backdrop-blur-md rounded-2xl shadow-xl p-6 border border-gray-400/60 dark:border-white/10 hover:border-gray-500/70 dark:hover:border-white/20 transition-all duration-300" style={{ animationDelay: '0.15s' }}>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
              {t('security.top_ips')}
            </h3>
            <div className="space-y-3">
              {auditStats.top_ips.length === 0 ? (
                <p className="text-gray-700 dark:text-gray-400">{t('security.no_access')}</p>
              ) : (
                auditStats.top_ips.map((ip, index) => (
                  <div key={index} className="animate-fade-up flex items-center justify-between p-3 bg-white/30 dark:bg-white/5 rounded-xl hover:bg-white/50 dark:hover:bg-white/10 transition-all duration-200" style={{ animationDelay: `${index * 0.1}s` }}>
                    <span className="text-sm font-mono text-gray-800 dark:text-white">
                      {ip.ip}
                    </span>
                    <span className="text-lg font-bold tabular-nums text-gray-800 dark:text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
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
          <div className="bg-white/70 dark:bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl max-w-md w-full p-6 border border-red-500/50 dark:border-red-500/30">
            <div className="flex items-center gap-3 mb-4">
              <Warning size={32} className="text-red-500" weight="fill" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                {t('security.delete_all_title')}
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('security.delete_all_warning')}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('security.password_confirm')}
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleDeleteAllLogs()}
                placeholder={t('security.password_placeholder')}
                className="w-full px-4 py-2 border border-gray-300/50 dark:border-white/[0.12] rounded-lg bg-white/50 dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                className="flex-1 px-4 py-2 bg-white/30 dark:bg-white/10 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-white/50 dark:hover:bg-white/15 transition-colors"
                disabled={isDeleting}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteAllLogs}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isDeleting}
              >
                {isDeleting ? t('security.deleting') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecurityDashboard;
