/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: ['class', '.dark-mode'],
  corePlugins: {
    preflight: false, // Disables the CSS reset, protecting other pages in the app
  },
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#4F46E5', // Indigo
          accent: '#6366F1',  // Purple
          secondary: '#2563EB', // Royal Blue
          navy: '#1E1B4B' // Navy announcement bar
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 20px 25px -5px rgba(99, 102, 241, 0.05), 0 8px 10px -6px rgba(99, 102, 241, 0.05)',
      }
    },
  },
  plugins: [],
}
