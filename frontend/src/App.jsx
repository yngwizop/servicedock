import React, { useEffect, useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import ServiceGrid from "./components/ServiceGrid";
import ShortcutGrid from "./components/ShortcutGrid";
import ProxmoxGrid from "./components/ProxmoxGrid";
import SecurityDashboard from "./components/SecurityDashboard";
import SpotifyCard from "./components/SpotifyCard";
import LoginModal from "./components/LoginModal";
import SettingsPanel from "./components/SettingsPanel";
import ClockWidget from "./components/ClockWidget";
import WeatherWidget from "./components/WeatherWidget";
import { Moon, Sun, Lock, Gear, SignOut, CaretDown } from 'phosphor-react';
import { setAuthSession, clearAuthSession, isAuthenticated, authenticatedFetch, getAuthHeaders } from './utils/auth';

// 🛠 Backend-URL anpassen je nach Setup
// Mit Nginx Reverse Proxy: Backend läuft über gleichen Host (kein Port nötig)
// Ohne Nginx: Nutze REACT_APP_BACKEND_URL aus .env
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
  (window.location.port === '' ? 
    // Mit Nginx (Standard Ports 80/443) - kein Port in URL
    `${window.location.protocol}//${window.location.hostname}` :
    // Direkter Zugriff (Development) - mit Port 8000
    `${window.location.protocol}//${window.location.hostname}:8000`
  );

// NEU: Konstante für localStorage-Key (falls später wieder gebraucht)
const WEATHER_FIELDS_KEY = 'appearance_weather_fields';

// --- Haupt-App ---
function App() {
  // --- State-Definitionen ---

  // NEU: State für das Theme (light/dark)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  // NEU: Effekt, der die 'dark' Klasse zum <html> Tag hinzufügt/entfernt
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      
      // Gradient Background für Dark Mode
      document.body.style.backgroundColor = '#020617'; // Slate 950
      document.body.style.backgroundImage = `
        radial-gradient(at 0% 0%, hsla(253, 16%, 7%, 1) 0px, transparent 50%),
        radial-gradient(at 50% 0%, hsla(225, 39%, 25%, 1) 0px, transparent 50%),
        radial-gradient(at 100% 0%, hsla(339, 49%, 30%, 1) 0px, transparent 50%),
        radial-gradient(at 0% 50%, hsla(217, 71%, 35%, 1) 0px, transparent 50%),
        radial-gradient(at 100% 50%, hsla(291, 44%, 28%, 1) 0px, transparent 50%),
        radial-gradient(at 0% 100%, hsla(261, 48%, 32%, 1) 0px, transparent 50%),
        radial-gradient(at 50% 100%, hsla(228, 35%, 22%, 1) 0px, transparent 50%),
        radial-gradient(at 100% 100%, hsla(203, 45%, 28%, 1) 0px, transparent 50%)
      `;
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      
      // Gradient Background für Light Mode - Heller und freundlicher
      document.body.style.backgroundColor = '#e2e8f0'; // Slate 200
      document.body.style.backgroundImage = `
        radial-gradient(at 0% 0%, hsla(210, 40%, 85%, 1) 0px, transparent 50%),
        radial-gradient(at 50% 0%, hsla(215, 50%, 90%, 1) 0px, transparent 50%),
        radial-gradient(at 100% 0%, hsla(280, 45%, 88%, 1) 0px, transparent 50%),
        radial-gradient(at 0% 50%, hsla(195, 60%, 82%, 1) 0px, transparent 50%),
        radial-gradient(at 100% 50%, hsla(270, 50%, 85%, 1) 0px, transparent 50%),
        radial-gradient(at 0% 100%, hsla(230, 55%, 86%, 1) 0px, transparent 50%),
        radial-gradient(at 50% 100%, hsla(210, 50%, 88%, 1) 0px, transparent 50%),
        radial-gradient(at 100% 100%, hsla(185, 55%, 84%, 1) 0px, transparent 50%)
      `;
    }
    document.body.style.minHeight = '100vh';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
  }, [theme]);

  // NEU: Funktion zum Umschalten des Themes
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };
  
  // --- (DEINE BESTEHENDEN STATES) ---
  // Wetter-Geocoding Info für SettingsPanel
  const [weatherLocationInfo, setWeatherLocationInfo] = useState(null);
  const [services, setServices] = useState([]);
  const [shortcuts, setShortcuts] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated()); // Prüfe Token beim Start
  const [showSettings, setShowSettings] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  // Login-Modal wird direkt beim App-Start angezeigt, solange nicht eingeloggt
  const [activeTab, setActiveTab] = useState("services");
  
  // Login rate limiting state
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
  const [loginDisabled, setLoginDisabled] = useState(false);
  const [loginDisabledUntil, setLoginDisabledUntil] = useState(null);
  
  // NEU: Spotify Status State
  const [spotifyConfigured, setSpotifyConfigured] = useState(false);

  // NEU: Multi-Dashboard State
  const [dashboards, setDashboards] = useState([]);
  const [activeDashboard, setActiveDashboard] = useState(() => {
    const saved = localStorage.getItem('activeDashboard');
    return saved ? parseInt(saved, 10) : 1; // Default: Dashboard 1
  });
  const [dashboardDropdownOpen, setDashboardDropdownOpen] = useState(false);

  const [appearance, setAppearance] = useState({
    bg_color: "#f0f2f5",
    bg_image_url: null,
    bg_opacity: 1.0,
    shortcut_cols: 6,
    service_cols: 6,
    text_color_light: "#1f2937", // NEU: Schriftfarbe für Light Mode
    text_color_dark: "#e5e7eb",  // NEU: Schriftfarbe für Dark Mode
    clock_format: "24h",         // NEU: Uhrenformat
    weather_city: "Berlin",      // NEU: Stadt für Wetter-Widget
  });
  const [editAppearance, setEditAppearance] = useState(appearance);
  const [isSavingAppearance, setIsSavingAppearance] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  // Form-Felder für Settings-Panel
  const [serviceName, setServiceName] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [serviceUrl, setServiceUrl] = useState("");
  const [serviceIcon, setServiceIcon] = useState("");
  const [shortcutName, setShortcutName] = useState("");
  const [shortcutUrl, setShortcutUrl] = useState("");
  const [shortcutIcon, setShortcutIcon] = useState("");

  // --- (DEINE BESTEHENDEN FUNKTIONEN) ---
  
  // NEU: Fetch Dashboards
  const fetchDashboards = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/dashboards`);
      const data = await res.json();
      setDashboards(data);
      
      // Validate active dashboard still exists
      if (activeDashboard && !data.find(d => d.id === activeDashboard)) {
        setActiveDashboard(1); // Fallback to default
        localStorage.setItem('activeDashboard', '1');
      }
    } catch (err) {
      console.error("Fehler beim Laden der Dashboards:", err);
    }
  };

  // NEU: Switch Dashboard
  const switchDashboard = (dashboardId) => {
    setActiveDashboard(dashboardId);
    localStorage.setItem('activeDashboard', dashboardId.toString());
  };

  const fetchData = async () => { 
    try {
      const sRes = await fetch(`${BACKEND_URL}/api/services?dashboard_id=${activeDashboard}`);
      const servicesData = await sRes.json();
      setServices(servicesData);

      const scRes = await fetch(`${BACKEND_URL}/api/shortcuts?dashboard_id=${activeDashboard}`);
      const shortcutsData = await scRes.json();
      setShortcuts(shortcutsData);
    } catch (err) {
      console.error("Fehler beim Laden der Daten:", err);
    }
  };

  const fetchAppearance = async () => { 
    try {
      const res = await fetch(`${BACKEND_URL}/api/appearance`);
      const data = await res.json();
      const safeData = {
        bg_color: data.bg_color || "#f0f2f5", 
        bg_image_url: data.bg_image_url || null,
        bg_opacity: (data.bg_opacity !== null && data.bg_opacity !== undefined) ? data.bg_opacity : 1.0, 
        shortcut_cols: data.shortcut_cols || 6,
        service_cols: data.service_cols || 6,
        text_color_light: data.text_color_light || "#1f2937", // NEU
        text_color_dark: data.text_color_dark || "#e5e7eb",   // NEU
        clock_format: data.clock_format || "24h",             // NEU
        weather_city: data.weather_city || "Berlin",          // NEU
        weather_fields: data.weather_fields || ['temperature', 'humidity'], // NEU: Direkt aus Backend
        show_spotify: data.show_spotify !== undefined ? data.show_spotify : true,
        show_weather: data.show_weather !== undefined ? data.show_weather : true,
        show_clock: data.show_clock !== undefined ? data.show_clock : true
      };

      setAppearance(safeData);
      setEditAppearance(safeData); 
    } catch (err) {
      console.error("Fehler beim Laden der Appearance:", err);
    }
  };

  useEffect(() => {
    fetchDashboards();
    fetchData();
    fetchAppearance();
    if (isLoggedIn) {
      fetchSpotifyStatus();
    }
  }, [isLoggedIn]);

  // NEU: Re-fetch data when active dashboard changes
  useEffect(() => {
    fetchData();
  }, [activeDashboard]);

  // NEU: Funktion zum Abrufen des Spotify-Status (braucht Auth!)
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

  // --- Auth-Funktionen ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    
    // Check if login is disabled
    if (loginDisabled) {
      const remainingTime = Math.ceil((loginDisabledUntil - Date.now()) / 1000);
      setLoginError(`Zu viele Fehlversuche. Bitte warte ${remainingTime} Sekunden.`);
      return;
    }
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/login`, {
        method: "POST",
        credentials: "include", // Important: Allow cookies
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password }),
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // Set session flag (token is in httpOnly cookie)
        setAuthSession();
        
        setIsLoggedIn(true);
        setPassword("");
        setShowLogin(false);
        setLoginError("");
        setFailedLoginAttempts(0); // Reset counter on success
      } else {
        const errorData = await res.json().catch(() => ({}));
        const newAttempts = failedLoginAttempts + 1;
        setFailedLoginAttempts(newAttempts);
        
        // Disable login after 3 failed attempts
        if (newAttempts >= 3) {
          const disabledUntil = Date.now() + 30000; // 30 seconds
          setLoginDisabled(true);
          setLoginDisabledUntil(disabledUntil);
          setLoginError("Zu viele Fehlversuche. Login für 30 Sekunden gesperrt.");
          
          // Re-enable after 30 seconds
          setTimeout(() => {
            setLoginDisabled(false);
            setLoginDisabledUntil(null);
            setFailedLoginAttempts(0);
          }, 30000);
        } else {
          setLoginError(errorData.detail || `Falsches Passwort. (${newAttempts}/3 Versuche)`);
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setLoginError("Login-Fehler. Läuft das Backend?");
    }
  };

  const handleLogout = async () => {
    try {
      // Call backend logout to clear cookie
      await fetch(`${BACKEND_URL}/api/logout`, {
        method: "POST",
        credentials: "include"
      });
    } catch (err) {
      console.error("Logout error:", err);
    }
    
    // Clear local session flag
    clearAuthSession(); // Lösche JWT-Token
    setIsLoggedIn(false);
    setShowSettings(false);
  };

  // --- CRUD-Funktionen ---
  const addService = async (e) => { 
    e.preventDefault();
    if (!serviceName || !serviceUrl) return;
    
    try {
      await authenticatedFetch(`${BACKEND_URL}/api/services`, {
        method: "POST",
        body: JSON.stringify({
          name: serviceName,
          description: serviceDesc,
          url: serviceUrl,
          icon: serviceIcon,
          dashboard_id: activeDashboard, // NEU: Füge aktuelles Dashboard hinzu
        }),
      });
      setServiceName("");
      setServiceDesc("");
      setServiceUrl("");
      setServiceIcon("");
      fetchData();
    } catch (err) {
      console.error("Error adding service:", err);
      if (err.message.includes('Session expired')) {
        setIsLoggedIn(false);
        setLoginError("Session abgelaufen. Bitte neu einloggen.");
        setShowLogin(true);
      }
    }
  };

  const addShortcut = async (e) => { 
    e.preventDefault();
    if (!shortcutName || !shortcutUrl) return;
    
    try {
      await authenticatedFetch(`${BACKEND_URL}/api/shortcuts`, {
        method: "POST",
        body: JSON.stringify({ 
          name: shortcutName, 
          url: shortcutUrl, 
          icon: shortcutIcon,
          dashboard_id: activeDashboard // NEU: Füge aktuelles Dashboard hinzu
        }),
      });
      setShortcutName("");
      setShortcutUrl("");
      setShortcutIcon("");
      fetchData();
    } catch (err) {
      console.error("Error adding shortcut:", err);
      if (err.message.includes('Session expired')) {
        setIsLoggedIn(false);
        setLoginError("Session abgelaufen. Bitte neu einloggen.");
        setShowLogin(true);
      }
    }
  };

  const deleteService = async (id) => { 
    try {
      await authenticatedFetch(`${BACKEND_URL}/api/services/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      console.error("Error deleting service:", err);
      if (err.message.includes('Session expired')) {
        setIsLoggedIn(false);
      }
    }
  };

  const deleteShortcut = async (id) => { 
    try {
      await authenticatedFetch(`${BACKEND_URL}/api/shortcuts/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      console.error("Error deleting shortcut:", err);
      if (err.message.includes('Session expired')) {
        setIsLoggedIn(false);
      }
    }
  };

  const updateService = async (id, updatedData) => { 
    // Nutze die übergebenen Daten statt aus dem State zu suchen
    const serviceToUpdate = updatedData || services.find((s) => s.id === id);
    if (!serviceToUpdate) return;
    try {
      await authenticatedFetch(`${BACKEND_URL}/api/services/${id}`, {
        method: "PUT",
        body: JSON.stringify(serviceToUpdate),
      });
      fetchData();
    } catch (err) {
      console.error("Error updating service:", err);
      if (err.message.includes('Session expired')) {
        setIsLoggedIn(false);
      }
    }
  };

  const updateShortcut = async (id, updatedData) => { 
    // Nutze die übergebenen Daten statt aus dem State zu suchen
    const shortcutToUpdate = updatedData || shortcuts.find((s) => s.id === id);
    if (!shortcutToUpdate) return;
    try {
      await authenticatedFetch(`${BACKEND_URL}/api/shortcuts/${id}`, {
        method: "PUT",
        body: JSON.stringify(shortcutToUpdate),
      });
      fetchData();
    } catch (err) {
      console.error("Error updating shortcut:", err);
      if (err.message.includes('Session expired')) {
        setIsLoggedIn(false);
      }
    }
  };

  // NEU: Reihenfolge persistieren (warte auf Response, rollback nur bei Fehler)
  const reorderServices = async (orderedIds) => {
  console.log('[App] reorderServices called with:', orderedIds);
  try {
    const res = await authenticatedFetch(`${BACKEND_URL}/api/services/reorder`, {
      method: "PUT",
      body: JSON.stringify({ newOrder: orderedIds }),  // ✅ CORRECT - wrap in object
    });
    
    console.log('[App] Reorder response status:', res.status);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error("Failed to reorder services:", errorData);
      await fetchData(); // Reload to get correct order from backend
    } else {
      console.log('[App] Reorder successful');
    }
  } catch (err) {
    console.error("Failed to reorder services", err);
    if (err.message.includes('Session expired')) {
      setIsLoggedIn(false);
    }
    await fetchData(); // Reload to get correct order from backend
  }
};

  const reorderShortcuts = async (orderedIds) => {
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/shortcuts/reorder`, {
        method: "PUT",
        body: JSON.stringify({ newOrder: orderedIds }),  // ✅ FIXED - wrap in object
      });
      if (!res.ok) {
        console.error("Failed to reorder shortcuts, reloading data");
        await fetchData();
      }
    } catch (err) {
      console.error("Failed to reorder shortcuts", err);
      if (err.message.includes('Session expired')) {
        setIsLoggedIn(false);
      }
      await fetchData();
    }
  };

  const saveAppearance = async () => { 
    setIsSavingAppearance(true);

    // Ensure at least temperature+humidity are present
    const weatherFieldsSafe = (editAppearance.weather_fields && editAppearance.weather_fields.length)
      ? editAppearance.weather_fields
      : ['temperature','humidity'];

    const appearanceToSave = { ...editAppearance, weather_fields: weatherFieldsSafe };

    // Optimistic UI update: apply changes immediately
    setAppearance(appearanceToSave);
    setEditAppearance(appearanceToSave);

    try {
      await authenticatedFetch(`${BACKEND_URL}/api/appearance`, {
        method: "PUT",
        body: JSON.stringify(appearanceToSave),
      });
      // show brief confirmation (keep panel open, user requested manual close)
      setShowSaved(true);
      setTimeout(() => {
        setShowSaved(false);
      }, 1400);
    } catch (err) {
      console.error('Failed to save appearance:', err);
      if (err.message.includes('Session expired')) {
        setIsLoggedIn(false);
      }
      // Optionally: revert optimistic update by refetching from backend
    } finally {
      // try to reconcile server state in background
      fetchAppearance();
      setIsSavingAppearance(false);
    }
  };

  // --- Style-Objekte & Klassen ---
  
  // NEU: Intelligente Hintergrundfarbe
  // - Im Light Mode: Nutze die eingestellte bg_color
  // - Im Dark Mode: Nutze dunkelgrau (#111827), AUSSER der User hat eine andere Farbe gewählt
  const getBackgroundColor = () => {
    if (theme === 'dark') {
      // Wenn die Farbe noch die Standard-Hellfarbe ist, nutze dunkelgrau
      return appearance.bg_color === '#f0f2f5' ? '#111827' : appearance.bg_color;
    }
    // Im Light Mode: Nutze die eingestellte Farbe
    return appearance.bg_color;
  };

  // NEU: Funktion für Schriftfarbe je nach Theme
  const getTextColor = () => {
    return theme === 'light' ? appearance.text_color_light : appearance.text_color_dark;
  };

  const bgImageStyle = {
    backgroundImage: appearance.bg_image_url
      ? `url(${appearance.bg_image_url})`
      : "none",
    opacity: appearance.bg_opacity,
  };

  const gridColsLookup = {
    1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6',
    7: 'lg:grid-cols-7', 8: 'lg:grid-cols-8', 9: 'lg:grid-cols-9',
    10: 'lg:grid-cols-10', 11: 'lg:grid-cols-11', 12: 'lg:grid-cols-12',
  };
  const serviceColsClass = gridColsLookup[appearance.service_cols] || 'lg:grid-cols-6';
  const shortcutColsClass = gridColsLookup[appearance.shortcut_cols] || 'lg:grid-cols-6';

  // --- RENDER ---
  return (
    <ErrorBoundary>
    {/* Wenn nicht eingeloggt: Nur Login-Modal anzeigen, sonst App */}
    {!isLoggedIn ? (
      <LoginModal
        onSubmit={handleLogin}
        password={password}
        setPassword={setPassword}
        error={loginError}
        disabled={loginDisabled}
        appearance={appearance}
        onClose={() => {
          setLoginError("");
        }}
      />
    ) : (
    <div className="relative min-h-screen">
      {/* 1. Gradient Background - managed by useEffect (body) */}
      
      {/* 2. User-Custom Background Color Layer (optional) */}
      {appearance.bg_color && appearance.bg_color !== 'transparent' && (
        <div
          className="fixed inset-0 w-full h-full -z-10 pointer-events-none"
          style={{ 
            backgroundColor: appearance.bg_color,
            opacity: appearance.bg_opacity || 0.3 // Default 30% wenn kein Wert
          }}
        ></div>
      )}

      {/* 3. User-Custom Background Image Layer (optional) */}
      {appearance.bg_image_url && (
        <div
          className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat pointer-events-none -z-10"
          style={{
            backgroundImage: `url(${appearance.bg_image_url})`,
            opacity: appearance.bg_opacity,
            backgroundAttachment: 'fixed'
          }}
        ></div>
      )}

      {/* 4. Content-Layer */}
      <div className="relative z-10 flex flex-col min-h-screen pt-8 md:pt-12 pl-8 md:pl-12 pr-4 md:pr-6 pb-2 max-w-full overflow-x-hidden">
        {/* Header mit Titel und Widgets */}
        <div className="flex flex-col md:flex-row md:items-center mb-8 gap-4">
          {/* Titel mit Custom Dashboard Dropdown */}
          {activeTab === "services" && dashboards.length > 1 ? (
            <div className="relative">
              <button
                onClick={() => setDashboardDropdownOpen(!dashboardDropdownOpen)}
                className="flex items-center gap-3 text-4xl font-bold cursor-pointer focus:outline-none hover:opacity-90 transition-opacity"
                style={{ 
                  color: getTextColor(),
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                }}
              >
                {dashboards.find(d => d.id === activeDashboard)?.name || 'Dashboard'}
                <CaretDown 
                  size={32} 
                  weight="bold"
                  className={`transition-transform duration-200 ${dashboardDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>
              
              {/* Custom Glassmorphism Dropdown */}
              {dashboardDropdownOpen && (
                <>
                  {/* Backdrop zum Schließen */}
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setDashboardDropdownOpen(false)}
                  />
                  
                  {/* Dropdown Menu */}
                  <div className="absolute left-0 top-full mt-2 z-50 min-w-[250px] bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                    {dashboards.map((dashboard) => (
                      <button
                        key={dashboard.id}
                        onClick={() => {
                          switchDashboard(dashboard.id);
                          setDashboardDropdownOpen(false);
                        }}
                        className={`w-full text-left px-6 py-4 transition-all duration-150 ${
                          dashboard.id === activeDashboard
                            ? 'bg-white/20 dark:bg-white/15'
                            : 'hover:bg-white/10 dark:hover:bg-white/8'
                        }`}
                        style={{ color: getTextColor() }}
                      >
                        <div className="font-semibold text-lg">{dashboard.name}</div>
                        {dashboard.description && (
                          <div className="text-sm opacity-70 mt-1">{dashboard.description}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <h1 
              className="text-4xl font-bold drop-shadow-lg"
              style={{ color: getTextColor() }}
            >
              {dashboards.find(d => d.id === activeDashboard)?.name || 'Dashboard'}
            </h1>
          )}
          
          {/* Widgets - Dynamisch nebeneinander */}
          <div className="flex flex-wrap items-center gap-4 md:gap-6 md:ml-auto">
            
            {/* Weather Widget */}
            {appearance.show_weather && (
              <WeatherWidget 
                city={appearance.weather_city} 
                textColor={getTextColor()}
                weatherFields={appearance.weather_fields || ['temperature','humidity']}
                onLocationChange={setWeatherLocationInfo}
              />
            )}
            
            {/* Trenner nur wenn beide (Weather UND Clock) aktiv sind */}
            {appearance.show_weather && appearance.show_clock && (
              <div className="hidden md:flex items-center">
                <div 
                  className="w-px h-16 bg-gradient-to-b from-transparent via-current to-transparent opacity-30"
                  style={{ color: getTextColor() }}
                  aria-hidden="true"
                />
              </div>
            )}
            
            {/* Clock Widget */}
            {appearance.show_clock && (
              <ClockWidget 
                textColor={getTextColor()} 
                use24Hour={appearance.clock_format === '24h'}
              />
            )}
            
            {/* Trenner nur wenn (Weather ODER Clock) UND Spotify aktiv/konfiguriert sind UND Services Tab aktiv */}
            {(appearance.show_weather || appearance.show_clock) && appearance.show_spotify && spotifyConfigured && activeTab === "services" && (
              <div className="hidden md:flex items-center">
                <div 
                  className="w-px h-16 bg-gradient-to-b from-transparent via-current to-transparent opacity-30"
                  style={{ color: getTextColor() }}
                  aria-hidden="true"
                />
              </div>
            )}
            
            {/* Spotify Widget - Nur im Services Tab rendern */}
            {appearance.show_spotify && spotifyConfigured && activeTab === "services" && (
              <SpotifyCard />
            )}
          </div>
        </div>

        {/* === TAB NAVIGATION === */}
        <div className="flex gap-4 bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-xl px-4 pt-3 pb-2 border border-gray-400/60 dark:border-white/10 shadow-lg mb-8 w-fit">
          <button
            onClick={() => setActiveTab("services")}
            className={`px-5 py-2.5 text-lg font-semibold transition-all rounded-lg ${
              activeTab === "services"
                  ? "bg-blue-500/30 dark:bg-blue-500/20 border-b-2 border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-400 shadow-sm"
                  : "text-gray-800 dark:text-white/90 hover:bg-white/50 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Services & Shortcuts
            </button>
            {dashboards.find(d => d.id === activeDashboard)?.show_proxmox === true && (
              <button
                onClick={() => setActiveTab("monitoring")}
                className={`px-5 py-2.5 text-lg font-semibold transition-all rounded-lg ${
                  activeTab === "monitoring"
                    ? "bg-blue-500/30 dark:bg-blue-500/20 border-b-2 border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-400 shadow-sm"
                    : "text-gray-800 dark:text-white/90 hover:bg-white/50 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Proxmox Monitoring
              </button>
            )}
            <button
              onClick={() => setActiveTab("security")}
              className={`px-5 py-2.5 text-lg font-semibold transition-all rounded-lg ${
                activeTab === "security"
                  ? "bg-blue-500/30 dark:bg-blue-500/20 border-b-2 border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-400 shadow-sm"
                  : "text-gray-800 dark:text-white/90 hover:bg-white/50 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Security
            </button>
          </div>

        {/* === CONTENT BASED ON ACTIVE TAB === */}
        <div className="flex-grow">
          {activeTab === "services" && (
            <>
              {/* === SERVICES (JETZT AUSGELAGERT) === */}
              <ServiceGrid
              services={services}
              setServices={setServices}
              isLoggedIn={isLoggedIn}
              colsClass={serviceColsClass}
              onUpdate={updateService}
              onDelete={deleteService}
              textColor={getTextColor()} // NEU: Schriftfarbe übergeben
              onReorder={reorderServices} // NEU
            />

            {/* === SHORTCUTS (JETZT AUSGELAGERT) === */}
            <ShortcutGrid
              shortcuts={shortcuts}
              setShortcuts={setShortcuts}
              isLoggedIn={isLoggedIn}
              colsClass={shortcutColsClass}
              onUpdate={updateShortcut}
              onDelete={deleteShortcut}
              textColor={getTextColor()} // NEU: Schriftfarbe übergeben
              onReorder={reorderShortcuts} // NEU
            />
          </>
        )}

        {activeTab === "monitoring" && (
          <ProxmoxGrid 
            isLoggedIn={isLoggedIn}
            textColor={getTextColor()}
            activeDashboard={activeDashboard}
            onOpenSettings={() => {
              setShowSettings(true);
              setActiveTab("services"); // Wechsle zurück zu Services/Settings
            }}
          />
        )}

        {activeTab === "security" && (
          <SecurityDashboard 
            isLoggedIn={isLoggedIn}
            textColor={getTextColor()}
            onOpenSettings={() => {
              setShowSettings(true);
              setActiveTab("services");
            }}
          />
        )}
        </div>
        
        {/* === ADMIN BUTTONS AM ENDE DES CONTENTS === */}
        <div className="mt-auto pt-8 pb-2 flex justify-end gap-4 items-center">
          
          {/* Theme-Toggle-Button */}
          <button
            onClick={toggleTheme}
            className="bg-white/50 dark:bg-white/5 backdrop-blur-md border border-gray-400/60 dark:border-white/10 p-3 rounded-full shadow-lg hover:shadow-xl hover:bg-white/70 dark:hover:bg-white/10 hover:border-gray-500/70 dark:hover:border-white/20 transition-all hover:scale-110 text-gray-800 dark:text-white/90 hover:text-gray-900 dark:hover:text-white"
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
          </button>

          {/* Login-Button entfällt, da Login-Modal global */}
          {isLoggedIn && (
            <>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="bg-white/50 dark:bg-white/5 backdrop-blur-md border border-gray-400/60 dark:border-white/10 p-3 rounded-full shadow-lg hover:shadow-xl hover:bg-white/70 dark:hover:bg-white/10 hover:border-gray-500/70 dark:hover:border-white/20 transition-all hover:scale-110 text-gray-800 dark:text-white/90 hover:text-gray-900 dark:hover:text-white"
                title="Einstellungen"
              >
                <Gear size={24} />
              </button>
              <button
                onClick={handleLogout}
                className="bg-white/50 dark:bg-white/5 backdrop-blur-md border border-gray-400/60 dark:border-white/10 p-3 rounded-full shadow-lg hover:shadow-xl hover:bg-white/70 dark:hover:bg-white/10 hover:border-gray-500/70 dark:hover:border-white/20 transition-all hover:scale-110 text-gray-800 dark:text-white/90 hover:text-gray-900 dark:hover:text-white"
                title="Logout"
              >
                <SignOut size={24} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Login-Modal ist jetzt global und wird oben gerendert, wenn nicht eingeloggt */}

      {/* 5. Settings-Panel (AUSGELAGERT) */}
      {isLoggedIn && showSettings && (
        <SettingsPanel
          onClose={() => {
            setShowSettings(false);
            fetchSpotifyStatus(); // Spotify-Status neu laden
            fetchDashboards(); // NEU: Dashboards neu laden nach Änderungen
          }}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onAddService={addService}
          serviceName={serviceName}
          setServiceName={setServiceName}
          serviceDesc={serviceDesc}
          setServiceDesc={setServiceDesc}
          serviceUrl={serviceUrl}
          setServiceUrl={setServiceUrl}
          serviceIcon={serviceIcon}
          setServiceIcon={setServiceIcon}
          onAddShortcut={addShortcut}
          shortcutName={shortcutName}
          setShortcutName={setShortcutName}
          shortcutUrl={shortcutUrl}
          setShortcutUrl={setShortcutUrl}
          shortcutIcon={shortcutIcon}
          setShortcutIcon={setShortcutIcon}
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
        />
      )}
    </div>
    )}
    </ErrorBoundary>
  );
}

export default App;