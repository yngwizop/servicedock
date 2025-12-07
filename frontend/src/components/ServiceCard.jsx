import React from 'react';
import { sanitizeText, sanitizeUrl } from '../utils/sanitize';

function ServiceCard({ service, textColor }) {
  const isUrl = service.icon && (
    service.icon.includes('.') || service.icon.includes('/')
  );
  
  // Sanitize all user-provided data
  const safeName = sanitizeText(service.name);
  const safeDescription = sanitizeText(service.description || '...');
  const safeUrl = sanitizeUrl(service.url);
  const safeIcon = isUrl ? sanitizeUrl(service.icon) : sanitizeText(service.icon);

  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      draggable={false}
      className="group relative flex items-start gap-4 bg-white/40 dark:bg-white/5 backdrop-blur-md border border-gray-300/50 dark:border-white/10 rounded-2xl p-5 transition-all duration-300 hover:bg-white/60 dark:hover:bg-white/10 hover:border-gray-400/60 dark:hover:border-white/20 hover:scale-[1.02] shadow-lg hover:shadow-2xl hover:shadow-blue-500/20 dark:hover:shadow-purple-500/20"
      aria-label={`Service: ${safeName}${safeDescription ? ', ' + safeDescription : ''}`}
    >
      {/* Hover Glow Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/10 group-hover:via-purple-500/5 group-hover:to-pink-500/10 rounded-2xl transition-all duration-500 pointer-events-none"></div>
      
      {/* Content */}
      <div className="relative z-10 flex items-start gap-4 w-full">
        {service.icon && (
          isUrl ? (
            <div className="flex-shrink-0 bg-white/35 dark:bg-white/10 backdrop-blur-sm border border-gray-300/60 dark:border-white/20 rounded-xl p-3 w-14 h-14 flex items-center justify-center group-hover:bg-white/55 dark:group-hover:bg-white/20 group-hover:border-gray-400/70 dark:group-hover:border-white/30 transition-all duration-300">
              <img 
                src={safeIcon} 
                alt={safeName} 
                className="w-full h-full object-contain"
                draggable={false}
              />
            </div>
          ) : (
            <div className="flex-shrink-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-white/20 rounded-xl p-3 w-14 h-14 flex items-center justify-center group-hover:from-blue-500/30 group-hover:to-purple-500/30 group-hover:border-white/30 transition-all duration-300">
              <span className="text-3xl">
                {safeIcon}
              </span>
            </div>
          )
        )}
        <div className="flex-grow">
          <h3 className="font-semibold text-lg mb-1 text-gray-950 dark:text-white/90 group-hover:text-black dark:group-hover:text-white transition-colors duration-300">{safeName}</h3>
          <p className="text-sm text-gray-950 dark:text-white/60 group-hover:text-black dark:group-hover:text-white/70 transition-colors duration-300">{safeDescription}</p>
        </div>
      </div>
    </a>
  );
}

export default ServiceCard;