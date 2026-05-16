import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import MarqueeOrTruncate from './MarqueeOrTruncate';
import { getOrangeGlassRail } from '../styles/glass';
import {
  HouseLine,
  ComputerTower,
  Vault,
  SlidersHorizontal,
  SignOut,
  Moon,
  Sun,
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  CaretDown,
  Check,
  PencilSimple,
  ArrowsLeftRight,
  User,
} from 'phosphor-react';

function Sidebar({ 
  activeTab, 
  setActiveTab, 
  theme, 
  toggleTheme, 
  onLogout,
  showProxmox = false,
  collapsed = false,
  onToggleCollapse,
  searchOpen = false,
  setSearchOpen,
  searchTerm = "",
  setSearchTerm,
  searchInputRef,
  dashboards = [],
  activeDashboard = 1,
  switchDashboard,
  editMode = false,
  setEditMode,
  isAdmin = false,
  displayName = null,
  authMethod = 'local',
  sessionUsername = null,
  userRole = 'admin',
  integrationHealth = null,
}) {
  const { t } = useTranslation();
  const [dashDropdownOpen, setDashDropdownOpen] = useState(false);
  const dashTriggerRef = useRef(null);
  const dashDropdownRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [showHealthHover, setShowHealthHover] = useState(false);
  const [showUserHover, setShowUserHover] = useState(false);
  const healthHoverTimerRef = useRef(null);
  const userHoverTimerRef = useRef(null);

  const activeDash = dashboards.find(d => d.id === activeDashboard);

  // Position dropdown
  useEffect(() => {
    if (!dashDropdownOpen || !dashTriggerRef.current) return;
    const rect = dashTriggerRef.current.getBoundingClientRect();
    if (collapsed) {
      // Flyout to the right of collapsed sidebar
      setDropdownPos({ top: rect.top, left: rect.right + 8 });
    } else {
      // Below the trigger
      setDropdownPos({ top: rect.bottom + 6, left: rect.left });
    }
  }, [dashDropdownOpen, collapsed]);

  // Close on outside click
  useEffect(() => {
    if (!dashDropdownOpen) return;
    const handleClick = (e) => {
      if (
        dashTriggerRef.current && !dashTriggerRef.current.contains(e.target) &&
        dashDropdownRef.current && !dashDropdownRef.current.contains(e.target)
      ) {
        setDashDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dashDropdownOpen]);

  // Close on Escape
  useEffect(() => {
    if (!dashDropdownOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') setDashDropdownOpen(false); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [dashDropdownOpen]);

  useEffect(() => {
    return () => {
      if (healthHoverTimerRef.current) clearTimeout(healthHoverTimerRef.current);
      if (userHoverTimerRef.current) clearTimeout(userHoverTimerRef.current);
    };
  }, []);

  const sessionPrimary =
    (displayName && String(displayName).trim()) ||
    (sessionUsername && String(sessionUsername).trim()) ||
    '—';
  const sessionUserLine =
    (sessionUsername && String(sessionUsername).trim()) || '—';
  const authLabel =
    authMethod === 'ad' ? t('session.auth_directory') : t('session.auth_local');
  const roleLabel =
    userRole === 'viewer' ? t('session.role_viewer') : t('session.role_admin');

  /** Vertikales Glaspaneel — gleiche Orangefamilie, hell (Dim) vs. gedämpft dunkel */
  const glassRail = getOrangeGlassRail(theme);

  /** Eingeklappt: weniger Innenpadding, größere Icons — sonst ~16px nutzbare Breite und Phosphor-SVGs wirken „winzig“ */
  const iz = collapsed ? 28 : 22;
  const izSm = collapsed ? 24 : 18;
  const izCaret = collapsed ? 24 : 22;
  /** Theme-Switch: im ausgeklappten Balken etwas größer als Standard-Nav (22) */
  const izTheme = collapsed ? iz : 26;

  const navItems = [
    { id: 'services', label: 'Dashboard', icon: HouseLine },
    ...(showProxmox && isAdmin ? [{ id: 'monitoring', label: 'Proxmox', icon: ComputerTower }] : []),
    ...(isAdmin ? [{ id: 'security', label: 'Security', icon: Vault }] : []),
    ...(isAdmin ? [{ id: 'settings', label: 'Settings', icon: SlidersHorizontal }] : []),
  ];

  const healthChecks = integrationHealth?.checks || [];
  const checkByName = (name) => healthChecks.find((c) => c.name === name);
  const proxmoxHealth = checkByName('proxmox');
  const spotifyHealth = checkByName('spotify');
  const ldapHealth = checkByName('ldap');
  const healthRows = [
    { key: 'proxmox', label: 'Proxmox', data: proxmoxHealth },
    { key: 'spotify', label: 'Spotify', data: spotifyHealth },
    { key: 'ldap', label: 'LDAP', data: ldapHealth },
  ];
  const healthColor = (status) => {
    if (status === 'ok' || status === 'disabled') return 'bg-green-500';
    if (status === 'warning' || status === 'not_configured') return 'bg-amber-400';
    if (status === 'down') return 'bg-red-500';
    return 'bg-gray-400/70';
  };
  const healthText = (status) => {
    if (status === 'ok') return t('sidebar.health_status_ok');
    if (status === 'disabled') return t('sidebar.health_status_disabled');
    if (status === 'warning') return t('sidebar.health_status_warning');
    if (status === 'not_configured') return t('sidebar.health_status_not_configured');
    if (status === 'down') return t('sidebar.health_status_down');
    return t('sidebar.health_status_unknown');
  };
  const healthDetail = (check) => {
    if (check?.name === 'spotify' && check?.status === 'disabled') {
      return t('sidebar.health_spotify_widget_off');
    }
    return check?.detail || 'n/a';
  };

  return (
    <div
      className={`sidebar-no-scrollbar fixed left-0 top-0 z-50 flex h-screen ${collapsed ? 'w-20' : 'w-52'} flex-col overflow-visible bg-transparent transition-all duration-300 ease-in-out`}
    >
      <div
        className={`flex min-h-0 flex-1 flex-col py-3 sm:py-3.5 ${collapsed ? 'px-1' : 'px-2.5'}`}
      >
        <div
          className={`sidebar-no-scrollbar flex min-h-0 flex-1 flex-col overflow-visible ${glassRail}`}
        >
      {/* Logo/Header */}
      <div className={collapsed ? 'px-2 py-3' : 'p-6'}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} transition-all duration-300 ease-in-out`}>
          <div className={`${collapsed ? 'h-11 w-11' : 'h-10 w-10'} flex shrink-0 items-center justify-center rounded-xl`}>
            <img src="/servicedock-icon.svg" alt="Servicedock" className={collapsed ? 'h-11 w-11' : 'h-10 w-10'} />
          </div>
          <div className={`transition-all duration-300 ease-in-out ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>
            <h1 className="text-lg font-bold text-white dark:text-white whitespace-nowrap" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>Servicedock</h1>
            <p className="text-xs text-white/70 dark:text-gray-400 whitespace-nowrap" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>Dashboard</p>
          </div>
        </div>
      </div>

      {/* Dashboard Switcher */}
      {dashboards.length > 1 && (
        <div className={collapsed ? 'px-2 pb-1' : 'px-4 pb-1'}>
          <button
            ref={dashTriggerRef}
            onClick={() => setDashDropdownOpen(!dashDropdownOpen)}
            className={`w-full flex items-center ${collapsed ? 'justify-center px-1 py-2' : 'gap-2.5 px-3.5 py-2.5'} rounded-xl transition-all duration-300 ease-in-out
              ${dashDropdownOpen
                ? 'bg-white/20 dark:bg-white/15 ring-1 ring-white/30'
                : 'bg-white/10 dark:bg-white/5 hover:bg-white/15 dark:hover:bg-white/10'
              }
            `}
            title={collapsed ? (activeDash?.name || 'Dashboard') : ''}
          >
            <ArrowsLeftRight size={izSm} weight="bold" className="text-white/80 shrink-0" />
            <span className={`font-medium text-sm text-white truncate transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-[120px]'}`} style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
              {activeDash?.name || 'Dashboard'}
            </span>
            <CaretDown 
              size={14} 
              weight="bold" 
              className={`text-white/60 shrink-0 ml-auto transition-all duration-200 ${collapsed ? 'hidden' : ''} ${dashDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dashboard Dropdown Portal */}
          {dashDropdownOpen && createPortal(
            <div
              ref={dashDropdownRef}
              style={{
                position: 'fixed',
                top: dropdownPos.top,
                left: dropdownPos.left,
                width: collapsed ? 220 : undefined,
                minWidth: collapsed ? undefined : dashTriggerRef.current?.getBoundingClientRect().width,
                zIndex: 9999,
              }}
              className="bg-white/10 dark:bg-gray-900/80 night:bg-sd-night-950/90 backdrop-blur-2xl border border-white/20 dark:border-white/10 night:border-white/[0.06] rounded-xl shadow-2xl overflow-hidden"
            >
              {dashboards.map((dashboard) => {
                const isActive = dashboard.id === activeDashboard;
                return (
                  <button
                    key={dashboard.id}
                    onClick={() => {
                      switchDashboard(dashboard.id);
                      setDashDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 transition-all duration-150 flex items-center gap-3 ${
                      isActive
                        ? 'bg-blue-500/30 dark:bg-blue-500/25'
                        : 'hover:bg-white/10 dark:hover:bg-white/8'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-white truncate" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{dashboard.name}</div>
                      {dashboard.description && (
                        <div className="text-xs text-white/50 truncate mt-0.5" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>{dashboard.description}</div>
                      )}
                    </div>
                    {isActive && (
                      <Check size={16} weight="bold" className="text-blue-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>,
            document.body
          )}
        </div>
      )}

      {/* Integration Health */}
      {integrationHealth && (
        <div
          className={`relative ${collapsed ? 'px-2 pb-2' : 'px-4 pb-2'}`}
          onMouseEnter={() => {
            if (healthHoverTimerRef.current) clearTimeout(healthHoverTimerRef.current);
            healthHoverTimerRef.current = setTimeout(() => setShowHealthHover(true), 600);
          }}
          onClick={() => {
            if (healthHoverTimerRef.current) clearTimeout(healthHoverTimerRef.current);
            setShowHealthHover((prev) => !prev);
          }}
          onMouseLeave={() => {
            if (healthHoverTimerRef.current) clearTimeout(healthHoverTimerRef.current);
            setShowHealthHover(false);
          }}
        >
          <div
            className={`w-full rounded-xl transition-all duration-300 ${
              collapsed ? 'px-1 py-2.5' : 'px-3 py-2'
            } bg-white/10 dark:bg-white/5 hover:bg-white/15 dark:hover:bg-white/10`}
          >
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
              {!collapsed && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                  {t('sidebar.health')}
                </span>
              )}
              <div className={`${collapsed ? '' : 'ml-auto'} flex items-center gap-1.5`}>
                <span className={`h-2.5 w-2.5 rounded-full ${healthColor(proxmoxHealth?.status)}`} />
                <span className={`h-2.5 w-2.5 rounded-full ${healthColor(spotifyHealth?.status)}`} />
                <span className={`h-2.5 w-2.5 rounded-full ${healthColor(ldapHealth?.status)}`} />
              </div>
            </div>
          </div>

          <div
            className={`absolute z-[120] w-[18rem] rounded-xl border border-slate-700/75 bg-slate-950/95 p-3 text-left shadow-2xl shadow-black/45 backdrop-blur-xl
            dark:border-slate-700/80 dark:bg-slate-950/95 dark:shadow-black/55
            night:border-sd-night-800/90 night:bg-sd-night-950/95
            ${showHealthHover ? 'opacity-100 visible translate-y-0 scale-100' : 'opacity-0 invisible -translate-y-1 scale-[0.98]'}
            transition-all duration-200
            pointer-events-none
            left-full ml-2 top-0`}
          >
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/80 dark:text-white/80 night:text-slate-200">
              {t('sidebar.health')}
            </div>
            <div className="space-y-2">
              {healthRows.map(({ key, label, data }) => (
                <div key={key} className="rounded-lg border border-white/12 bg-white/[0.09] px-2.5 py-2 dark:bg-white/[0.1] night:bg-sd-night-900/80">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${healthColor(data?.status)}`} />
                      <span className="text-xs font-semibold text-white/95 dark:text-white night:text-slate-100">{label}</span>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-white/85 dark:text-white/85 night:text-slate-200">
                      {healthText(data?.status)}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] leading-relaxed text-white/90 dark:text-white/85 night:text-slate-300">
                    {healthDetail(data)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <div className={collapsed ? 'px-2 py-2' : 'px-4 py-3'}>
        <button
          onClick={onToggleCollapse}
          className={`w-full flex items-center ${collapsed ? 'justify-center px-1 py-2' : 'gap-3 px-4 py-2'} rounded-xl text-white dark:text-gray-300 hover:bg-white/15 dark:hover:bg-white/10 transition-all duration-300 ease-in-out`}
          title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        >
          {collapsed ? <CaretRight size={izCaret} weight="bold" /> : <CaretLeft size={izCaret} weight="bold" />}
          <span className={`font-medium transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-xs'}`} style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
            {t('sidebar.collapse_label')}
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-hidden ${collapsed ? 'space-y-1.5 p-2' : 'space-y-2 p-4'}`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center ${collapsed ? 'justify-center px-1 py-2.5' : 'gap-3 px-4 py-3'} rounded-xl transition-all duration-300 ease-in-out ${
                isActive
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : 'text-white dark:text-gray-300 hover:bg-white/15 dark:hover:bg-white/10'
              }`}
              title={collapsed ? item.label : ''}
            >
              <Icon size={iz} weight={isActive ? 'fill' : collapsed ? 'bold' : 'regular'} />
              <span className={`font-medium transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-xs'}`} style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className={collapsed ? 'space-y-1.5 p-2' : 'space-y-2 p-4'}>
        {/* Edit Mode Toggle – nur für Admins */}
        {isAdmin && (
        <button
          onClick={() => setEditMode && setEditMode(!editMode)}
          className={`w-full flex items-center ${collapsed ? 'justify-center px-1 py-2.5' : 'gap-3 px-4 py-3'} rounded-xl ${
            editMode
              ? 'bg-amber-500/80 text-white shadow-lg shadow-amber-500/30'
              : 'text-white dark:text-gray-300 hover:bg-white/15 dark:hover:bg-white/10'
          } transition-all duration-300 ease-in-out`}
          title={collapsed ? (editMode ? t('sidebar.end_edit') : t('sidebar.edit')) : ''}
        >
          <PencilSimple size={iz} weight={editMode ? 'fill' : collapsed ? 'bold' : 'regular'} />
          <span className={`font-medium transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-xs'}`} style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
            {editMode ? t('sidebar.end_edit') : t('sidebar.edit')}
          </span>
        </button>
        )}

        {/* Globale Suche */}
        <button
          onClick={() => {
            setSearchOpen(!searchOpen);
            if (!searchOpen) {
              setTimeout(() => searchInputRef.current?.focus(), 100);
            }
          }}
          className={`w-full flex items-center ${collapsed ? 'justify-center px-1 py-2.5' : 'gap-3 px-4 py-3'} rounded-xl ${
            searchOpen
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
              : 'text-white dark:text-gray-300 hover:bg-white/15 dark:hover:bg-white/10'
          } transition-all duration-300 ease-in-out`}
          title={collapsed ? t('sidebar.search_shortcut') : ''}
        >
          <MagnifyingGlass size={iz} weight={searchOpen ? 'bold' : collapsed ? 'bold' : 'regular'} />
          <span className={`font-medium transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-xs'}`} style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
            {t('sidebar.search')}
          </span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`flex w-full items-center ${collapsed ? 'justify-center px-1 py-2.5' : 'min-w-0 gap-3 px-4 py-3'} rounded-xl text-white dark:text-gray-300 hover:bg-white/15 dark:hover:bg-white/10 transition-all duration-300 ease-in-out`}
          title={collapsed ? (theme === 'light' ? t('sidebar.theme_label_dark') : t('sidebar.theme_label_light')) : ''}
        >
          {theme === 'light' ? (
            <Moon size={izTheme} weight="bold" className="shrink-0" />
          ) : (
            <Sun size={izTheme} weight="bold" className="shrink-0" />
          )}
          {!collapsed ? (
            <div className="min-w-0 flex-1 text-left">
              <MarqueeOrTruncate
                text={theme === 'light' ? t('sidebar.theme_label_dark') : t('sidebar.theme_label_light')}
                className="font-medium text-white dark:text-gray-300"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
              />
            </div>
          ) : (
            <span className="sr-only">
              {theme === 'light' ? t('sidebar.theme_label_dark') : t('sidebar.theme_label_light')}
            </span>
          )}
        </button>

        {/* Angemeldeter Benutzer — Hover zeigt Details */}
        <div
          className="relative z-[60]"
          onMouseEnter={() => {
            if (userHoverTimerRef.current) clearTimeout(userHoverTimerRef.current);
            userHoverTimerRef.current = setTimeout(() => setShowUserHover(true), 600);
          }}
          onClick={() => {
            if (userHoverTimerRef.current) clearTimeout(userHoverTimerRef.current);
            setShowUserHover((prev) => !prev);
          }}
          onMouseLeave={() => {
            if (userHoverTimerRef.current) clearTimeout(userHoverTimerRef.current);
            setShowUserHover(false);
          }}
        >
          <div
            className={`w-full flex items-center ${collapsed ? 'justify-center px-1 py-2.5' : 'gap-3 px-4 py-3'} rounded-xl text-white dark:text-gray-300 hover:bg-white/15 dark:hover:bg-white/10 transition-all duration-300 ease-in-out cursor-default`}
            role="status"
            aria-label={t('session.aria_label')}
          >
            <User size={iz} weight="duotone" className="shrink-0 text-white/90" />
            <span
              className={`font-medium transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden text-left truncate ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-xs'}`}
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
            >
              {sessionPrimary}
            </span>
          </div>

          <div
            className={`
              absolute z-[100] min-w-[11.75rem] max-w-[13rem] rounded-2xl border border-slate-700/75 bg-slate-950/95 p-3 text-left shadow-2xl shadow-black/45 backdrop-blur-xl
              dark:border-slate-700/80 dark:bg-slate-950/95 dark:shadow-black/55
              night:border-sd-night-800/90 night:bg-sd-night-950/95 night:shadow-black/60
              ${showUserHover ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-[0.98]'}
              transition-all duration-200 ease-out
              pointer-events-none
              left-full ml-2 bottom-0 w-[13rem]
            `}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/65 dark:text-white/70 night:text-slate-300 mb-2">
              {t('session.menu_heading')}
            </div>
            <dl className="space-y-2.5 text-sm">
              <div className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-2">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-white/60 dark:text-white/65 night:text-slate-300 mb-1">{t('session.popup_username')}</dt>
                <dd className="text-base font-semibold leading-tight text-white truncate dark:text-gray-100 night:text-slate-100" title={sessionUserLine}>{sessionUserLine}</dd>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-2">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-white/60 dark:text-white/65 night:text-slate-300 mb-1">{t('session.popup_role')}</dt>
                <dd className="text-base font-semibold leading-tight text-white/95 dark:text-gray-100 night:text-slate-100">{roleLabel}</dd>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-2">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-white/60 dark:text-white/65 night:text-slate-300 mb-1">{t('session.popup_auth')}</dt>
                <dd className="leading-tight">
                  <span
                    className={
                      authMethod === 'ad'
                        ? 'inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 night:bg-blue-950/50 night:text-blue-200'
                        : 'inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-900/25 dark:text-amber-200 night:bg-amber-950/40 night:text-amber-200'
                    }
                  >
                    {authLabel}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className={`w-full flex items-center ${collapsed ? 'justify-center px-1 py-2.5' : 'gap-3 px-4 py-3'} rounded-xl text-red-300 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-300 ease-in-out`}
          title={collapsed ? t('sidebar.logout') : ''}
        >
          <SignOut size={iz} weight={collapsed ? 'bold' : 'regular'} />
          <span className={`font-medium transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-xs'}`} style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
            {t('sidebar.logout')}
          </span>
        </button>
      </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
