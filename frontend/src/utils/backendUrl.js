/**
 * Backend base URL
 *
 * Vite: use `VITE_BACKEND_URL` (preferred). If not set, use same-origin.
 */
export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`;

