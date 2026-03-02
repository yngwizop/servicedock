/**
 * Authentication Utilities
 * Uses httpOnly cookies for JWT storage (better XSS protection)
 * Falls back to localStorage for compatibility
 */

// Flag to track if we're using cookies (modern) or localStorage (legacy)
let useCookies = true;

/**
 * Checks if authentication cookie exists
 */
export function isAuthenticated() {
  // Cookie-based auth: check if cookie exists by making a lightweight request
  // We can't read httpOnly cookies from JavaScript (that's the security feature!)
  // So we rely on the backend to validate
  
  // For now, we'll use a session flag in localStorage as a hint
  // The real validation happens on the backend with the httpOnly cookie
  return localStorage.getItem('auth_session') === 'active';
}

/**
 * Sets authentication session flag after successful login
 */
export function setAuthSession() {
  localStorage.setItem('auth_session', 'active');
}

/**
 * Clears authentication session flag
 */
export function clearAuthSession() {
  localStorage.removeItem('auth_session');
}

/**
 * Legacy: Store token (only for backward compatibility)
 * @deprecated Use cookie-based auth instead
 */
export function setAuthToken(token, expiresIn) {
  // No-op in cookie mode, token is in httpOnly cookie
  console.warn('setAuthToken called but using httpOnly cookies');
}

/**
 * Legacy: Get token
 * @deprecated Tokens are in httpOnly cookies, not accessible from JS
 */
export function getAuthToken() {
  return null; // Tokens are in httpOnly cookies
}

/**
 * Clears authentication (logout)
 */
export function clearAuthToken() {
  clearAuthSession();
}

/**
 * Creates request headers for authenticated requests
 * No Authorization header needed - cookie is sent automatically
 */
export function getAuthHeaders() {
  return {
    'Content-Type': 'application/json'
  };
}

/**
 * Makes an authenticated fetch request
 * Cookies are sent automatically with credentials: 'include'
 * Automatically refreshes token if expired (401)
 */
export async function authenticatedFetch(url, options = {}) {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {})
  };
  
  // FormData benötigt automatisch gesetzten Content-Type (mit boundary)
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }
  
  let response = await fetch(url, {
    ...options,
    credentials: 'include', // Important: Send cookies with request
    headers
  });
  
  // If 401, try to refresh token once
  if (response.status === 401 && !options._isRetry) {
    try {
      // Try to refresh token
      const refreshResponse = await fetch('/api/refresh', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (refreshResponse.ok) {
        // Token refreshed, retry original request
        return authenticatedFetch(url, { ...options, _isRetry: true });
      }
    } catch (err) {
      console.error('Token refresh failed:', err);
    }
    
    // Refresh failed, clear session
    clearAuthSession();
    throw new Error('Session expired. Please login again.');
  }
  
  return response;
}
