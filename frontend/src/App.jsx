import React, { useEffect, useState } from "react";

// 🛠 Backend-URL anpassen je nach Setup
const BACKEND_URL = "http://192.168.178.83:8000";

// --- Eigene Komponenten (unverändert) ---

function ServiceCard({ service }) {
  const isUrl = service.icon && (
    service.icon.includes('.') || service.icon.includes('/')
  );

  return (
    <a
      href={service.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-4 bg-white/70 backdrop-blur-md shadow-lg rounded-xl p-4 transition-all duration-300 hover:shadow-xl hover:scale-[1.03]"
    >
      {service.icon && (
        isUrl ? (
          <div className="flex-shrink-0 bg-blue-100 text-blue-600 rounded-lg p-2.5 w-12 h-12 flex items-center justify-center">
            <img 
              src={service.icon} 
              alt={service.name} 
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="flex-shrink-0 bg-blue-100 rounded-lg p-2.5 w-12 h-12 flex items-center justify-center">
            <span className="text-2xl">
              {service.icon}
            </span>
          </div>
        )
      )}
      <div>
        <h3 className="font-semibold text-lg mb-0.5 text-gray-800">{service.name}</h3>
        <p className="text-sm text-gray-600">{service.description || "..."}</p>
      </div>
    </a>
  );
}

function ShortcutLink({ shortcut }) {
  const isUrl = shortcut.icon && (
    shortcut.icon.includes('.') || shortcut.icon.includes('/')
  );
  
  const displayUrl = (url) => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname.replace('www.', '');
    } catch (e) {
      return url.replace('https://', '').replace('http://', '');
    }
  };

  return (
    <a
      href={shortcut.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-4 bg-white/70 backdrop-blur-md shadow-lg rounded-xl p-4 transition-all duration-300 hover:shadow-xl hover:scale-[1.03]"
    >
      {shortcut.icon && (
        <div className={`flex-shrink-0 rounded-lg p-2 w-10 h-10 flex items-center justify-center ${isUrl ? 'bg-white/80' : 'bg-gray-200/80'}`}>
          {isUrl ? (
            <img src={shortcut.icon} alt={shortcut.name} className="w-full h-full object-contain"/>
          ) : (
            <span className="text-xl">{shortcut.icon}</span>
          )}
        </div>
      )}
      <div className="flex-grow overflow-hidden">
        <h3 className="font-semibold text-gray-800 truncate">{shortcut.name}</h3>
      </div>
      <div className="flex-shrink-0">
        <p className="text-sm text-gray-600">{displayUrl(shortcut.url)}</p>
      </div>
    </a>
  );
}


// --- Haupt-App ---

