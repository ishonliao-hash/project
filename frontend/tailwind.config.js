/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        film: {
          black: '#0a0a0a',
          dark: '#141414',
          panel: '#1c1c1c',
          border: '#2a2a2a',
          accent: '#f5a623',
          blue: '#4f9cf9',
          red: '#e85d4a',
          green: '#3ecf8e',
        }
      }
    }
  },
  plugins: [],
}
