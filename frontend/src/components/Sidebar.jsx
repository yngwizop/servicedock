import React from 'react';
import { 
  SquaresFour, 
  Desktop, 
  ShieldCheck, 
  Gear, 
  SignOut, 
  Moon, 
  Sun,
  CaretLeft,
  CaretRight,
  MagnifyingGlass
} from 'phosphor-react';

function Sidebar({ 
  activeTab, 
  setActiveTab, 
  theme, 
  toggleTheme, 
  onSettingsClick, 
  onLogout,
  showProxmox = false,
  collapsed = false,
  onToggleCollapse,
  searchOpen = false,
  setSearchOpen,
  searchTerm = "",
  setSearchTerm,
  searchInputRef
}) {
  const navItems = [
    { id: 'services', label: 'Dashboard', icon: SquaresFour },
    ...(showProxmox ? [{ id: 'monitoring', label: 'Proxmox', icon: Desktop }] : []),
    { id: 'security', label: 'Security', icon: ShieldCheck }
  ];

  return (
    <div className={`fixed left-0 top-0 h-screen ${collapsed ? 'w-20' : 'w-52'} transition-all duration-300 ease-in-out flex flex-col z-50 overflow-hidden`}>
      {/* Logo/Header */}
      <div className="p-6">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} transition-all duration-300 ease-in-out`}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
            <img src="/servicedock-icon.svg" alt="Servicedock" className="w-10 h-10" />
          </div>
          <div className={`transition-all duration-300 ease-in-out ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>
            <h1 className="text-lg font-bold text-white dark:text-white whitespace-nowrap">Servicedock</h1>
            <p className="text-xs text-white/70 dark:text-gray-400 whitespace-nowrap">Dashboard</p>
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <div className="px-4 py-3">
        <button
          onClick={onToggleCollapse}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} ${collapsed ? 'px-2 py-2' : 'px-4 py-2'} rounded-xl text-white dark:text-gray-300 hover:bg-white/70 dark:hover:bg-white/10 transition-all duration-300 ease-in-out`}
          title={collapsed ? 'Sidebar erweitern' : 'Sidebar reduzieren'}
        >
          {collapsed ? <CaretRight size={22} weight="bold" /> : <CaretLeft size={22} weight="bold" />}
          <span className={`font-medium transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-xs'}`}>
            Reduzieren
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
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
                  : 'text-white dark:text-gray-300 hover:bg-white/70 dark:hover:bg-white/10'
              }`}
              title={collapsed ? item.label : ''}
            >
              <Icon size={22} weight={isActive ? 'fill' : 'regular'} />
              <span className={`font-medium transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-xs'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 space-y-2">
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
              : 'text-white dark:text-gray-300 hover:bg-white/70 dark:hover:bg-white/10'
          } transition-all duration-300 ease-in-out`}
          title={collapsed ? 'Suche (Strg+F)' : ''}
        >
          <MagnifyingGlass size={22} weight={searchOpen ? 'bold' : 'regular'} />
          <span className={`font-medium transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-xs'}`}>
            Suche
          </span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} ${collapsed ? 'px-2 py-3' : 'px-4 py-3'} rounded-xl text-white dark:text-gray-300 hover:bg-white/70 dark:hover:bg-white/10 transition-all duration-300 ease-in-out`}
          title={collapsed ? (theme === 'light' ? 'Dark Mode' : 'Light Mode') : ''}
        >
          {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
          <span className={`font-medium transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-xs'}`}>
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </span>
        </button>

        {/* Settings */}
        <button
          onClick={onSettingsClick}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} ${collapsed ? 'px-2 py-3' : 'px-4 py-3'} rounded-xl text-white dark:text-gray-300 hover:bg-white/70 dark:hover:bg-white/10 transition-all duration-300 ease-in-out`}
          title={collapsed ? 'Einstellungen' : ''}
        >
          <Gear size={22} />
          <span className={`font-medium transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-xs'}`}>
            Einstellungen
          </span>
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} ${collapsed ? 'px-2 py-3' : 'px-4 py-3'} rounded-xl text-red-300 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-300 ease-in-out`}
          title={collapsed ? 'Abmelden' : ''}
        >
          <SignOut size={22} />
          <span className={`font-medium transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-xs'}`}>
            Abmelden
          </span>
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
