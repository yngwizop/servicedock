import { useState, useRef, useCallback } from 'react';
import { authenticatedFetch } from '../utils/auth';
import { BACKEND_URL } from '../utils/backendUrl';

export function useServices({ activeDashboard, onSessionExpired }) {
  const [services, setServices] = useState([]);
  const [shortcuts, setShortcuts] = useState([]);
  const fetchRequestId = useRef(0);

  const fetchData = useCallback(async () => {
    const dashboardId = activeDashboard;
    const requestId = ++fetchRequestId.current;
    try {
      const sRes = await authenticatedFetch(
        `${BACKEND_URL}/api/services?dashboard_id=${dashboardId}`
      );
      if (requestId !== fetchRequestId.current) return;
      if (sRes.ok) {
        const servicesData = await sRes.json();
        setServices(servicesData);
      }

      const scRes = await authenticatedFetch(
        `${BACKEND_URL}/api/shortcuts?dashboard_id=${dashboardId}`
      );
      if (requestId !== fetchRequestId.current) return;
      if (scRes.ok) {
        const shortcutsData = await scRes.json();
        setShortcuts(shortcutsData);
      }
    } catch (err) {
      if (requestId !== fetchRequestId.current) return;
      console.error("Fehler beim Laden der Daten:", err);
      if (err.message?.includes('Session expired')) onSessionExpired();
    }
  }, [activeDashboard, onSessionExpired]);

  const deleteService = async (id) => {
    try {
      await authenticatedFetch(
        `${BACKEND_URL}/api/services/${id}?dashboard_id=${activeDashboard}`,
        { method: "DELETE" }
      );
      fetchData();
    } catch (err) {
      console.error("Error deleting service:", err);
      if (err.message.includes('Session expired')) onSessionExpired();
    }
  };

  const deleteShortcut = async (id) => {
    try {
      await authenticatedFetch(
        `${BACKEND_URL}/api/shortcuts/${id}?dashboard_id=${activeDashboard}`,
        { method: "DELETE" }
      );
      fetchData();
    } catch (err) {
      console.error("Error deleting shortcut:", err);
      if (err.message.includes('Session expired')) onSessionExpired();
    }
  };

  const updateService = async (id, updatedData) => {
    const serviceToUpdate = updatedData || services.find((s) => s.id === id);
    if (!serviceToUpdate) return;
    try {
      await authenticatedFetch(`${BACKEND_URL}/api/services/${id}`, {
        method: "PUT",
        body: JSON.stringify({ ...serviceToUpdate, dashboard_id: activeDashboard }),
      });
      fetchData();
    } catch (err) {
      console.error("Error updating service:", err);
      if (err.message.includes('Session expired')) onSessionExpired();
    }
  };

  const updateShortcut = async (id, updatedData) => {
    const shortcutToUpdate = updatedData || shortcuts.find((s) => s.id === id);
    if (!shortcutToUpdate) return;
    try {
      await authenticatedFetch(`${BACKEND_URL}/api/shortcuts/${id}`, {
        method: "PUT",
        body: JSON.stringify({ ...shortcutToUpdate, dashboard_id: activeDashboard }),
      });
      fetchData();
    } catch (err) {
      console.error("Error updating shortcut:", err);
      if (err.message.includes('Session expired')) onSessionExpired();
    }
  };

  const reorderServices = async (orderedIds) => {
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/services/reorder`, {
        method: "PUT",
        body: JSON.stringify({ newOrder: orderedIds, dashboard_id: activeDashboard }),
      });
      if (!res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error("Failed to reorder services", err);
      if (err.message.includes('Session expired')) onSessionExpired();
      await fetchData();
    }
  };

  const reorderShortcuts = async (orderedIds) => {
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/shortcuts/reorder`, {
        method: "PUT",
        body: JSON.stringify({ newOrder: orderedIds, dashboard_id: activeDashboard }),
      });
      if (!res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error("Failed to reorder shortcuts", err);
      if (err.message.includes('Session expired')) onSessionExpired();
      await fetchData();
    }
  };

  return {
    services,
    setServices,
    shortcuts,
    setShortcuts,
    fetchData,
    deleteService,
    deleteShortcut,
    updateService,
    updateShortcut,
    reorderServices,
    reorderShortcuts,
  };
}
