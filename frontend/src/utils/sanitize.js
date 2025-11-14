/**
 * Sanitization utilities using DOMPurify
 * Protects against XSS attacks in user input and external data
 */
import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS
 * Use for any user-generated content or external data
 */
export function sanitizeHtml(dirty) {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
    ALLOW_DATA_ATTR: false
  });
}

/**
 * Sanitizes plain text (removes all HTML)
 * Use for displaying user input that should never contain HTML
 */
export function sanitizeText(dirty) {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}

/**
 * Sanitizes URLs to prevent javascript: and data: URIs
 */
export function sanitizeUrl(url) {
  if (!url) return '';
  
  // Remove whitespace
  const cleaned = url.trim();
  
  // Block dangerous protocols
  const dangerous = /^(javascript|data|vbscript|file|about):/i;
  if (dangerous.test(cleaned)) {
    console.warn('Blocked dangerous URL:', cleaned);
    return '';
  }
  
  return DOMPurify.sanitize(cleaned, { ALLOWED_TAGS: [] });
}

/**
 * Sanitizes object properties recursively
 * Use for API responses containing user data
 */
export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    const value = obj[key];
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}
