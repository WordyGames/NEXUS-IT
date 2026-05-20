/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        especias:        '#10b981',
        'grupo-amex':    '#3b82f6',
        montacargas:     '#f59e0b',
        'amex-juarez':   '#8b5cf6',
        'equipos-osenal':'#06b6d4',
        success: { 50:'#f0fdf4', 100:'#dcfce7', 500:'#22c55e', 600:'#16a34a', 700:'#15803d' },
        warning: { 50:'#fffbeb', 100:'#fef3c7', 500:'#f59e0b', 600:'#d97706', 700:'#b45309' },
        danger:  { 50:'#fef2f2', 100:'#fee2e2', 500:'#ef4444', 600:'#dc2626', 700:'#b91c1c' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:      '0 1px 3px 0 rgb(0 0 0/0.08), 0 1px 2px -1px rgb(0 0 0/0.06)',
        'card-md': '0 4px 6px -1px rgb(0 0 0/0.07), 0 2px 4px -2px rgb(0 0 0/0.05)',
        'card-lg': '0 10px 15px -3px rgb(0 0 0/0.08), 0 4px 6px -4px rgb(0 0 0/0.05)',
        modal:     '0 20px 25px -5px rgb(0 0 0/0.12), 0 8px 10px -6px rgb(0 0 0/0.08)',
        sidebar:   '2px 0 8px 0 rgb(0 0 0/0.06)',
      },
      animation: {
        'fade-in':    'fadeIn 0.15s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'slide-up':   'slideUp 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'bounce-in':  'bounceIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        'wiggle':     'wiggle 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn:    { from:{ opacity:'0' },                                to:{ opacity:'1' } },
        slideDown: { from:{ transform:'translateY(-8px)',opacity:'0' },   to:{ transform:'translateY(0)',opacity:'1' } },
        slideUp:   { from:{ transform:'translateY(8px)',opacity:'0' },    to:{ transform:'translateY(0)',opacity:'1' } },
        pulseSoft: { '0%,100%':{ opacity:'1' }, '50%':{ opacity:'0.6' } },
        bounceIn:  { from:{ transform:'scale(0.92)',opacity:'0' },        to:{ transform:'scale(1)',opacity:'1' } },
        wiggle:    { '0%,100%':{ transform:'rotate(0deg)' }, '20%':{ transform:'rotate(-18deg)' }, '40%':{ transform:'rotate(18deg)' }, '60%':{ transform:'rotate(-10deg)' }, '80%':{ transform:'rotate(10deg)' } },
      },
    },
  },
  plugins: [],
}
