/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Clash Display', 'system-ui', 'sans-serif'],
        sans: ['Satoshi', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          dark: '#0a0a0f',
          card: '#12121a',
          accent: '#00d4aa',
          accentDim: '#00a884',
          gold: '#f5b546',
          muted: '#6b7280',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
