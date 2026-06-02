/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}"
  ],
  darkMode: 'class', // Allow manual day/night theme toggle by adding .dark class to body
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f3f6f5',
          100: '#e3ebe7',
          200: '#c7d6cf',
          300: '#9db7ac',
          400: '#6e9384',
          500: '#4e7567',
          600: '#3c5d51',
          700: '#314c41',
          800: '#293e36',
          900: '#14221d',
          950: '#0a120f', // Deep Forest Green
        },
        cream: {
          50: '#fbfbf9',
          100: '#f8f6f0', // Warm Cream
          200: '#eeeadd',
          300: '#ded7c1',
          400: '#cabb9e',
          500: '#b6a17e',
        },
        gold: {
          50: '#faf8f2',
          100: '#f2ecda',
          200: '#e5d7b5',
          300: '#d4bc87',
          400: '#c3a15f',
          500: '#b28841',
          600: '#9b7134',
          700: '#815a2b',
          800: '#6a4a27',
          900: '#5c4024',
          950: '#352211', // Elegant Soft Gold
        },
        charcoal: {
          50: '#fafafa',
          100: '#f4f4f5',
          800: '#27272a',
          900: '#18181b', // Charcoal Dark Grey
          950: '#09090b',
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Playfair', 'Georgia', 'serif'],
        sans: ['"Outfit"', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fadeIn 1s ease-out forwards',
        'pulse-subtle': 'pulseSubtle 3s infinite ease-in-out',
        'float-slow': 'floatSlow 6s infinite ease-in-out',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '0.8', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-15px) rotate(2deg)' },
        }
      }
    },
  },
  plugins: [],
}