function App() {
  // --- State-Definitionen ---
  const [services, setServices] = useState([]);
  const [shortcuts, setShortcuts] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [activeTab, setActiveTab] = useState("services");

  // NEU: Appearance State angepasst
  const [appearance, setAppearance] = useState({
    bg_color: "#f0f2f5",
    bg_image_url: null,
    bg_opacity: 1.0,
    shortcut_cols: 6, // <-- Default hinzugefügt
    service_cols: 6,  // <-- Default hinzugefügt
  });
  const [editAppearance, setEditAppearance] = useState(appearance);

  // Form-Felder
  const [serviceName, setServiceName] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [serviceUrl, setServiceUrl] = useState("");
  const [serviceIcon, setServiceIcon] = useState("");
  const [shortcutName, setShortcutName] = useState("");
  const [shortcutUrl, setShortcutUrl] = useState("");
  const [shortcutIcon, setShortcutIcon] = useState("");

  // --- Daten-Fetching (unverändert) ---
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
        ...data,
        shortcut_cols: data.shortcut_cols || 6,
        service_cols: data.service_cols || 6, // <-- NEU HIER
      };
      setAppearance(data);
      setEditAppearance(data); // WICHTIG: Edit-State auch setzen
    } catch (err) {
      console.error("Fehler beim Laden der Appearance:", err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAppearance();
  }, []);

  // --- Auth-Funktionen (unverändert) ---
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

  // --- CRUD-Funktionen (unverändert) ---
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

  const updateService = async (id) => { 
    const serviceToUpdate = services.find((s) => s.id === id);
    if (!serviceToUpdate) return;
    await fetch(`${BACKEND_URL}/api/services/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serviceToUpdate),
    });
    fetchData();
  };

  const updateShortcut = async (id) => { 
    const shortcutToUpdate = shortcuts.find((s) => s.id === id);
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
      body: JSON.stringify(editAppearance), // Sendet jetzt shortcut_cols mit
    });
    fetchAppearance(); // Holt die neuen Werte
    setShowSettings(false);
  };

  // --- Style-Objekte (unverändert) ---
  const pageStyle = {
    backgroundColor: appearance.bg_color,
  };

  const bgImageStyle = {
    backgroundImage: appearance.bg_image_url
      ? `url(${appearance.bg_image_url})`
      : "none",
    opacity: appearance.bg_opacity,
  };

  // --- NEU: Tailwind-sicherer Spalten-Look-up (für BEIDE Grids) ---
  // Wir müssen die vollen Klassennamen hier auflisten,
  // damit Tailwind sie bei der Kompilierung nicht entfernt.
  const gridColsLookup = { // <-- Umbenannt
    1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6',
    7: 'lg:grid-cols-7', 8: 'lg:grid-cols-8', 9: 'lg:grid-cols-9',
    10: 'lg:grid-cols-10', 11: 'lg:grid-cols-11', 12: 'lg:grid-cols-12',
  };
  // Wählt die Klasse basierend auf dem DB-Wert aus, oder nimmt 6 als Fallback
  const serviceColsClass = gridColsLookup[appearance.service_cols] || 'lg:grid-cols-6'; // <-- NEU
  const shortcutColsClass = gridColsLookup[appearance.shortcut_cols] || 'lg:grid-cols-6'; // <-- Nutzt jetzt gridColsLookup


  // --- RENDER ---
  return (
    <div style={pageStyle} className="relative min-h-screen">
      {/* 1. Hintergrundbild-Layer */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-500"
        style={bgImageStyle}
      ></div>

      {/* 2. Content-Layer */}
      <div className="relative z-10 min-h-screen p-8 md:p-12">
        <h1 className="text-4xl font-bold mb-8 text-gray-800">Web Dashboard</h1>

        {/* === SERVICES (Unverändert) === */}
        <div className="mb-10">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">Services</h2>
          {/* NEU: Klasse wird dynamisch gesetzt */}
          <div className={`grid grid-cols-2 md:grid-cols-3 ${serviceColsClass} gap-5`}>
            {services.map((s) => (
              <div
                key={s.id}
                className={`transition-all ${
                  isLoggedIn
                    ? "bg-white/90 backdrop-blur-sm shadow-lg rounded-xl p-4 ring-2 ring-blue-500/50"
                    : ""
                }`}
              >
                {isLoggedIn ? (
                  <>
                    <input
                      className="border-gray-300 rounded p-1.5 mb-2 w-full font-semibold text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                      value={s.name}
                      onChange={(e) =>
                        setServices(
                          services.map((serv) =>
                            serv.id === s.id
                              ? { ...serv, name: e.target.value }
                              : serv
                          )
                        )
                      }
                    />
                    <input
                      className="border-gray-300 rounded p-1.5 mb-2 w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                      value={s.description || ""}
                      onChange={(e) =>
                        setServices(
                          services.map((serv) =>
                            serv.id === s.id
                              ? { ...serv, description: e.target.value }
                              : serv
                          )
                        )
                      }
                    />
                    <input
                      className="border-gray-300 rounded p-1.5 mb-2 w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                      value={s.url}
                      onChange={(e) =>
                        setServices(
                          services.map((serv) =>
                            serv.id === s.id
                              ? { ...serv, url: e.target.value }
                              : serv
                          )
                        )
                      }
                    />
                    <input
                      placeholder="Icon URL oder Emoji ✉️"
                      className="border-gray-300 rounded p-1.5 mb-2 w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                      value={s.icon || ""}
                      onChange={(e) =>
                        setServices(
                          services.map((serv) =>
                            serv.id === s.id
                              ? { ...serv, icon: e.target.value }
                              : serv
                          )
                        )
                      }
                    />
                    <div className="flex justify-between items-center mt-2">
                      <button
                        onClick={() => updateService(s.id)}
                        className="bg-green-600 hover:bg-green-700 text-white p-1 px-3 rounded-md text-sm font-medium transition-colors"
                      >
                        Speichern
                      </button>
                      <button
                        onClick={() => deleteService(s.id)}
                        className="text-gray-500 hover:text-red-600 p-1 rounded-md transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </>
                ) : (
                  <ServiceCard service={s} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* === SHORTCUTS (JETZT DYNAMISCH) === */}
        <div className="mb-10">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">
            Shortcuts
          </h2>
          {/* NEU: Klasse wird dynamisch gesetzt */}
          <div className={`grid grid-cols-1 md:grid-cols-3 ${shortcutColsClass} gap-5`}>
            {shortcuts.map((s) => (
              <div
                key={s.id}
                className={`transition-all ${
                  isLoggedIn
                    ? "bg-white/90 backdrop-blur-sm shadow-lg rounded-xl p-4 ring-2 ring-blue-500/50"
                    : ""
                }`}
              >
                {isLoggedIn ? (
                  <>
                    <input
                      placeholder="Name"
                      className="border-gray-300 rounded p-1.5 mb-2 w-full font-semibold text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                      value={s.name}
                      onChange={(e) =>
                        setShortcuts(
                          shortcuts.map((sc) =>
                            sc.id === s.id ? { ...sc, name: e.target.value } : sc
                          )
                        )
                      }
                    />
                    <input
                      placeholder="URL"
                      className="border-gray-300 rounded p-1.5 mb-2 w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                      value={s.url}
                      onChange={(e) =>
                        setShortcuts(
                          shortcuts.map((sc) =>
                            sc.id === s.id ? { ...sc, url: e.target.value } : sc
                          )
                        )
                      }
                    />
                    <input
                      placeholder="Icon URL oder Emoji 🔗"
                      className="border-gray-300 rounded p-1.5 mb-2 w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                      value={s.icon || ""}
                      onChange={(e) =>
                        setShortcuts(
                          shortcuts.map((sc) =>
                            sc.id === s.id ? { ...sc, icon: e.target.value } : sc
                          )
                        )
                      }
                    />
                    <div className="flex justify-between items-center mt-2">
                      <button
                        onClick={() => updateShortcut(s.id)}
                        className="bg-green-600 hover:bg-green-700 text-white p-1.5 px-3 rounded-md text-sm font-medium transition-colors"
                      >
                        Speichern
                      </button>
                      <button
                        onClick={() => deleteShortcut(s.id)}
                        className="text-gray-500 hover:text-red-600 p-1 rounded-md transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </>
                ) : (
                  <ShortcutLink shortcut={s} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Admin-UI-Layer (unverändert) */}
      <div className="absolute bottom-6 right-6 z-20 flex gap-4 items-center">
        {!isLoggedIn ? (
          <button
            onClick={() => setShowLogin(true)}
            className="bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg hover:shadow-xl transition-all text-xl hover:scale-110"
            title="Admin-Login"
          >
            🔒
          </button>
        ) : (
          <>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg hover:shadow-xl transition-all text-xl hover:scale-110"
              title="Einstellungen"
            >
              ⚙️
            </button>
            <button
              onClick={handleLogout}
              className="bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg hover:shadow-xl transition-all text-xl hover:scale-110"
              title="Logout"
            >
              🔓
            </button>
          </>
        )}
      </div>

      {/* 4. Login-Modal (unverändert) */}
      {showLogin && !isLoggedIn && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <form
            onSubmit={handleLogin}
            className="bg-white p-6 rounded-xl shadow-2xl flex flex-col gap-4 w-80 relative"
          >
            <button 
              type="button" 
              onClick={() => {
                setShowLogin(false);
                setLoginError("");
              }} 
              className="absolute top-2 right-2 text-3xl text-gray-400 hover:text-gray-700 transition-colors"
            >
              &times;
            </button>
            <h3 className="text-xl font-semibold text-center text-gray-800">Admin-Login</h3>
            <input
              type="password"
              placeholder="Admin-Passwort"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 px-4 rounded-md font-medium transition-colors"
            >
              Login
            </button>
            {loginError && (
              <p className="text-red-500 text-sm text-center -mt-2">{loginError}</p>
            )}
          </form>
        </div>
      )}

      {/* 5. Settings-Panel (ANGEPASST) */}
      {isLoggedIn && showSettings && (
        <div 
          className="absolute right-0 top-0 h-full w-96 bg-white/95 backdrop-blur-lg z-30 shadow-2xl p-6 overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Dashboard Settings</h2>
            <button onClick={() => setShowSettings(false)} className="text-3xl text-gray-500 hover:text-gray-800 transition-colors">&times;</button>
          </div>

          {/* Tab-Navigation (unverändert) */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab("services")}
              className={`py-2 px-4 transition-all ${
                activeTab === "services"
                  ? "border-b-2 border-blue-600 text-blue-600 font-semibold"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Services & Shortcuts
            </button>
            <button
              onClick={() => setActiveTab("appearance")}
              className={`py-2 px-4 transition-all ${
                activeTab === "appearance"
                  ? "border-b-2 border-blue-600 text-blue-600 font-semibold"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Appearance
            </button>
          </div>

          {/* === Tab-Inhalt: Services (unverändert) === */}
          {activeTab === "services" && (
            <div className="space-y-6">
              <form
                onSubmit={addService}
                className="p-4 bg-white shadow-inner rounded-lg border border-gray-200"
              >
                <h3 className="font-semibold text-gray-700 mb-3">Neuen Service hinzufügen</h3>
                <div className="space-y-3">
                  <input placeholder="Name" value={serviceName} onChange={(e) => setServiceName(e.target.value)} className="border-gray-300 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                  <input placeholder="Beschreibung" value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)} className="border-gray-300 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                  <input placeholder="URL" value={serviceUrl} onChange={(e) => setServiceUrl(e.target.value)} className="border-gray-300 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                  <input 
                    placeholder="Icon URL oder Emoji ✉️" 
                    value={serviceIcon} onChange={(e) => setServiceIcon(e.target.value)} className="border-gray-300 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md font-medium w-full transition-colors">Hinzufügen</button>
                </div>
              </form>

              <form
                onSubmit={addShortcut}
                className="p-4 bg-white shadow-inner rounded-lg border border-gray-200"
              >
                <h3 className="font-semibold text-gray-700 mb-3">Neuen Shortcut hinzufügen</h3>
                <div className="space-y-3">
                  <input placeholder="Name" value={shortcutName} onChange={(e) => setShortcutName(e.target.value)} className="border-gray-300 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                  <input placeholder="URL" value={shortcutUrl} onChange={(e) => setShortcutUrl(e.target.value)} className="border-gray-300 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                  <input 
                    placeholder="Icon URL oder Emoji 🔗" 
                    value={shortcutIcon} 
                    onChange={(e) => setShortcutIcon(e.target.value)} 
                    className="border-gray-300 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md font-medium w-full transition-colors">Hinzufügen</button>
                </div>
              </form>
            </div>
          )}

          {/* === Tab-Inhalt: Appearance (ANGEPASST) === */}
{/* === Tab-Inhalt: Appearance (KORRIGIERT) === */}
           {activeTab === "appearance" && (
             <div className="space-y-4 p-1">
               <h3 className="font-semibold text-gray-700">Aussehen anpassen</h3>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                 <input
                   type="color"
                   value={editAppearance.bg_color || "#ffffff"}
                   onChange={(e) => setEditAppearance({ ...editAppearance, bg_color: e.target.value })}
                   className="w-full h-10 p-1 border border-gray-300 rounded-md"
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Background Image URL</label>
                 <input
                   type="text"
                   placeholder="https://..."
                   value={editAppearance.bg_image_url || ""}
                   onChange={(e) => setEditAppearance({ ...editAppearance, bg_image_url: e.target.value })}
                   className="border-gray-300 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Background Opacity ({editAppearance.bg_opacity})</label>
                 <input
                   type="range"
                   min="0"
                   max="1"
                   step="0.05"
                   value={editAppearance.bg_opacity}
                   onChange={(e) => setEditAppearance({ ...editAppearance, bg_opacity: parseFloat(e.target.value) })}
                   className="w-full"
                 />
               </div>

               {/* --- SLIDER FÜR SERVICES --- */}
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">
                   Service-Spalten (Desktop): {editAppearance.service_cols}
                 </label>
                 <input
                   type="range"
                   min="2"
                   max="10"
                   step="1"
                   value={editAppearance.service_cols}
                   onChange={(e) => setEditAppearance({ ...editAppearance, service_cols: parseInt(e.target.value) })}
                   className="w-full"
                 />
               </div>
               {/* --- ENDE SERVICE SLIDER --- */}

               {/* --- KORREKTER SHORTCUT SLIDER --- */}
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">
                   Shortcut-Spalten (Desktop): {editAppearance.shortcut_cols}
                 </label>
                 <input
                   type="range"
   _               min="2"
                   max="8"
                   step="1"
                   value={editAppearance.shortcut_cols}
                   onChange={(e) => setEditAppearance({ ...editAppearance, shortcut_cols: parseInt(e.target.value) })}
                   className="w-full"
                 />
               </div>
               {/* --- ENDE KORREKTER SLIDER --- */}

               <button
                 onClick={saveAppearance}
                 className="bg-green-600 hover:bg-green-700 text-white p-2.5 rounded-md w-full font-medium transition-colors"
               >
                 Save Changes
               </button>
             </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;