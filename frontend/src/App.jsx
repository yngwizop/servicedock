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
import { authenticatedFetch } from './utils/auth';
import { useTranslation } from 'react-i18next';

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

  // Background-Daten: nach Login aus appearance, davor aus loginWallpaper
  const bg = auth.isLoggedIn ? appearance : (loginWallpaper || {});

  // === RENDER ===
  return (
    <ErrorBoundary>
    {/* Background-Layer */}
    <div className="fixed inset-0 w-full h-full -z-10">
      {bg.bg_color && bg.bg_color !== 'transparent' && (
        <div
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ 
            backgroundColor: bg.bg_color,
            opacity: bg.bg_opacity || 0.3
          }}
        ></div>
      )}

      {bg.bg_image_url && (
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat pointer-events-none"
          style={{
            backgroundImage: `url(${bg.bg_image_url})`,
            opacity: bg.bg_opacity,
            backgroundAttachment: 'fixed'
          }}
        ></div>
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
      <div className={`${sidebarCollapsed ? 'ml-20' : 'ml-52'} transition-all duration-300 relative z-10 flex flex-col min-h-screen pt-8 md:pt-12 pl-8 md:pl-12 pr-4 md:pr-6 pb-2`}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
            <h1 
              className="text-4xl font-bold"
              style={{ 
                color: getTextColor(),
                textShadow: '0 2px 4px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)'
              }}
            >
              {activeTab === 'services'
                ? (dashboards.find(d => d.id === activeDashboard)?.name || 'Dashboard')
                : activeTab === 'monitoring' ? 'Proxmox'
                : activeTab === 'security' ? 'Security'
                : activeTab === 'settings' ? 'Settings'
                : 'Dashboard'
              }
            </h1>
          </div>
          
          {/* Widgets */}
          <div className="flex flex-wrap items-center gap-4 md:gap-6 md:ml-auto">
            {appearance.show_weather && (
              <WeatherWidget 
                city={appearance.weather_city} 
                textColor={getTextColor()}
                weatherFields={appearance.weather_fields || ['temperature','humidity']}
                onLocationChange={setWeatherLocationInfo}
              />
            )}
            
            {appearance.show_weather && appearance.show_clock && (
              <div className="hidden md:flex items-center">
                <div 
                  className="w-px h-16 bg-gradient-to-b from-transparent via-current to-transparent opacity-30"
                  style={{ color: getTextColor() }}
                  aria-hidden="true"
                />
              </div>
            )}
            
            {appearance.show_clock && (
              <ClockWidget 
                textColor={getTextColor()} 
                use24Hour={appearance.clock_format === '24h'}
              />
            )}
            
            {(appearance.show_weather || appearance.show_clock) && appearance.show_spotify && spotifyConfigured && activeTab === "services" && (
              <div className="hidden md:flex items-center">
                <div 
                  className="w-px h-16 bg-gradient-to-b from-transparent via-current to-transparent opacity-30"
                  style={{ color: getTextColor() }}
                  aria-hidden="true"
                />
              </div>
            )}
            
            {appearance.show_spotify && spotifyConfigured && activeTab === "services" && (
              <SpotifyCard />
            )}
          </div>
        </div>

        {/* Search Overlay */}
        {searchOpen && (
          <div 
            className="fixed top-32 left-1/2 z-[70] w-full max-w-2xl px-4"
            style={{ 
              transform: 'translateX(-50%)',
              marginLeft: sidebarCollapsed ? '2.5rem' : '6.5rem'
            }}
          >
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-300/50 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-300/50 dark:border-white/10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-600 dark:text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={activeTab === 'services' ? t('search.placeholder_services') : activeTab === 'monitoring' ? t('search.placeholder_monitoring') : t('search.placeholder_security')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  autoFocus
                />
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                  ESC
                </span>
              </div>
              <div className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400">
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
        <div className="flex-grow relative z-[65]">
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
