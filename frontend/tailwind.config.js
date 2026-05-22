/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  corePlugins: {
    preflight: false
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'Segoe UI', 'sans-serif']
      },
      colors: {
        ink: '#dbe6ff',
        panel: '#101a2b',
        panelSoft: '#17263d',
        panelBorder: '#274268',
        accent: '#17c3b2'
      },
      boxShadow: {
        glow: '0 18px 50px rgba(6, 15, 31, 0.45)'
      }
    }
  },
  plugins: []
};
