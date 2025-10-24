/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Diese Zeile sagt Tailwind, wo es nach Klassen suchen soll
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
