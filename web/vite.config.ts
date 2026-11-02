import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En desarrollo, /api y /socket.io se redirigen al backend local (mismo esquema que en producción con Caddy)
const API_TARGET = process.env.API_TARGET ?? 'http://localhost:3000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': API_TARGET,
      '/socket.io': { target: API_TARGET, ws: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Librerías en archivos aparte: cambian poco, así el navegador las reutiliza entre versiones
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client', 'react-router-dom'],
          data: ['@tanstack/react-query', 'axios', 'socket.io-client'],
          map: ['leaflet', 'react-leaflet'],
          charts: ['recharts'],
        },
      },
    },
  },
})
