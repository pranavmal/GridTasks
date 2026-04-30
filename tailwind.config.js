/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#070B10',
          panel: '#0E1621',
          line: '#1F2A36',
          text: '#C7D2E0',
          accent: '#36D68F',
          warn: '#EAB308',
          danger: '#EF4444',
        },
      },
      boxShadow: {
        neon: '0 0 0 1px rgba(54,214,143,0.2), 0 0 22px rgba(54,214,143,0.15)',
      },
    },
  },
  plugins: [],
}
