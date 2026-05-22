import { useState, useEffect, useRef } from 'react';
import { authenticatedFetch } from '../utils/auth';
import { BACKEND_URL } from '../utils/backendUrl';

export function useDashboards({ onSessionExpired } = {}) {
  const [dashboards, setDashboards] = useState([]);
  const [activeDashboard, setActiveDashboard] = useState(() => {
    const saved = localStorage.getItem('activeDashboard');
    return saved ? parseInt(saved, 10) : 1;
  });
  const activeDashboardRef = useRef(activeDashboard);

  useEffect(() => {
    activeDashboardRef.current = activeDashboard;
  }, [activeDashboard]);

  const fetchDashboards = async () => {
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/dashboards`);
      if (!res.ok) return;
      const data = await res.json();
      setDashboards(data);

      const currentActive = activeDashboardRef.current;
      if (currentActive && !data.find(d => d.id === currentActive)) {
        const fallbackId = data[0]?.id || 1;
        setActiveDashboard(fallbackId);
        localStorage.setItem('activeDashboard', fallbackId.toString());
      }
    } catch (err) {
      console.error("Failed to load dashboards:", err);
      if (err.message?.includes('Session expired') && onSessionExpired) onSessionExpired();
    }
  };

  const switchDashboard = (dashboardId) => {
    setActiveDashboard(dashboardId);
    localStorage.setItem('activeDashboard', dashboardId.toString());
  };

  return {
    dashboards,
    activeDashboard,
    fetchDashboards,
    switchDashboard,
  };
}
