import React from 'react';
import { sanitizeText, sanitizeUrl } from '../utils/sanitize';

function ServiceCard({ service }) {
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
      draggable={false} // NEU: verhindert Konflikte mit Wrapper-Drag
      className="flex items-start gap-4 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md shadow-lg rounded-xl p-4 transition-all duration-300 hover:shadow-xl dark:hover:shadow-lg dark:hover:shadow-blue-900/30 hover:scale-[1.03]"
      aria-label={`Service: ${safeName}${safeDescription ? ', ' + safeDescription : ''}`}
    >
      {service.icon && (
        isUrl ? (
          <div className="flex-shrink-0 bg-blue-100 dark:bg-gray-700 rounded-lg p-2.5 w-12 h-12 flex items-center justify-center">
            <img 
              src={safeIcon} 
              alt={safeName} 
              className="w-full h-full object-contain"
              draggable={false} // NEU
            />
          </div>
        ) : (
          <div className="flex-shrink-0 bg-blue-100 dark:bg-gray-600 rounded-lg p-2.5 w-12 h-12 flex items-center justify-center">
            <span className="text-2xl">
              {safeIcon}
            </span>
          </div>
        )
      )}
      <div>
        <h3 className="font-semibold text-lg mb-0.5 text-gray-800 dark:text-gray-100">{safeName}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{safeDescription}</p>
      </div>
    </a>
  );
}

export default ServiceCard;