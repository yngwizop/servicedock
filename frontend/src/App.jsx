import React, { useEffect, useState } from "react";
import ServiceGrid from "./components/ServiceGrid";
import ShortcutGrid from "./components/ShortcutGrid";
import LoginModal from "./components/LoginModal";
import SettingsPanel from "./components/SettingsPanel";

// 🛠 Backend-URL anpassen je nach Setup
const BACKEND_URL = "http://192.168.178.83:8000";

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
  const [services, setServices] = useState([]);
  const [shortcuts, setShortcuts] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [activeTab, setActiveTab] = useState("services");

  const [appearance, setAppearance] = useState({
    bg_color: "#f0f2f5",
    bg_image_url: null,
    bg_opacity: 1.0,
    shortcut_cols: 6,
    service_cols: 6,
    text_color_light: "#1f2937", // NEU: Schriftfarbe für Light Mode
    text_color_dark: "#e5e7eb",  // NEU: Schriftfarbe für Dark Mode
  });
  const [editAppearance, setEditAppearance] = useState(appearance);

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
  }, []);

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
        setIsLoggedIn(true);
        setPassword("");
        setShowLogin(false);
        setLoginError("");
      } else {
        setLoginError("Falsches Passwort.");
      }
    } catch (err) {
      setLoginError("Login-Fehler. Läuft das Backend?");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setShowSettings(false);
  };

  // --- CRUD-Funktionen ---
  const addService = async (e) => { 
    e.preventDefault();
    if (!serviceName || !serviceUrl) return;
    await fetch(`${BACKEND_URL}/api/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  };

  const addShortcut = async (e) => { 
    e.preventDefault();
    if (!shortcutName || !shortcutUrl) return;
    await fetch(`${BACKEND_URL}/api/shortcuts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: shortcutName, url: shortcutUrl, icon: shortcutIcon }),
    });
    setShortcutName("");
    setShortcutUrl("");
    setShortcutIcon("");
    fetchData();
  };

  const deleteService = async (id) => { 
    await fetch(`${BACKEND_URL}/api/services/${id}`, { method: "DELETE" });
    fetchData();
  };

  const deleteShortcut = async (id) => { 
    await fetch(`${BACKEND_URL}/api/shortcuts/${id}`, { method: "DELETE" });
    fetchData();
  };

  const updateService = async (id, updatedData) => { 
    // Nutze die übergebenen Daten statt aus dem State zu suchen
    const serviceToUpdate = updatedData || services.find((s) => s.id === id);
    if (!serviceToUpdate) return;
    await fetch(`${BACKEND_URL}/api/services/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serviceToUpdate),
    });
    fetchData();
  };

  const updateShortcut = async (id, updatedData) => { 
    // Nutze die übergebenen Daten statt aus dem State zu suchen
    const shortcutToUpdate = updatedData || shortcuts.find((s) => s.id === id);
    if (!shortcutToUpdate) return;
    await fetch(`${BACKEND_URL}/api/shortcuts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shortcutToUpdate),
    });
    fetchData();
  };

  const saveAppearance = async () => { 
    await fetch(`${BACKEND_URL}/api/appearance`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editAppearance),
    });
    fetchAppearance();
    setShowSettings(false);
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
    // NEU: Intelligente Hintergrundfarbe per Inline-Style
    <div 
      className="relative min-h-screen" 
      style={{ backgroundColor: getBackgroundColor() }}
    >
      {/* 1. Hintergrundbild-Layer */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-500"
        style={bgImageStyle}
      ></div>

      {/* 2. Content-Layer */}
      <div className="relative z-10 min-h-screen p-8 md:p-12">
        {/* NEU: Schriftfarbe per Inline-Style */}
        <h1 
          className="text-4xl font-bold mb-8 transition-colors duration-300" 
          style={{ color: getTextColor() }}
        >
          Web Dashboard
        </h1>

        {/* === SERVICES (JETZT AUSGELAGERT) === */}
        <ServiceGrid
          services={services}
          setServices={setServices}
          isLoggedIn={isLoggedIn}
          colsClass={serviceColsClass}
          onUpdate={updateService}
          onDelete={deleteService}
          textColor={getTextColor()} // NEU: Schriftfarbe übergeben
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
        />
      </div>

      {/* 3. Admin-UI-Layer */}
      <div className="absolute bottom-6 right-6 z-20 flex gap-4 items-center">
        
        {/* Theme-Toggle-Button */}
        <button
          onClick={toggleTheme}
          className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-md p-3 rounded-full shadow-lg hover:shadow-xl transition-all text-xl hover:scale-110"
          title="Toggle Theme"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        {!isLoggedIn ? (
          <button
            onClick={() => setShowLogin(true)}
            className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-md p-3 rounded-full shadow-lg hover:shadow-xl transition-all text-xl hover:scale-110"
            title="Admin-Login"
          >
            🔒
          </button>
        ) : (
          <>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-md p-3 rounded-full shadow-lg hover:shadow-xl transition-all text-xl hover:scale-110"
              title="Einstellungen"
            >
              ⚙️
            </button>
            <button
              onClick={handleLogout}
              className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-md p-3 rounded-full shadow-lg hover:shadow-xl transition-all text-xl hover:scale-110"
              title="Logout"
            >
              🔓
            </button>
          </>
        )}
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
          onClose={() => setShowSettings(false)}
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
          currentTheme={theme} // NEU: Aktuelles Theme übergeben
        />
      )}
    </div>
  );
}

export default App;