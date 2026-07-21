/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0d0d0d',
        charcoal: '#1a1a1a',
        ivory: '#f5f0e6',
        gold: {
          DEFAULT: '#c9a227',
          light: '#d4af37',
          dark: '#b8860b',
        },
        'text-dark': '#1a1a1a',
        muted: '#8a8a8a',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': '0 0 15px rgba(201, 162, 39, 0.2)',
        'gold-glow-hover': '0 0 25px rgba(212, 175, 55, 0.4)',
      }
    },
  },
  plugins: [],
}
