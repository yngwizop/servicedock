import plugin from 'tailwindcss/plugin';

/**
 * Nacht-UI: RGB in index.css (`--sd-night-*`); Deckkraft wie Dim (`--sd-night-surface-op` 0.12 usw.).
 * Flächen-Klassen: `.sd-night-surface`, `.sd-night-shade`, `.sd-night-tint`, … — Deckkraft in index.css (`--sd-night-*-op`).
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      keyframes: {
        settingsPaneIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        settingsPaneOut: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-4px)' },
        },
        /* Fade only — no transform (transform on a parent breaks descendant backdrop-blur) */
        settingsPaneFadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        settingsPaneFadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        settingsSubnavIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        settingsSubnavOut: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-2px)' },
        },
      },
      animation: {
        'settings-pane-in': 'settingsPaneIn 0.25s cubic-bezier(0.22, 1, 0.36, 1) both',
        'settings-pane-out': 'settingsPaneOut 0.15s ease-in both',
        'settings-pane-fade-in': 'settingsPaneFadeIn 0.25s cubic-bezier(0.22, 1, 0.36, 1) both',
        'settings-pane-fade-out': 'settingsPaneFadeOut 0.15s ease-in both',
        'settings-subnav-in': 'settingsSubnavIn 0.22s cubic-bezier(0.22, 1, 0.36, 1) both',
        'settings-subnav-out': 'settingsSubnavOut 0.18s ease-in both',
      },
      transitionDuration: {
        'settings-caret': '200ms',
      },
      colors: {
        /* Nacht-UI: Werte kommen aus index.css (--sd-night-*) */
        'sd-night': {
          950: 'rgb(var(--sd-night-950) / <alpha-value>)',
          900: 'rgb(var(--sd-night-900) / <alpha-value>)',
          800: 'rgb(var(--sd-night-800) / <alpha-value>)',
          700: 'rgb(var(--sd-night-700) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      // html.dark immer aktiv; data-sd-theme = dim (hell) | night
      addVariant('dim', 'html[data-sd-theme="dim"] &');
      addVariant('night', 'html[data-sd-theme="night"] &');
    }),
  ],
}
