import React from 'react';

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
      draggable={false} // NEU
      className="flex items-center gap-4 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md shadow-lg rounded-xl p-4 transition-all duration-300 hover:shadow-xl dark:hover:shadow-lg dark:hover:shadow-blue-900/30 hover:scale-[1.03]"
    >
      {shortcut.icon && (
        <div className={`flex-shrink-0 rounded-lg p-2 w-10 h-10 flex items-center justify-center ${isUrl ? 'bg-white/80 dark:bg-gray-700' : 'bg-gray-200/80 dark:bg-gray-600'}`}>
          {isUrl ? (
            <img src={shortcut.icon} alt={shortcut.name} className="w-full h-full object-contain" draggable={false}/>
          ) : (
            <span className="text-xl">{shortcut.icon}</span>
          )}
        </div>
      )}
      <div className="flex-grow min-w-0">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 truncate">{shortcut.name}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{displayUrl(shortcut.url)}</p>
      </div>
    </a>
  );
}

export default ShortcutLink;