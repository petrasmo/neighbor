/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./js/**/*.{js,ts,jsx,tsx}",
    "./**/*.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tractorBg: 'var(--bg-main)',
        tractorPrimary: '#2E7D32',
        tractorPrimaryLight: '#4CAF50',
        tractorPrimaryHover: '#1B5E20',
        tractorSurface: 'var(--bg-surface)',
        tractorCard: 'var(--bg-card)',
        tractorSecondary: 'var(--text-muted)',
        tractorBorder: 'var(--border-color)',
        myPostBg: 'var(--bg-highlight)'
      },
      fontFamily: {
        oswald: ['Oswald', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      }
    }
  },
  plugins: [],
}