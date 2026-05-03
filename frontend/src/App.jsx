import React, { useEffect, useState, useRef } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import ServiceGrid from "./components/ServiceGrid";
import ShortcutGrid from "./components/ShortcutGrid";
import ProxmoxGrid from "./components/ProxmoxGrid";
import SecurityDashboard from "./components/SecurityDashboard";
import SpotifyCard from "./components/SpotifyCard";
import LoginModal from "./components/LoginModal";
import ChangePasswordModal from "./components/ChangePasswordModal";
import SettingsPage from "./components/SettingsPage";
import AddItemFAB from "./components/AddItemFAB";
import ClockWidget from "./components/ClockWidget";
import WeatherWidget from "./components/WeatherWidget";
import Sidebar from "./components/Sidebar";
import PageHeader from "./components/PageHeader";
import { authenticatedFetch } from './utils/auth';
import { fetchProxmoxVmBundle, fetchProxmoxClusterStatsPrefetch } from './utils/fetchProxmoxBundle';
import { useTranslation } from 'react-i18next';
import { HouseLine, ComputerTower, Vault, SlidersHorizontal } from 'phosphor-react';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useDashboards } from './hooks/useDashboards';
import { useAppearance } from './hooks/useAppearance';
import { useServices } from './hooks/useServices';

// 🛠 Backend-URL
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
  (window.location.port === '' ? 
    `${window.location.protocol}//${window.location.hostname}` :
    `${window.location.protocol}//${window.location.hostname}:8000`
  );

