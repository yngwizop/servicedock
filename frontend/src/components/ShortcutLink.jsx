import React from 'react';
import { sanitizeText, sanitizeUrl } from '../utils/sanitize';

function ShortcutLink({ shortcut, textColor }) {
  const isUrl = shortcut.icon && (
    shortcut.icon.includes('.') || shortcut.icon.includes('/')
  );
  
  // Sanitize all user-provided data
  const safeName = sanitizeText(shortcut.name);
  const safeUrl = sanitizeUrl(shortcut.url);
  const safeIcon = isUrl ? sanitizeUrl(shortcut.icon) : sanitizeText(shortcut.icon);
  
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
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      draggable={false}
      className="group relative flex items-center gap-3 bg-white/70 dark:bg-white/5 backdrop-blur-md border border-gray-400/60 dark:border-white/10 rounded-xl p-3.5 transition-all duration-300 hover:bg-white/90 dark:hover:bg-white/10 hover:border-gray-500/70 dark:hover:border-white/20 hover:scale-[1.02] shadow-lg hover:shadow-xl hover:shadow-cyan-500/20 dark:hover:shadow-cyan-400/10"
      aria-label={`Shortcut: ${safeName}, ${displayUrl(safeUrl)}`}
    >
      {/* Subtle Glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 to-blue-500/0 group-hover:from-cyan-500/5 group-hover:to-blue-500/5 rounded-xl transition-all duration-500 pointer-events-none"></div>
      
      {/* Content */}
      <div className="relative z-10 flex items-center gap-3 w-full">
        {shortcut.icon && (
          <div className={`flex-shrink-0 rounded-lg p-2 w-10 h-10 flex items-center justify-center transition-all duration-300 shadow-sm ${
            isUrl 
              ? 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/10 dark:to-white/10 backdrop-blur-sm border border-gray-400 dark:border-white/20 group-hover:from-white group-hover:to-gray-100 dark:group-hover:from-white/20 dark:group-hover:to-white/20 group-hover:border-gray-500 dark:group-hover:border-white/30' 
              : 'bg-gradient-to-br from-cyan-200 to-blue-200 dark:from-cyan-500/20 dark:to-blue-500/20 border border-cyan-300 dark:border-white/20 group-hover:from-cyan-300 group-hover:to-blue-300 dark:group-hover:from-cyan-500/30 dark:group-hover:to-blue-500/30 group-hover:border-cyan-400 dark:group-hover:border-white/30'
          }`}>
            {isUrl ? (
              <img src={safeIcon} alt={safeName} className="w-full h-full object-contain" draggable={false}/>
            ) : (
              <span className="text-xl drop-shadow-sm">{safeIcon}</span>
            )}
          </div>
        )}
        <div className="flex-grow min-w-0">
          <h3 className="font-medium text-sm text-gray-900 dark:text-white/90 group-hover:text-black dark:group-hover:text-white truncate transition-colors duration-300">{safeName}</h3>
          <p className="text-xs text-gray-700 dark:text-white/50 group-hover:text-gray-900 dark:group-hover:text-white/60 truncate transition-colors duration-300">{displayUrl(safeUrl)}</p>
        </div>
      </div>
    </a>
  );
}

export default ShortcutLink;