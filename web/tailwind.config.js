/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fondos
        background: '#121212',
        card:       '#1E1E1E',
        surface:    '#1E1E1E', // alias de card
        secondary:  '#2A2A2A',
        border:     '#2A2A2A',

        // Textos
        foreground: '#FFFFFF',
        'muted-foreground': '#9CA3AF',
        // alias semánticos usados en componentes
        'text-primary':   '#FFFFFF',
        'text-secondary': '#9CA3AF',

        // Primario
        primary: {
          DEFAULT:    '#FF6B00',
          foreground: '#FFFFFF',
        },

        // Estados
        success: {
          DEFAULT:    '#22C55E',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT:    '#EAB308',
          foreground: '#000000',
        },
        destructive: {
          DEFAULT:    '#EF4444',
          foreground: '#FFFFFF',
        },
        error: '#EF4444', // alias de destructive

        // Sidebar
        sidebar: {
          DEFAULT:    '#1E1E1E',
          foreground: '#9CA3AF',
          primary:    '#FF6B00',
          border:     '#2A2A2A',
        },

        // Focus ring
        ring: '#FF6B00',
      },
    },
  },
  plugins: [],
};
