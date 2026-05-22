import { authenticatedFetch } from './auth';
import { BACKEND_URL } from './backendUrl';
import { getProxmoxTaskHours, getProxmoxTopItems } from './proxmoxDashboardPrefs';

const emptyVmBundle = () => ({
  ok: false,
  configured: false,
  isCluster: false,
  resources: [],
  nodes: [],
  proxmoxName: '',
  error: null,
  errorCode: null,
  errorContext: null,
});

/**
 * Schneller Pfad für VM/LXC: nur Config + VM-Liste (kein cluster-stats).
 * cluster-stats läuft separat via fetchProxmoxClusterStatsPrefetch — oft der langsame Teil (~10s).
 */
export async function fetchProxmoxVmBundle(dashboardId) {
  const id = String(dashboardId);

  try {
    const configRes = await authenticatedFetch(
      `${BACKEND_URL}/api/proxmox/config?dashboard_id=${id}`
    );
    const configData = await configRes.json();

    if (!configData.configured) {
      return { ...emptyVmBundle(), ok: true, configured: false };
    }

    const res = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/vms?dashboard_id=${id}`);

    if (!res.ok) {
      let errorCode = null;
      let errorContext = null;
      let msg = `HTTP ${res.status}`;
      try {
        const errorData = await res.json();
        if (errorData?.detail && typeof errorData.detail === 'object') {
          errorCode = errorData.detail.code || null;
          errorContext = errorData.detail.context || null;
        } else if (typeof errorData?.detail === 'string') {
          msg = errorData.detail;
        }
      } catch {
        /* ignore */
      }
      const err = new Error(msg);
      err.code = errorCode;
      err.context = errorContext;
      throw err;
    }

    const data = await res.json();
    const resources = data.resources || [];
    const nodes = data.nodes || [];

    let proxmoxName = 'Server';
    if (configData.is_cluster) {
      proxmoxName = data.cluster_name || 'Cluster';
    } else if (nodes.length > 0) {
      proxmoxName = nodes[0].node || 'Server';
    }

    return {
      ok: true,
      configured: true,
      isCluster: !!configData.is_cluster,
      resources,
      nodes,
      proxmoxName,
      error: null,
    };
  } catch (err) {
    console.error('fetchProxmoxVmBundle:', err);
    return {
      ...emptyVmBundle(),
      ok: false,
      configured: true,
      error: err.message || 'Failed to connect to Proxmox',
      errorCode: err.code || null,
      errorContext: err.context || null,
    };
  }
}

/** Status-Overview / Prefetch — im Hintergrund nach VM-Liste aufrufen. */
export async function fetchProxmoxClusterStatsPrefetch(dashboardId) {
  const id = String(dashboardId);
  try {
    const topItems = getProxmoxTopItems(dashboardId);
    const taskHours = getProxmoxTaskHours(dashboardId);
    const statsUrl = `${BACKEND_URL}/api/proxmox/cluster-stats?dashboard_id=${id}&top_n=${topItems}&task_hours=${taskHours}`;
    const statsRes = await authenticatedFetch(statsUrl);
    if (!statsRes.ok) return null;
    const statsJson = await statsRes.json();
    return { dashboardId: id, data: statsJson };
  } catch (e) {
    console.error('fetchProxmoxClusterStatsPrefetch:', e);
    return null;
  }
}
