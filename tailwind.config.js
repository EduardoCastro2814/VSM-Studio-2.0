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
        vsmBlue: '#2563EB',
        vsmDark: '#1F2937',
        vsmGreen: '#10B981',
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
        },
        dark: {
          DEFAULT: '#1F2937',
          card: '#111827',
          border: '#374151',
          bg: '#0F172A',
        },
        lean: {
          DEFAULT: '#10B981',
          light: '#D1FAE5',
          hover: '#059669',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
