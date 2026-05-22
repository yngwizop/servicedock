/** Maps Proxmox-related backend error codes to i18n keys. */
const PROXMOX_ERROR_CODE_MAP = {
  // Save / config
  proxmox_host_not_allowed: 'proxmoxConnection.host_not_allowed',
  proxmox_token_name_required: 'proxmoxConnection.errors.token_name_required',
  proxmox_token_value_required: 'proxmoxConnection.errors.token_value_required',
  proxmox_not_configured: 'proxmoxConnection.errors.not_configured',
  proxmox_cluster_resources_failed: 'proxmoxConnection.errors.cluster_resources_failed',
  proxmox_server_data_failed: 'proxmoxConnection.errors.server_data_failed',
  proxmox_cluster_stats_failed: 'proxmoxConnection.errors.cluster_stats_failed',

  // Connection test (also used for VM list errors)
  proxmox_test_not_configured: 'proxmoxConnection.errors.not_configured',
  proxmox_test_token_missing: 'proxmoxConnection.errors.token_missing',
  proxmox_test_token_name_missing: 'proxmoxConnection.errors.token_name_missing',
  proxmox_test_build_failed: 'proxmoxConnection.errors.build_failed',
  proxmox_test_no_nodes: 'proxmoxConnection.errors.no_nodes',
  proxmox_test_node_mismatch: 'proxmoxConnection.errors.node_mismatch',
  proxmox_test_auth_failed: 'proxmoxConnection.errors.auth_failed',
  proxmox_test_forbidden: 'proxmoxConnection.errors.forbidden',
  proxmox_test_connection_failed: 'proxmoxConnection.errors.connection_failed',
  proxmox_test_ssl_failed: 'proxmoxConnection.errors.ssl_failed',
  proxmox_test_unknown: 'proxmoxConnection.errors.unknown',
};

export function translateProxmoxError(code, context, fallback, t) {
  if (code && PROXMOX_ERROR_CODE_MAP[code]) {
    const ctx = context || {};
    return t(PROXMOX_ERROR_CODE_MAP[code], {
      configured: ctx.configured || '',
      available: Array.isArray(ctx.available) ? ctx.available.join(', ') : '',
      raw: ctx.raw || '',
    });
  }
  return fallback || t('proxmoxConnection.test_failed');
}

export function extractDetailError(detail) {
  if (!detail) return { code: null, context: null, message: null };
  if (typeof detail === 'string') return { code: null, context: null, message: detail };
  if (typeof detail === 'object') {
    return {
      code: detail.code || null,
      context: detail.context || null,
      message: detail.message || null,
    };
  }
  return { code: null, context: null, message: null };
}