/** Ohne Wallpaper: Standard-Hellgrau/Weiß aus der API würde das Theme-Mesh vollständig verdecken (opacity oft 1). */
function shouldShowAppearanceColorTint(bg) {
  if (!bg?.bg_color || bg.bg_color === 'transparent') return false;
  const compact = String(bg.bg_color).trim().toLowerCase().replace(/^#/, '').replace(/\s/g, '');
  const ignoredWhenNoImage = ['f0f2f5', 'ffffff', 'f5f5f5', 'fff'];
  if (!bg.bg_image_url && ignoredWhenNoImage.includes(compact)) return false;
  return true;
}

// --- Haupt-App ---
function App() {
  const { t } = useTranslation();

  // === Custom Hooks ===
  const auth = useAuth();
  const { dashboards, activeDashboard, fetchDashboards, switchDashboard } = useDashboards({ onSessionExpired: auth.onSessionExpired });
  const {
    theme, toggleTheme,
    appearance, editAppearance, setEditAppearance,
    isSavingAppearance, showSaved,
    getTextColor, fetchAppearance, saveAppearance,
  } = useAppearance({ onSessionExpired: auth.onSessionExpired });
  const {
    services, setServices,
    shortcuts, setShortcuts,
    fetchData,
    deleteService, deleteShortcut,
    updateService, updateShortcut,
    reorderServices, reorderShortcuts,
  } = useServices({ activeDashboard, onSessionExpired: auth.onSessionExpired });

  // === Local UI State ===
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("services");
  const [spotifyConfigured, setSpotifyConfigured] = useState(false);
  const [weatherLocationInfo, setWeatherLocationInfo] = useState(null);
  /** Proxmox-Daten schon laden, bevor der VM/LXC-Tab geöffnet wird (entlastet ersten Klick). */
  const [proxmoxWarm, setProxmoxWarm] = useState(null);
  
  // Wallpaper für Login-Screen (public, kein Auth nötig)
  const [loginWallpaper, setLoginWallpaper] = useState(null);

  // === Wallpaper vor Login laden ===
  useEffect(() => {
    if (!auth.isLoggedIn) {
      fetch(`${BACKEND_URL}/api/appearance/wallpaper`)
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data) setLoginWallpaper(data); })
        .catch(() => {});
    }
  }, [auth.isLoggedIn]);

  // === Data Fetching on Login ===
  const fetchSpotifyStatus = async () => {
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/spotify/status`);
      if (res.ok) {
        const data = await res.json();
        setSpotifyConfigured(data.configured && data.connected);
      } else {
        setSpotifyConfigured(false);
      }
    } catch (err) {
      console.error("Fehler beim Laden des Spotify-Status:", err);
      setSpotifyConfigured(false);
    }
  };

  useEffect(() => {
    if (auth.isLoggedIn) {
      // Bei Login: Tab auf Dashboard setzen + Edit-Mode aus
      setActiveTab("services");
      setEditMode(false);
      fetchDashboards();
      fetchData();
      fetchAppearance();
      fetchSpotifyStatus();
    }
  }, [auth.isLoggedIn]);

  // Re-fetch data when active dashboard changes
  useEffect(() => {
    fetchData();
  }, [activeDashboard]);

  // Proxmox-Warmup: parallel zu Homelab, solange Proxmox für das aktive Dashboard aktiv ist
  useEffect(() => {
    if (!auth.isLoggedIn) {
      setProxmoxWarm(null);
      return;
    }
    const row = dashboards.find((d) => d.id === activeDashboard);
    if (!row?.show_proxmox) {
      setProxmoxWarm(null);
      return;
    }

    const rid = activeDashboard;
    let cancelled = false;
    setProxmoxWarm({ status: 'loading', dashboardId: rid });

    (async () => {
      const bundle = await fetchProxmoxVmBundle(rid);
      if (cancelled) return;
      setProxmoxWarm({
        status: 'ready',
        dashboardId: rid,
        bundle: { ...bundle, clusterStatsPrefetch: null },
      });
      if (!bundle.configured || !bundle.ok) return;

      void fetchProxmoxClusterStatsPrefetch(rid).then((pref) => {
        if (cancelled || !pref) return;
        setProxmoxWarm((prev) => {
          if (prev?.dashboardId !== rid || prev?.status !== 'ready') return prev;
          return {
            ...prev,
            bundle: { ...prev.bundle, clusterStatsPrefetch: pref },
          };
        });
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [auth.isLoggedIn, activeDashboard, dashboards]);

  // Keyboard Shortcut für globale Suche (Strg+F / Cmd+F)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'g')) {
        e.preventDefault();
        e.stopPropagation();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      if (e.key === 'F3') {
        e.preventDefault();
        e.stopPropagation();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        setSearchTerm("");
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [searchOpen]);

  // === Derived Values ===
  const gridColsLookup = {
    1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6',
    7: 'lg:grid-cols-7', 8: 'lg:grid-cols-8', 9: 'lg:grid-cols-9',
    10: 'lg:grid-cols-10', 11: 'lg:grid-cols-11', 12: 'lg:grid-cols-12',
  };
  const serviceColsClass = gridColsLookup[appearance.service_cols] || 'lg:grid-cols-6';
  const shortcutColsClass = gridColsLookup[appearance.shortcut_cols] || 'lg:grid-cols-6';

  const activeDash = dashboards.find((d) => d.id === activeDashboard);
  const pageHeaderColor = getTextColor();
  let pageTitle = 'Dashboard';
  let pageSubtitle = t('pageHeader.subtitle_services_default');
  let PageIcon = HouseLine;
  if (activeTab === 'services') {
    pageTitle = activeDash?.name || 'Dashboard';
    const desc = (activeDash?.description || '').trim();
    pageSubtitle = desc || t('pageHeader.subtitle_services_default');
    PageIcon = HouseLine;
  } else if (activeTab === 'monitoring') {
    pageTitle = 'Proxmox';
    pageSubtitle = t('pageHeader.subtitle_proxmox');
    PageIcon = ComputerTower;
  } else if (activeTab === 'security') {
    pageTitle = 'Security';
    pageSubtitle = t('pageHeader.subtitle_security');
    PageIcon = Vault;
  } else if (activeTab === 'settings') {
    pageTitle = 'Settings';
    pageSubtitle = t('pageHeader.subtitle_settings');
    PageIcon = SlidersHorizontal;
  }

  // Background-Daten: nach Login aus appearance, davor aus loginWallpaper
  const bg = auth.isLoggedIn ? appearance : (loginWallpaper || {});

  // === RENDER ===
  return (
    <ErrorBoundary>
    {/* Background-Layer: Mesh unten, optional Tint, Wallpaper oben (Tint nicht undurchsichtig über Default-Grau) */}
    <div className="fixed inset-0 w-full h-full -z-10 pointer-events-none">
      <div
        aria-hidden
        className={`absolute inset-0 ${theme === 'dark' ? 'sd-theme-mesh-night' : 'sd-theme-mesh-dim'}`}
      />
      {shouldShowAppearanceColorTint(bg) && (
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundColor: bg.bg_color,
            opacity: bg.bg_opacity ?? 0.3,
          }}
        />
      )}

      {bg.bg_image_url && (
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${bg.bg_image_url})`,
            opacity: bg.bg_opacity,
            backgroundAttachment: 'fixed',
          }}
        />
      )}
    </div>

    {/* Login or App */}
    {!auth.isLoggedIn ? (
      <LoginModal
        onSubmit={auth.handleLogin}
        password={auth.password}
        setPassword={auth.setPassword}
        username={auth.username}
        setUsername={auth.setUsername}
        adEnabled={auth.adEnabled}
        adDomain={auth.adDomain}
        error={auth.loginError}
        disabled={auth.loginDisabled}
        onClose={() => auth.setLoginError("")}
      />
    ) : auth.forcePasswordChange ? (
      <ChangePasswordModal
        onComplete={() => auth.setForcePasswordChange(false)}
        appearance={appearance}
      />
    ) : (
    <div className="relative min-h-screen">

      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        toggleTheme={toggleTheme}
        onLogout={auth.handleLogout}
        showProxmox={dashboards.find(d => d.id === activeDashboard)?.show_proxmox === true}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchInputRef={searchInputRef}
        dashboards={dashboards}
        activeDashboard={activeDashboard}
        switchDashboard={switchDashboard}
        editMode={editMode}
        setEditMode={setEditMode}
        isAdmin={auth.isAdmin}
        displayName={auth.displayName}
        authMethod={auth.authMethod}
      />

      {/* Main Content */}
      <div className={`${sidebarCollapsed ? 'ml-20' : 'ml-52'} transition-all duration-300 relative z-10 flex flex-col ${activeTab === 'settings' ? 'h-screen overflow-hidden' : 'min-h-screen'} pt-8 md:pt-12 pl-8 md:pl-12 pr-4 md:pr-6 pb-2`}>
        <PageHeader
          className={
            activeTab === 'settings' ? 'shrink-0 mx-auto w-full max-w-[1400px]' : ''
          }
          icon={PageIcon}
          title={pageTitle}
          subtitle={pageSubtitle}
          textColor={pageHeaderColor}
        >
          {(appearance.show_weather ||
            appearance.show_clock ||
            (appearance.show_spotify && spotifyConfigured && activeTab === 'services')) ? (
            <div className="flex flex-wrap items-center gap-4 md:gap-6">
              {appearance.show_weather && (
                <WeatherWidget
                  city={appearance.weather_city}
                  textColor={pageHeaderColor}
                  weatherFields={appearance.weather_fields || ['temperature', 'humidity']}
                  onLocationChange={setWeatherLocationInfo}
                />
              )}

              {appearance.show_weather && appearance.show_clock && (
                <div className="hidden md:flex items-center">
                  <div
                    className="h-16 w-px bg-gradient-to-b from-transparent via-current to-transparent opacity-30"
                    style={{ color: pageHeaderColor }}
                    aria-hidden="true"
                  />
                </div>
              )}

              {appearance.show_clock && (
                <ClockWidget textColor={pageHeaderColor} use24Hour={appearance.clock_format === '24h'} />
              )}

              {(appearance.show_weather || appearance.show_clock) &&
                appearance.show_spotify &&
                spotifyConfigured &&
                activeTab === 'services' && (
                  <div className="hidden md:flex items-center">
                    <div
                      className="h-16 w-px bg-gradient-to-b from-transparent via-current to-transparent opacity-30"
                      style={{ color: pageHeaderColor }}
                      aria-hidden="true"
                    />
                  </div>
                )}

              {appearance.show_spotify && spotifyConfigured && activeTab === 'services' && <SpotifyCard />}
            </div>
          ) : null}
        </PageHeader>

        {/* Search Overlay */}
        {searchOpen && (
          <div 
            className="fixed top-32 left-1/2 z-[70] w-full max-w-2xl px-4"
            style={{ 
              transform: 'translateX(-50%)',
              marginLeft: sidebarCollapsed ? '2.5rem' : '6.5rem'
            }}
          >
            <div className="bg-slate-900/92 dark:bg-slate-950/95 backdrop-blur-xl border border-white/12 dark:border-white/8 rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10 dark:border-white/8">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-400 dark:text-gray-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={
                    activeTab === 'services'
                      ? t('search.placeholder_services')
                      : activeTab === 'monitoring'
                        ? t('search.placeholder_monitoring')
                        : activeTab === 'settings'
                          ? t('search.placeholder_settings')
                          : activeTab === 'security'
                            ? t('search.placeholder_security')
                            : t('search.placeholder_services')
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-xl text-white placeholder-gray-500 dark:placeholder-gray-500"
                  autoFocus
                />
                <span className="text-xs text-gray-400 dark:text-gray-500 bg-white/10 dark:bg-white/5 px-2 py-1 rounded">
                  ESC
                </span>
              </div>
              <div className="px-6 py-3 text-sm text-gray-400 dark:text-gray-500">
                {searchTerm ? (
                  <span>{t('search.filter_by')} <strong>"{searchTerm}"</strong></span>
                ) : (
                  <span>{t('search.start_typing')}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* === CONTENT BASED ON ACTIVE TAB === */}
        <div className={`${activeTab === 'settings' ? 'flex-1 min-h-0 overflow-y-auto settings-scroll-fade' : 'flex-grow'} relative z-[65]`}>
          {activeTab === "services" && (
            <>
              <ServiceGrid
                services={services.filter(s =>
                  s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  s.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  s.url?.toLowerCase().includes(searchTerm.toLowerCase())
                )}
                setServices={setServices}
                isLoggedIn={auth.isLoggedIn}
                editMode={editMode}
                colsClass={serviceColsClass}
                onUpdate={updateService}
                onDelete={deleteService}
                textColor={getTextColor()}
                onReorder={reorderServices}
              />

              <ShortcutGrid
                shortcuts={shortcuts.filter(s =>
                  s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  s.url?.toLowerCase().includes(searchTerm.toLowerCase())
                )}
                setShortcuts={setShortcuts}
                isLoggedIn={auth.isLoggedIn}
                editMode={editMode}
                colsClass={shortcutColsClass}
                onUpdate={updateShortcut}
                onDelete={deleteShortcut}
                textColor={getTextColor()}
                onReorder={reorderShortcuts}
              />
            </>
          )}

          {activeTab === "monitoring" && (
            <ProxmoxGrid 
              isLoggedIn={auth.isLoggedIn}
              textColor={getTextColor()}
              activeDashboard={activeDashboard}
              searchTerm={searchTerm}
              onOpenSettings={() => setActiveTab('settings')}
              isAdmin={auth.isAdmin}
              proxmoxWarm={proxmoxWarm}
            />
          )}

          {activeTab === "security" && (
            <SecurityDashboard 
              isLoggedIn={auth.isLoggedIn}
              textColor={getTextColor()}
              activeDashboard={activeDashboard}
              searchTerm={searchTerm}
              onOpenSettings={() => setActiveTab('settings')}
            />
          )}

          {activeTab === "settings" && (
            <SettingsPage
              editAppearance={editAppearance}
              setEditAppearance={setEditAppearance}
              onSaveAppearance={saveAppearance}
              isSavingAppearance={isSavingAppearance}
              showSaved={showSaved}
              currentTheme={theme}
              weatherLocationInfo={weatherLocationInfo}
              dashboards={dashboards}
              activeDashboard={activeDashboard}
              onDashboardsChange={fetchDashboards}
              textColor={getTextColor()}
              isAdmin={auth.isAdmin}
              userRole={auth.userRole}
              searchTerm={searchTerm}
            />
          )}
        </div>
      </div>

      {/* FAB */}
      {auth.isLoggedIn && auth.isAdmin && activeTab === "services" && editMode && (
        <AddItemFAB
          activeDashboard={activeDashboard}
          onItemAdded={fetchData}
        />
      )}
    </div>
    )}
    </ErrorBoundary>
  );
}

export default App;
