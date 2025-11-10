import React, { useEffect, useState } from "react";
import ServiceGrid from "./components/ServiceGrid";
import ShortcutGrid from "./components/ShortcutGrid";
import ProxmoxGrid from "./components/ProxmoxGrid";
import SecurityDashboard from "./components/SecurityDashboard";
import SpotifyCard from "./components/SpotifyCard";
import LoginModal from "./components/LoginModal";
import SettingsPanel from "./components/SettingsPanel";
import ClockWidget from "./components/ClockWidget";
import WeatherWidget from "./components/WeatherWidget";
import { Moon, Sun, Lock, Gear, SignOut } from 'phosphor-react';
import { setAuthToken, getAuthToken, clearAuthToken, isAuthenticated, authenticatedFetch, getAuthHeaders } from './utils/auth';

// 🛠 Backend-URL anpassen je nach Setup
// Default: use REACT_APP_BACKEND_URL if provided, otherwise use same host the page was loaded from
// This allows opening the frontend at http://<VM_IP>:3000 and automatically target http://<VM_IP>:8000
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:8000`;

// NEU: Konstante für localStorage-Key (falls später wieder gebraucht)
const WEATHER_FIELDS_KEY = 'appearance_weather_fields';

// --- Haupt-App ---
function App() {
  // --- State-Definitionen ---

  // NEU: State für das Theme (light/dark)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  // NEU: Effekt, der die 'dark' Klasse zum <html> Tag hinzufügt/entfernt
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
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
  const [showLogin, setShowLogin] = useState(false);
  const [activeTab, setActiveTab] = useState("services");
  
  // NEU: Spotify Status State
  const [spotifyConfigured, setSpotifyConfigured] = useState(false);

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
  const fetchData = async () => { 
    try {
      const sRes = await fetch(`${BACKEND_URL}/api/services`);
      const servicesData = await sRes.json();
      setServices(servicesData);

      const scRes = await fetch(`${BACKEND_URL}/api/shortcuts`);
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
        weather_fields: data.weather_fields || ['temperature', 'humidity'] // NEU: Direkt aus Backend
      };

      setAppearance(safeData);
      setEditAppearance(safeData); 
    } catch (err) {
      console.error("Fehler beim Laden der Appearance:", err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAppearance();
    if (isLoggedIn) {
      fetchSpotifyStatus();
    }
  }, [isLoggedIn]);

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
    try {
      const res = await fetch(`${BACKEND_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password }),
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // Speichere JWT-Token
        setAuthToken(data.access_token, data.expires_in);
        
        setIsLoggedIn(true);
        setPassword("");
        setShowLogin(false);
        setLoginError("");
      } else {
        const errorData = await res.json().catch(() => ({}));
        setLoginError(errorData.detail || "Falsches Passwort.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setLoginError("Login-Fehler. Läuft das Backend?");
    }
  };

  const handleLogout = () => {
    clearAuthToken(); // Lösche JWT-Token
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
        body: JSON.stringify({ name: shortcutName, url: shortcutUrl, icon: shortcutIcon }),
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
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/services/reorder`, {
        method: "PUT",
        body: JSON.stringify(orderedIds),
      });
      if (!res.ok) {
        console.error("Failed to reorder services, reloading data");
        await fetchData();
      }
    } catch (err) {
      console.error("Failed to reorder services", err);
      if (err.message.includes('Session expired')) {
        setIsLoggedIn(false);
      }
      await fetchData();
    }
  };

  const reorderShortcuts = async (orderedIds) => {
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/shortcuts/reorder`, {
        method: "PUT",
        body: JSON.stringify(orderedIds),
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
    // Outer Container
    <div className="relative min-h-screen">
      {/* 1. Hintergrundfarbe-Layer - FIXED */}
      <div
        className="fixed inset-0 w-full h-full -z-10 pointer-events-none"
        style={{ backgroundColor: getBackgroundColor() }}
      ></div>

      {/* 2. Hintergrundbild-Layer - FIXED damit es nicht scrollt */}
      <div
        className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{
          ...bgImageStyle,
          backgroundAttachment: 'fixed',
          willChange: 'auto'
        }}
      ></div>

      {/* 3. Content-Layer - Flexbox für sticky footer */}
  <div className="relative z-10 flex flex-col min-h-screen pt-8 md:pt-12 pl-8 md:pl-12 pr-4 md:pr-6 pb-2 max-w-full overflow-x-hidden">
        {/* Header mit Titel und Uhr */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          {/* Titel (oben links) - mit Text-Shadow für bessere Lesbarkeit */}
          <h1 
            className="text-4xl font-bold transition-colors duration-300"
            style={{ 
              color: getTextColor(),
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)'
            }}
          >
            Web Dashboard
          </h1>
          
          {/* Widgets (oben rechts auf Desktop) */}
          <div className="flex items-center gap-6 max-w-full overflow-x-hidden">
            <WeatherWidget 
              city={appearance.weather_city} 
              textColor={getTextColor()}
              weatherFields={appearance.weather_fields || ['temperature','humidity']}
              onLocationChange={setWeatherLocationInfo}
            />
            
            {/* Moderner vertikaler Trenner */}
            <div className="hidden md:flex items-center">
              <div 
                className="w-px h-16 bg-gradient-to-b from-transparent via-current to-transparent opacity-30"
                style={{ color: getTextColor() }}
                aria-hidden="true"
              />
            </div>
            
            <ClockWidget 
              textColor={getTextColor()} 
              use24Hour={appearance.clock_format === '24h'}
            />
          </div>
        </div>

        {/* === TAB NAVIGATION & SPOTIFY WIDGET === */}
        <div className="flex justify-between items-start gap-4 mb-8">
          {/* Tab Navigation - Links (eigener Container) */}
          <div className="flex gap-4 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-xl px-4 pt-3 pb-2 border border-gray-300/50 dark:border-gray-600/50 shadow-lg">
            <button
              onClick={() => setActiveTab("services")}
              className={`px-5 py-2.5 text-lg font-semibold transition-all rounded-lg ${
                activeTab === "services"
                  ? "bg-blue-500/20 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-200/30 dark:hover:bg-gray-700/30 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
              style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}
            >
              Services & Shortcuts
            </button>
            <button
              onClick={() => setActiveTab("monitoring")}
              className={`px-5 py-2.5 text-lg font-semibold transition-all rounded-lg ${
                activeTab === "monitoring"
                  ? "bg-blue-500/20 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-200/30 dark:hover:bg-gray-700/30 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
              style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}
            >
              Proxmox Monitoring
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`px-5 py-2.5 text-lg font-semibold transition-all rounded-lg ${
                activeTab === "security"
                  ? "bg-blue-500/20 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-200/30 dark:hover:bg-gray-700/30 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
              style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}
            >
              Security
            </button>
          </div>

          {/* Spotify Widget - Rechts (nur anzeigen wenn konfiguriert) */}
          {spotifyConfigured && (
            <div className="flex-shrink-0">
              <SpotifyCard />
            </div>
          )}
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
            className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-md p-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110"
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
          </button>

          {!isLoggedIn ? (
            <button
              onClick={() => setShowLogin(true)}
              className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-md p-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110"
              title="Admin-Login"
            >
              <Lock size={24} />
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-md p-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110"
                title="Einstellungen"
              >
                <Gear size={24} />
              </button>
              <button
                onClick={handleLogout}
                className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-md p-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110"
                title="Logout"
              >
                <SignOut size={24} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 4. Login-Modal (AUSGELAGERT) */}
      {showLogin && !isLoggedIn && (
        <LoginModal
          onSubmit={handleLogin}
          password={password}
          setPassword={setPassword}
          error={loginError}
          onClose={() => {
            setShowLogin(false);
            setLoginError("");
          }}
        />
      )}

      {/* 5. Settings-Panel (AUSGELAGERT) */}
      {isLoggedIn && showSettings && (
        <SettingsPanel
          onClose={() => {
            setShowSettings(false);
            fetchSpotifyStatus(); // Spotify-Status neu laden
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
        />
      )}
    </div>
  );
}

export default App;