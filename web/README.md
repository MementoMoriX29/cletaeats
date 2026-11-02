# CletaEats · Web

Una sola app web con cuatro secciones: la tienda para clientes, el panel del restaurante, la app del repartidor (pensada para el celular) y la consola de soporte.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS · React Router · TanStack Query · Socket.IO client · Leaflet (OpenStreetMap) · Recharts

```bash
npm install
npm run dev      # http://localhost:5173 (redirige /api y /socket.io a localhost:3000)
npm run build    # genera dist/ para servir como sitio estático
npm run lint
```

## Secciones

| Ruta | Quién | Qué hay |
|---|---|---|
| `/`, `/restaurante/:id` | cualquiera | Restaurantes con búsqueda y categorías; costo de envío y tiempo estimado según la dirección elegida |
| `/checkout`, `/pedidos`, `/pedidos/:id`, `/cuenta` | cliente | Pago, seguimiento en vivo con mapa, calificación, reportes, direcciones y datos de la cuenta |
| `/ingresar`, `/registro` | cualquiera | Un solo login; después de entrar, cada rol va a su sección |
| `/repartidores` | cualquiera | Solicitud para repartir |
| `/repartidor` | repartidor | Conectarse, pedidos disponibles, entrega en curso, ganancias y cuenta |
| `/negocio` | restaurante | Pedidos en columnas (nuevos, en preparación, listos) con aviso sonoro, menú y ajustes |
| `/admin` | soporte | Resumen con gráficos, pedidos, repartidores, restaurantes, clientes y reportes |

## Cómo está armada

- **Datos:** TanStack Query guarda en caché las respuestas de la API. Cuando el servidor avisa por Socket.IO que un pedido cambió (`src/context/SocketContext.tsx`), se invalidan las consultas afectadas y cada pantalla vuelve a pedir sus datos; por eso la web nunca muestra algo que la API no le dejaría ver.
- **Sesión:** `src/context/AuthContext.tsx`. Al abrir la app se revalida con `/api/me`; si la cuenta fue suspendida o la sesión cerrada desde otro lado, vuelve al login.
- **Rutas por rol:** `src/App.tsx` y `src/components/RequireRole.tsx`. El backend vuelve a validar todo: ocultar una pantalla no es la única barrera. Cada sección se descarga recién cuando se visita.
- **Pagos:** `src/lib/gateway.ts` imita una pasarela real: valida la tarjeta (Luhn, vencimiento, código) y la cambia por un token en el navegador. Al servidor solo viajan el token, la marca y los últimos 4 dígitos.
- **Mapas:** Leaflet con teselas de OpenStreetMap/CARTO; los marcadores son SVG propios. El repartidor comparte su ubicación desde el GPS del celular.
- **Formato de Costa Rica:** colones sin decimales, horas en `America/Costa_Rica` y direcciones por señas con un punto en el mapa.

## Configuración

- La API se llama en `/api` del mismo dominio. En desarrollo lo resuelve el proxy de Vite (`vite.config.ts`; variable `API_TARGET` si el backend no está en el puerto 3000) y en producción, Caddy. Solo si la API vive en otro dominio hace falta `VITE_API_URL`.
- `VITE_DEMO=false` desactiva el modo demostración (pagos simulados, cuentas de prueba en el login, botón para simular el recorrido del repartidor). Ver `.env.example`.
