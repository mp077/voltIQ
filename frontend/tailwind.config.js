/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          500: '#2563EB',
          600: '#1D4ED8',
          800: '#1E3A5F',
          900: '#172554',
        },
        energy: {
          blue: '#2563EB',
          navy: '#1E3A5F',
          purple: '#7C3AED',
          cyan: '#06B6D4',
          green: '#16A34A',
          orange: '#EA580C',
          red: '#DC2626',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
}
