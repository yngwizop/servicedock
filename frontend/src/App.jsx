import React, { useEffect, useState } from "react";

// 🛠 Backend-URL anpassen je nach Setup
const BACKEND_URL = "http://192.168.178.83:8000";

// --- Eigene Komponenten (mit neuem Styling) ---

// Komponente für den Ansichts-Modus einer Service-Karte
function ServiceCard({ service }) {
  // NEUE LOGIK: Prüfen, ob der Icon-String eine URL oder ein Emoji ist
  const isUrl = service.icon && (
    service.icon.includes('.') || service.icon.includes('/')
  );

  return (
    <a
      href={service.url}
      target="_blank"
      rel="noopener noreferrer"
      // Wir nutzen 'flex' für das "Icon links, Text rechts"-Layout
      className="flex items-start gap-4 bg-white/70 backdrop-blur-md shadow-lg rounded-xl p-4 transition-all duration-300 hover:shadow-xl hover:scale-[1.03]"
    >
      {/* Icon-Container (wird nur angezeigt, wenn service.icon existiert) */}
      {service.icon && (
        isUrl ? (
          // Pfad 1: Es ist eine URL (Bild)
          <div className="flex-shrink-0 bg-blue-100 text-blue-600 rounded-lg p-2.5 w-12 h-12 flex items-center justify-center">
            <img 
              src={service.icon} 
              alt={service.name} 
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          // Pfad 2: Es ist ein Emoji (Text)
          <div className="flex-shrink-0 bg-blue-100 rounded-lg p-2.5 w-12 h-12 flex items-center justify-center">
            <span className="text-2xl">
              {service.icon}
            </span>
          </div>
        )
      )}

      {/* Text-Container */}
      <div>
        <h3 className="font-semibold text-lg mb-0.5 text-gray-800">{service.name}</h3>
        <p className="text-sm text-gray-600">{service.description || "..."}</p>
      </div>
    </a>
  );
}

