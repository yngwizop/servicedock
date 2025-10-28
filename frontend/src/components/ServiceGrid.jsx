import React from 'react';
import ServiceCard from './ServiceCard';

function ServiceGrid({ 
  services, 
  setServices, 
  isLoggedIn, 
  colsClass, 
  onUpdate, 
  onDelete,
  textColor // NEU: Schriftfarbe
}) {
  return (
    <div className="mb-10">
      {/* NEU: Schriftfarbe per Inline-Style */}
      <h2 
        className="text-2xl font-semibold mb-4"
        style={{ color: textColor }}
      >
        Services
      </h2>
      <div className={`grid grid-cols-2 md:grid-cols-3 ${colsClass} gap-5`}>
        {services.map((s) => (
          <div
            key={s.id}
            className={`transition-all ${
              isLoggedIn
                ? "bg-white/90 dark:bg-gray-700/90 backdrop-blur-sm shadow-lg rounded-xl p-4 ring-2 ring-blue-500/50"
                : ""
            }`}
          >
            {isLoggedIn ? (
              <>
                <input
                  className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded p-1.5 mb-2 w-full font-semibold text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
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
                  className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded p-1.5 mb-2 w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
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
                  className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded p-1.5 mb-2 w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
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
                  className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded p-1.5 mb-2 w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
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
                    onClick={() => onUpdate(s.id)}
                    className="bg-green-600 hover:bg-green-700 text-white p-1 px-3 rounded-md text-sm font-medium transition-colors"
                  >
                    Speichern
                  </button>
                  <button
                    onClick={() => onDelete(s.id)}
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
  );
}

export default ServiceGrid;