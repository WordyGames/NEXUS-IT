/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'especias': '#10b981',
        'grupo-amex': '#3b82f6',
        'montacargas': '#f59e0b',
        'amex-juarez': '#8b5cf6'
      }
    },
  },
  plugins: [],
}