// Komponente für den Ansichts-Modus eines Shortcuts
function ShortcutLink({ shortcut }) {
  return (
    <a
      href={shortcut.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
    >
      {shortcut.name}
    </a>
  );
}

// --- Haupt-App ---

function App() {
  // --- State-Definitionen (unverändert) ---
  const [services, setServices] = useState([]);
  const [shortcuts, setShortcuts] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState("services");
  const [appearance, setAppearance] = useState({
    bg_color: "#f0f2f5",
    bg_image_url: null,
    bg_opacity: 1.0,
  });
  const [editAppearance, setEditAppearance] = useState(appearance);
  const [serviceName, setServiceName] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [serviceUrl, setServiceUrl] = useState("");
  const [serviceIcon, setServiceIcon] = useState("");
  const [shortcutName, setShortcutName] = useState("");
  const [shortcutUrl, setShortcutUrl] = useState("");

  // --- Daten-Fetching & Logik (unverändert) ---
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
      setAppearance(data);
      setEditAppearance(data);
    } catch (err) {
      console.error("Fehler beim Laden der Appearance:", err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAppearance();
  }, []);

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
      body: JSON.stringify({ name: shortcutName, url: shortcutUrl }),
    });
    setShortcutName("");
    setShortcutUrl("");
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
      body: JSON.stringify(editAppearance),
    });
    fetchAppearance();
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

  // --- RENDER (mit neuen Tailwind-Klassen) ---
  return (
    <div style={pageStyle} className="relative min-h-screen">
      {/* 1. Hintergrundbild-Layer */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-500" // Sanfter Übergang
        style={bgImageStyle}
      ></div>

      {/* 2. Content-Layer (darüber) */}
      <div className="relative z-10 min-h-screen p-8 md:p-12">
        <h1 className="text-4xl font-bold mb-8 text-gray-800">Web Dashboard</h1>

        {/* === SERVICES === */}
        <div className="mb-10">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">Services</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-5">
            {services.map((s) => (
              <div
                key={s.id}
                // NEUES STYLING: Zeigt im Edit-Modus einen blauen Ring
                className={`transition-all ${
                  isLoggedIn
                    ? "bg-white/90 backdrop-blur-sm shadow-lg rounded-xl p-4 ring-2 ring-blue-500/50"
                    : ""
                }`}
              >
                {isLoggedIn ? (
                  <>
                    <input
                      // NEUES STYLING: Schönere Inputs
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
                      // GEÄNDERTER PLACEHOLDER
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
                        // NEUES STYLING: Konsistente Buttons
                        className="bg-green-600 hover:bg-green-700 text-white p-1 px-3 rounded-md text-sm font-medium transition-colors"
                      >
                        Speichern
                      </button>
                      <button
                        onClick={() => deleteService(s.id)}
                        // NEUES STYLING: Weniger aggressiv, Hover-Effekt
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

        {/* === SHORTCUTS === */}
        <div className="mb-8 p-5 bg-white/60 backdrop-blur-lg shadow-lg rounded-xl">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">
            Shortcuts
          </h2>
          <div className="flex flex-col gap-3">
            {shortcuts.map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                {isLoggedIn ? (
                  <>
                    <input
                      className="border-gray-300 rounded p-1.5 flex-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
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
                      className="border-gray-300 rounded p-1.5 flex-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                      value={s.url}
                      onChange={(e) =>
                        setShortcuts(
                          shortcuts.map((sc) =>
                            sc.id === s.id ? { ...sc, url: e.target.value } : sc
                          )
                        )
                      }
                    />
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
                  </>
                ) : (
                  <ShortcutLink shortcut={s} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Admin-UI-Layer (unten rechts) */}
      <div className="absolute bottom-6 right-6 z-20 flex gap-4 items-center">
        {!isLoggedIn ? (
          <form
            onSubmit={handleLogin}
            // NEUES STYLING: Größerer Schatten, mehr padding
            className="bg-white p-4 rounded-lg shadow-xl flex gap-3 items-center"
          >
            <input
              type="password"
              placeholder="Admin-Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              // NEUES STYLING: Konsistente Inputs
              className="border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              // NEUES STYLING: Konsistente Buttons
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 px-4 rounded-md font-medium transition-colors"
            >
              Login
            </button>
            {loginError && (
              <p className="text-red-500 text-sm">{loginError}</p>
            )}
          </form>
        ) : (
          <>
            <button
              onClick={() => setShowSettings(!showSettings)}
              // NEUES STYLING: Schwebender Glas-Button
              className="bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg hover:shadow-xl transition-all text-xl hover:scale-110"
              title="Einstellungen"
            >
              ⚙️
            </button>
            <button
              onClick={handleLogout}
              className="bg-white/80 backdrop-blur-md p-2 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all font-medium"
            >
              Logout
            </button>
          </>
        )}
      </div>

      {/* 4. Settings-Panel (rechte Sidebar) */}
      {isLoggedIn && showSettings && (
        <div 
          // NEUES STYLING: Hellerer Glas-Effekt, größerer Schatten, mehr Padding
          className="absolute right-0 top-0 h-full w-96 bg-white/95 backdrop-blur-lg z-30 shadow-2xl p-6 overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Dashboard Settings</h2>
            <button onClick={() => setShowSettings(false)} className="text-3xl text-gray-500 hover:text-gray-800 transition-colors">&times;</button>
          </div>

          {/* Tab-Navigation */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab("services")}
              // NEUES STYLING: Klarere Hover- und Aktiv-Zustände
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

          {/* === Tab-Inhalt: Services === */}
          {activeTab === "services" && (
            <div className="space-y-6">
              <form
                onSubmit={addService}
                // NEUES STYLING: "Inset"-Look
                className="p-4 bg-white shadow-inner rounded-lg border border-gray-200"
              >
                <h3 className="font-semibold text-gray-700 mb-3">Neuen Service hinzufügen</h3>
                <div className="space-y-3">
                  <input placeholder="Name" value={serviceName} onChange={(e) => setServiceName(e.target.value)} className="border-gray-300 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                  <input placeholder="Beschreibung" value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)} className="border-gray-300 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                  <input placeholder="URL" value={serviceUrl} onChange={(e) => setServiceUrl(e.target.value)} className="border-gray-300 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                  <input 
                    // GEÄNDERTER PLACEHOLDER
                    placeholder="Icon URL oder Emoji ✉️" 
                    value={serviceIcon} onChange={(e) => setServiceIcon(e.target.value)} className="border-gray-300 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md font-medium w-full transition-colors">Hinzufügen</button>
                </div>
              </form>

              {/* Shortcut hinzufügen */}
              <form
                onSubmit={addShortcut}
                className="p-4 bg-white shadow-inner rounded-lg border border-gray-200"
              >
                <h3 className="font-semibold text-gray-700 mb-3">Neuen Shortcut hinzufügen</h3>
                <div className="space-y-3">
                  <input placeholder="Name" value={shortcutName} onChange={(e) => setShortcutName(e.target.value)} className="border-gray-300 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                  <input placeholder="URL" value={shortcutUrl} onChange={(e) => setShortcutUrl(e.target.value)} className="border-gray-300 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md font-medium w-full transition-colors">Hinzufügen</button>
                </div>
              </form>
            </div>
          )}

          {/* === Tab-Inhalt: Appearance === */}
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