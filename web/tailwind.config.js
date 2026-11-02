import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Verde cafetal: marca, acciones principales y estados positivos
        brand: {
          50: '#EEF8F3',
          100: '#D9F0E5',
          200: '#B0DEC8',
          500: '#12855F',
          600: '#0E6B4E',
          700: '#0B5A41',
          800: '#084431',
        },
        // Maracuyá: estrellas y avisos destacados
        accent: { 100: '#FFF4CC', 400: '#F4B400', 700: '#6B4E00' },
        ink: { DEFAULT: '#17201B', 2: '#4A544F', 3: '#76807B' },
        line: { DEFAULT: '#E2E7E4', strong: '#CBD3CE' },
        canvas: '#F3F5F4',
        danger: { 50: '#FDEDED', 600: '#C42B2B', 700: '#A32020' },
        warning: { 50: '#FFF4E3', 600: '#A85A00' },
        info: { 50: '#EAF1FD', 600: '#1D5FBF' },
      },
      fontFamily: {
        sans: ['"Archivo Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        float: '0 8px 24px -8px rgba(23, 32, 27, 0.25), 0 2px 6px -2px rgba(23, 32, 27, 0.12)',
      },
      keyframes: {
        progress: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(250%)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        progress: 'progress 1.6s ease-in-out infinite',
        'slide-up': 'slide-up 180ms ease-out',
      },
    },
  },
  plugins: [
    // Archivo es variable en ancho: los títulos y las cifras importantes usan la versión ancha
    plugin(({ addUtilities }) => {
      addUtilities({
        '.font-wide': { 'font-stretch': '125%' },
        '.font-semiwide': { 'font-stretch': '112.5%' },
      });
    }),
  ],
};
