# CletaEats · Web

Cliente web para los tres roles (cliente, repartidor y admin).

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS · React Router · Leaflet (OpenStreetMap) · Recharts · Socket.IO client

```bash
npm install
npm run dev      # http://localhost:5173 (redirige /api y /socket.io a localhost:3000)
npm run build    # genera dist/ para servir como sitio estático
npm run lint
```

- La API se llama en `/api` del mismo dominio. En desarrollo lo resuelve el proxy de Vite (`vite.config.ts`, variable `API_TARGET` si el backend no está en el puerto 3000) y en producción, Caddy. Solo si la API vive en otro dominio hace falta `VITE_API_URL` (ver `.env.example`).
- El seguimiento en vivo se conecta a Socket.IO con el JWT de la sesión (`src/socket/trackingSocket.ts`).
- Las rutas están protegidas por rol en `src/App.tsx`; el backend vuelve a validar todo, así que ocultar una pantalla no es la única barrera.
