import React from 'react';
import { sanitizeText, sanitizeUrl } from '../utils/sanitize';

function ShortcutLink({ shortcut }) {
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
      className="flex items-center gap-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md shadow-lg rounded-lg p-3 transition-all duration-300 hover:shadow-xl dark:hover:shadow-blue-900/30 hover:scale-[1.03]"
      aria-label={`Shortcut: ${safeName}, ${displayUrl(safeUrl)}`}
    >
      {shortcut.icon && (
        <div className={`flex-shrink-0 rounded-md p-1.5 w-9 h-9 flex items-center justify-center ${isUrl ? 'bg-white/80 dark:bg-gray-700' : 'bg-gray-200/80 dark:bg-gray-600'}`}>
          {isUrl ? (
            <img src={safeIcon} alt={safeName} className="w-full h-full object-contain" draggable={false}/>
          ) : (
            <span className="text-lg">{safeIcon}</span>
          )}
        </div>
      )}
      <div className="flex-grow min-w-0">
        <h3 className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">{safeName}</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{displayUrl(safeUrl)}</p>
      </div>
    </a>
  );
}

export default ShortcutLink;