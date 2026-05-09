/**
 * Proxmox Cluster-Status: localStorage pro Web-Dashboard (dashboard_id).
 * Layout + sichtbare Cards liegen zusätzlich auf dem Server; hier nur Browser-Cache / UI-Prefs.
 */

const visibleKey = (dashboardId) => `proxmox_visible_cards_${String(dashboardId)}`;
const topItemsKey = (dashboardId) => `proxmox_top_items_${String(dashboardId)}`;
const taskHoursKey = (dashboardId) => `proxmox_task_hours_${String(dashboardId)}`;
const refreshKey = (dashboardId) => `proxmox_refresh_interval_${String(dashboardId)}`;

const LEGACY_VISIBLE = 'proxmox_visible_cards';
const LEGACY_TOP = 'proxmox_top_items';
const LEGACY_TASK_HOURS = 'proxmox_task_hours';
const LEGACY_REFRESH = 'proxmox_refresh_interval';

function readInt(key, fallback) {
  const v = localStorage.getItem(key);
  if (v == null || v === '') return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Sichtbare Status-Cards (Cache). null = noch nicht gesetzt → Auto-Detect / Backend.
 * Einmalige Migration: alter globaler Key → nur Dashboard-ID "1".
 */
export function loadVisibleCards(dashboardId) {
  if (dashboardId == null || dashboardId === '') return null;
  const id = String(dashboardId);
  try {
    const scoped = localStorage.getItem(visibleKey(id));
    if (scoped) return JSON.parse(scoped);
    if (id === '1') {
      const leg = localStorage.getItem(LEGACY_VISIBLE);
      if (leg) {
        localStorage.setItem(visibleKey('1'), leg);
        localStorage.removeItem(LEGACY_VISIBLE);
        return JSON.parse(leg);
      }
    }
  } catch (e) {
    console.error('loadVisibleCards:', e);
  }
  return null;
}

export function saveVisibleCardsLocal(cardIds, dashboardId) {
  if (dashboardId == null || dashboardId === '') return;
  try {
    localStorage.setItem(visibleKey(String(dashboardId)), JSON.stringify(cardIds));
  } catch (e) {
    console.error('saveVisibleCardsLocal:', e);
  }
}

function getScopedOrLegacy(scopedKey, legacyKey, fallback) {
  const scoped = localStorage.getItem(scopedKey);
  if (scoped != null && scoped !== '') return readInt(scopedKey, fallback);
  return readInt(legacyKey, fallback);
}

export function getProxmoxTopItems(dashboardId) {
  if (dashboardId == null || dashboardId === '') return 10;
  return getScopedOrLegacy(topItemsKey(String(dashboardId)), LEGACY_TOP, 10);
}

export function getProxmoxTaskHours(dashboardId) {
  if (dashboardId == null || dashboardId === '') return 48;
  return getScopedOrLegacy(taskHoursKey(String(dashboardId)), LEGACY_TASK_HOURS, 48);
}

export function getProxmoxRefreshInterval(dashboardId) {
  if (dashboardId == null || dashboardId === '') return 30;
  return getScopedOrLegacy(refreshKey(String(dashboardId)), LEGACY_REFRESH, 30);
}

export function setProxmoxMonitoringPrefs(dashboardId, { autoRefreshInterval, topItemsCount, taskTimeRange }) {
  if (dashboardId == null || dashboardId === '') return;
  const id = String(dashboardId);
  localStorage.setItem(refreshKey(id), String(autoRefreshInterval));
  localStorage.setItem(topItemsKey(id), String(topItemsCount));
  localStorage.setItem(taskHoursKey(id), String(taskTimeRange));
}

export function clearProxmoxMonitoringPrefs(dashboardId) {
  if (dashboardId == null || dashboardId === '') return;
  const id = String(dashboardId);
  localStorage.removeItem(refreshKey(id));
  localStorage.removeItem(topItemsKey(id));
  localStorage.removeItem(taskHoursKey(id));
}
