import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
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
  isAdmin = true,
  displayName = null,
  authMethod = 'local',
  sessionUsername = null,
  userRole = 'admin',
}) {
  const { t } = useTranslation();
  const [dashDropdownOpen, setDashDropdownOpen] = useState(false);
  const dashTriggerRef = useRef(null);
  const dashDropdownRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

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

  const navItems = [
    { id: 'services', label: 'Dashboard', icon: HouseLine },
    ...(showProxmox && isAdmin ? [{ id: 'monitoring', label: 'Proxmox', icon: ComputerTower }] : []),
    ...(isAdmin ? [{ id: 'security', label: 'Security', icon: Vault }] : []),
    ...(isAdmin ? [{ id: 'settings', label: 'Settings', icon: SlidersHorizontal }] : []),
  ];

  return (
    <div className={`sidebar-no-scrollbar fixed left-0 top-0 h-screen ${collapsed ? 'w-20' : 'w-52'} transition-all duration-300 ease-in-out flex flex-col z-50 overflow-visible bg-transparent`}>
      {/* Logo/Header */}
      <div className="p-6">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} transition-all duration-300 ease-in-out`}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
            <img src="/servicedock-icon.svg" alt="Servicedock" className="w-10 h-10" />
          </div>
          <div className={`transition-all duration-300 ease-in-out ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>
            <h1 className="text-lg font-bold text-white dark:text-white whitespace-nowrap" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>Servicedock</h1>
            <p className="text-xs text-white/70 dark:text-gray-400 whitespace-nowrap" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>Dashboard</p>
          </div>
        </div>
      </div>

      {/* Dashboard Switcher */}
      {dashboards.length > 1 && (
        <div className="px-4 pb-1">
          <button
            ref={dashTriggerRef}
            onClick={() => setDashDropdownOpen(!dashDropdownOpen)}
            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'} ${collapsed ? 'px-2 py-2.5' : 'px-3.5 py-2.5'} rounded-xl transition-all duration-300 ease-in-out
              ${dashDropdownOpen
                ? 'bg-white/20 dark:bg-white/15 ring-1 ring-white/30'
                : 'bg-white/10 dark:bg-white/5 hover:bg-white/15 dark:hover:bg-white/10'
              }
            `}
            title={collapsed ? (activeDash?.name || 'Dashboard') : ''}
          >
            <ArrowsLeftRight size={18} weight="bold" className="text-white/80 shrink-0" />
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

      {/* Toggle Button */}
      <div className="px-4 py-3">
        <button
          onClick={onToggleCollapse}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} ${collapsed ? 'px-2 py-2' : 'px-4 py-2'} rounded-xl text-white dark:text-gray-300 hover:bg-white/15 dark:hover:bg-white/10 transition-all duration-300 ease-in-out`}
          title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        >
          {collapsed ? <CaretRight size={22} weight="bold" /> : <CaretLeft size={22} weight="bold" />}
          <span className={`font-medium transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-xs'}`} style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
            {t('sidebar.collapse_label')}
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} ${collapsed ? 'px-2 py-2' : 'px-4 py-3'} rounded-xl transition-all duration-300 ease-in-out ${
                isActive
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : 'text-white dark:text-gray-300 hover:bg-white/15 dark:hover:bg-white/10'
              }`}
              title={collapsed ? item.label : ''}
            >
              <Icon size={22} weight={isActive ? 'fill' : 'regular'} />
              <span className={`font-medium transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-xs'}`} style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 space-y-2">
        {/* Edit Mode Toggle – nur für Admins */}
        {isAdmin && (
        <button
          onClick={() => setEditMode && setEditMode(!editMode)}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} ${collapsed ? 'px-2 py-3' : 'px-4 py-3'} rounded-xl ${
            editMode
              ? 'bg-amber-500/80 text-white shadow-lg shadow-amber-500/30'
              : 'text-white dark:text-gray-300 hover:bg-white/15 dark:hover:bg-white/10'
          } transition-all duration-300 ease-in-out`}
          title={collapsed ? (editMode ? t('sidebar.end_edit') : t('sidebar.edit')) : ''}
        >
          <PencilSimple size={22} weight={editMode ? 'fill' : 'regular'} />
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
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} ${collapsed ? 'px-2 py-3' : 'px-4 py-3'} rounded-xl ${
            searchOpen
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
              : 'text-white dark:text-gray-300 hover:bg-white/15 dark:hover:bg-white/10'
          } transition-all duration-300 ease-in-out`}
          title={collapsed ? t('sidebar.search_shortcut') : ''}
        >
          <MagnifyingGlass size={22} weight={searchOpen ? 'bold' : 'regular'} />
          <span className={`font-medium transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-xs'}`} style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
            {t('sidebar.search')}
          </span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} ${collapsed ? 'px-2 py-3' : 'px-4 py-3'} rounded-xl text-white dark:text-gray-300 hover:bg-white/15 dark:hover:bg-white/10 transition-all duration-300 ease-in-out`}
          title={collapsed ? (theme === 'light' ? t('sidebar.theme_switch_night') : t('sidebar.theme_switch_standard')) : ''}
        >
          {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
          <span className={`font-medium transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-xs'}`} style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
            {theme === 'light' ? t('sidebar.theme_switch_night') : t('sidebar.theme_switch_standard')}
          </span>
        </button>

        {/* Angemeldeter Benutzer — Hover zeigt Details */}
        <div className="relative z-[60] group/sidebar-user">
          <div
            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} ${collapsed ? 'px-2 py-3' : 'px-4 py-3'} rounded-xl text-white dark:text-gray-300 hover:bg-white/15 dark:hover:bg-white/10 transition-all duration-300 ease-in-out cursor-default`}
            title={collapsed ? sessionPrimary : ''}
            role="status"
            aria-label={t('session.aria_label')}
          >
            <User size={22} weight="duotone" className="shrink-0 text-white/90" />
            <span
              className={`font-medium transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden text-left truncate ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-xs'}`}
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
            >
              {sessionPrimary}
            </span>
          </div>

          <div
            className={`
              absolute z-[100] min-w-[12.5rem] max-w-[16rem] rounded-2xl border border-gray-400/45 bg-white/55 p-3 text-left shadow-lg backdrop-blur-md
              dark:border-white/[0.12] dark:bg-slate-900/55 dark:shadow-black/20
              night:border-white/[0.08] night:bg-sd-night-950/65 night:shadow-black/40
              opacity-0 invisible scale-[0.98]
              group-hover/sidebar-user:opacity-100 group-hover/sidebar-user:visible group-hover/sidebar-user:scale-100
              transition-all duration-200 ease-out
              pointer-events-none group-hover/sidebar-user:pointer-events-auto
              ${collapsed
                /* Unten am Trigger ausrichten, Inhalt wächst nach oben — wirkt nicht mehr am Viewport-Boden gequetscht */
                ? 'bottom-0 left-[calc(100%-6px)] pl-2 w-[14rem]'
                : 'bottom-[calc(100%+2.75rem)] left-0 right-0 mx-0'}
            `}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 night:text-slate-400 mb-2.5">
              {t('session.menu_heading')}
            </div>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-[11px] font-medium text-gray-500 dark:text-gray-400 night:text-slate-400 mb-0.5">{t('session.popup_username')}</dt>
                <dd className="font-semibold text-gray-900 truncate dark:text-gray-100 night:text-slate-100" title={sessionUserLine}>{sessionUserLine}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-gray-500 dark:text-gray-400 night:text-slate-400 mb-0.5">{t('session.popup_role')}</dt>
                <dd className="font-semibold text-gray-900 dark:text-gray-100 night:text-slate-100">{roleLabel}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-gray-500 dark:text-gray-400 night:text-slate-400 mb-0.5">{t('session.popup_auth')}</dt>
                <dd>
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
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} ${collapsed ? 'px-2 py-3' : 'px-4 py-3'} rounded-xl text-red-300 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-300 ease-in-out`}
          title={collapsed ? t('sidebar.logout') : ''}
        >
          <SignOut size={22} />
          <span className={`font-medium transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-xs'}`} style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
            {t('sidebar.logout')}
          </span>
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
