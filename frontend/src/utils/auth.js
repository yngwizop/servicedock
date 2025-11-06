/**
 * Authentication Utilities
 * Handles JWT token storage and authentication headers
 */

const TOKEN_KEY = 'jwt_token';
const TOKEN_EXPIRY_KEY = 'jwt_token_expiry';

/**
 * Speichert das JWT-Token im localStorage
 */
export function setAuthToken(token, expiresIn) {
  localStorage.setItem(TOKEN_KEY, token);
  
  // Berechne Ablaufzeit
  if (expiresIn) {
    const expiryTime = Date.now() + (expiresIn * 1000); // expiresIn ist in Sekunden
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
  }
}

/**
 * Holt das JWT-Token aus dem localStorage
 */
export function getAuthToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  
  // Prüfe ob Token abgelaufen ist
  if (expiry && Date.now() > parseInt(expiry)) {
    clearAuthToken();
    return null;
  }
  
  return token;
}

/**
 * Löscht das JWT-Token aus dem localStorage
 */
export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

/**
 * Prüft ob ein gültiges Token existiert
 */
export function isAuthenticated() {
  return getAuthToken() !== null;
}

/**
 * Erstellt Authorization-Header mit JWT-Token
 */
export function getAuthHeaders() {
  const token = getAuthToken();
  
  if (!token) {
    return {
      'Content-Type': 'application/json'
    };
  }
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

/**
 * Macht einen authentifizierten Fetch-Request
 * Wirft automatisch einen Fehler bei 401 (Unauthorized)
 */
export async function authenticatedFetch(url, options = {}) {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {})
  };
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  // Wenn 401, Token ist ungültig -> ausloggen
  if (response.status === 401) {
    clearAuthToken();
    throw new Error('Session expired. Please login again.');
  }
  
  return response;
}
