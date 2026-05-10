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
      },
      animation: {
        'settings-pane-in': 'settingsPaneIn 0.2s ease-out both',
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
      // Nacht-Theme: html hat weiterhin .dark (Tailwind dark:), zusätzlich data-sd-theme=night
      addVariant('night', 'html[data-sd-theme="night"] &');
    }),
  ],
}
