import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../utils/auth';
import { BACKEND_URL } from '../utils/backendUrl';

export function useAppearance({ onSessionExpired }) {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

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

  // `html` bleibt immer `class="dark"` damit Tailwind `dark:` greift (bewusstes Design).
  // `theme` steuert nur `data-sd-theme` (dim vs night) und Body-Hintergrund — kein klassisches Tailwind-Light.
  // `data-sd-theme` steuert Scrollbars / .glass / CSS-Variablen --sd-night-* (index.css); Mesh liegt im App-Stack.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    const isNight = theme === 'dark';
    root.setAttribute('data-sd-theme', isNight ? 'night' : 'dim');
    localStorage.setItem('theme', theme);

    /* Nacht: rgb(22,32,52) = --sd-night-950 in index.css */
    document.body.style.backgroundColor = isNight ? '#162034' : '#020617';
    document.body.style.backgroundImage = 'none';
    document.body.style.minHeight = '100vh';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const getTextColor = () =>
    theme === 'dark' ? appearance.text_color_dark : appearance.text_color_light;

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
      console.error("Failed to load appearance:", err);
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
      await fetchAppearance();
    } finally {
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
