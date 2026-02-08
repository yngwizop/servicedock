import { useState, useEffect, useRef } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
  (window.location.port === '' ? 
    `${window.location.protocol}//${window.location.hostname}` :
    `${window.location.protocol}//${window.location.hostname}:8000`
  );

export function useDashboards() {
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
      const res = await fetch(`${BACKEND_URL}/api/dashboards`);
      const data = await res.json();
      setDashboards(data);

      const currentActive = activeDashboardRef.current;
      if (currentActive && !data.find(d => d.id === currentActive)) {
        const fallbackId = data[0]?.id || 1;
        setActiveDashboard(fallbackId);
        localStorage.setItem('activeDashboard', fallbackId.toString());
      }
    } catch (err) {
      console.error("Fehler beim Laden der Dashboards:", err);
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
