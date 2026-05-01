/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#000000',
          panel: '#222222',
          line: '#222222',
          text: '#D4D4D4',
          accent: '#A3A3A3',
          warn: '#EAB308',
          danger: '#EF4444',
        },
      },
      boxShadow: {
        neon: 'none',
      },
    },
  },
  plugins: [],
}
