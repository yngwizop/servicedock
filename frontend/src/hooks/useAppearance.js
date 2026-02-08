import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../utils/auth';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
  (window.location.port === '' ? 
    `${window.location.protocol}//${window.location.hostname}` :
    `${window.location.protocol}//${window.location.hostname}:8000`
  );

export function useAppearance({ onSessionExpired }) {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  const [appearance, setAppearance] = useState({
    bg_color: "#f0f2f5",
    bg_image_url: null,
    bg_opacity: 1.0,
    shortcut_cols: 6,
    service_cols: 6,
    text_color_light: "#1f2937",
    text_color_dark: "#e5e7eb",
    clock_format: "24h",
    weather_city: "Berlin",
  });
  const [editAppearance, setEditAppearance] = useState(appearance);
  const [isSavingAppearance, setIsSavingAppearance] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  // Theme effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      document.body.style.backgroundColor = '#020617';
      document.body.style.backgroundImage = `
        radial-gradient(at 0% 0%, hsla(253, 16%, 7%, 1) 0px, transparent 50%),
        radial-gradient(at 50% 0%, hsla(225, 39%, 25%, 1) 0px, transparent 50%),
        radial-gradient(at 100% 0%, hsla(339, 49%, 30%, 1) 0px, transparent 50%),
        radial-gradient(at 0% 50%, hsla(217, 71%, 35%, 1) 0px, transparent 50%),
        radial-gradient(at 100% 50%, hsla(291, 44%, 28%, 1) 0px, transparent 50%),
        radial-gradient(at 0% 100%, hsla(261, 48%, 32%, 1) 0px, transparent 50%),
        radial-gradient(at 50% 100%, hsla(228, 35%, 22%, 1) 0px, transparent 50%),
        radial-gradient(at 100% 100%, hsla(203, 45%, 28%, 1) 0px, transparent 50%)
      `;
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      document.body.style.backgroundColor = '#e2e8f0';
      document.body.style.backgroundImage = `
        radial-gradient(at 0% 0%, hsla(210, 40%, 85%, 1) 0px, transparent 50%),
        radial-gradient(at 50% 0%, hsla(215, 50%, 90%, 1) 0px, transparent 50%),
        radial-gradient(at 100% 0%, hsla(280, 45%, 88%, 1) 0px, transparent 50%),
        radial-gradient(at 0% 50%, hsla(195, 60%, 82%, 1) 0px, transparent 50%),
        radial-gradient(at 100% 50%, hsla(270, 50%, 85%, 1) 0px, transparent 50%),
        radial-gradient(at 0% 100%, hsla(230, 55%, 86%, 1) 0px, transparent 50%),
        radial-gradient(at 50% 100%, hsla(210, 50%, 88%, 1) 0px, transparent 50%),
        radial-gradient(at 100% 100%, hsla(185, 55%, 84%, 1) 0px, transparent 50%)
      `;
    }
    document.body.style.minHeight = '100vh';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const getTextColor = () => {
    return theme === 'light' ? appearance.text_color_light : appearance.text_color_dark;
  };

  const fetchAppearance = async () => {
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/appearance`);
      if (!res.ok) return;
      const data = await res.json();
      const safeData = {
        bg_color: data.bg_color || "#f0f2f5",
        bg_image_url: data.bg_image_url || null,
        bg_opacity: (data.bg_opacity !== null && data.bg_opacity !== undefined) ? data.bg_opacity : 1.0,
        shortcut_cols: data.shortcut_cols || 6,
        service_cols: data.service_cols || 6,
        text_color_light: data.text_color_light || "#1f2937",
        text_color_dark: data.text_color_dark || "#e5e7eb",
        clock_format: data.clock_format || "24h",
        weather_city: data.weather_city || "Berlin",
        weather_fields: data.weather_fields || ['temperature', 'humidity'],
        show_spotify: data.show_spotify !== undefined ? data.show_spotify : true,
        show_weather: data.show_weather !== undefined ? data.show_weather : true,
        show_clock: data.show_clock !== undefined ? data.show_clock : true,
      };
      setAppearance(safeData);
      setEditAppearance(safeData);
    } catch (err) {
      console.error("Fehler beim Laden der Appearance:", err);
    }
  };

  const saveAppearance = async () => {
    setIsSavingAppearance(true);

    const weatherFieldsSafe = (editAppearance.weather_fields && editAppearance.weather_fields.length)
      ? editAppearance.weather_fields
      : ['temperature', 'humidity'];

    const appearanceToSave = { ...editAppearance, weather_fields: weatherFieldsSafe };

    // Optimistic UI update
    setAppearance(appearanceToSave);
    setEditAppearance(appearanceToSave);

    try {
      await authenticatedFetch(`${BACKEND_URL}/api/appearance`, {
        method: "PUT",
        body: JSON.stringify(appearanceToSave),
      });
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1400);
    } catch (err) {
      console.error('Failed to save appearance:', err);
      if (err.message.includes('Session expired')) {
        onSessionExpired();
      }
    } finally {
      fetchAppearance();
      setIsSavingAppearance(false);
    }
  };

  return {
    theme,
    toggleTheme,
    appearance,
    editAppearance,
    setEditAppearance,
    isSavingAppearance,
    showSaved,
    getTextColor,
    fetchAppearance,
    saveAppearance,
  };
}
