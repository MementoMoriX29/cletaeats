# CletaEats · Android

App nativa para clientes y repartidores.

**Stack:** Kotlin · Jetpack Compose · Material 3 · Retrofit + OkHttp · Room · WorkManager · DataStore · Google Maps Compose

## Estado

La API cambió en la versión 2 (un solo login, productos con precio propio en lugar de combos, restaurantes que aceptan los pedidos, repartidores que eligen sus entregas). La app se está migrando por partes:

| Módulo | Estado |
|---|---|
| Inicio de sesión (uno solo para todos, sin elegir rol), registro de clientes, solicitud de repartidor y perfil | Usa la API v2 |
| Restaurantes, menú, carrito, pago, pedidos, seguimiento y app del repartidor | Pendiente de migrar: todavía usa las rutas de la versión 1. El flujo completo está disponible en la [web](../web). |

Las cuentas de restaurante y de soporte se usan desde la web; si inician sesión en la app, se les indica. Un repartidor con la solicitud en revisión ve el estado al intentar entrar.

### Rutas por migrar

| Pantalla | Versión 1 | Versión 2 |
|---|---|---|
| Restaurantes | `GET restaurants` | `GET restaurants?lat=&lng=` (trae envío y tiempo estimado) |
| Menú | `GET restaurants/{id}/combos` | `GET restaurants/{id}` (menú por secciones con productos) |
| Pago | — | `POST orders/quote` y después `POST orders` con `payment` |
| Mis pedidos | `GET orders/client/{id}` | `GET orders` |
| Seguimiento | `GET orders/{id}` (consulta periódica) | `GET orders/{id}` + Socket.IO: `order:watch`, `order:updated` y `courier:location` |
| Repartidor | `PUT delivery-persons/{id}/status`, `GET orders/delivery-person/{id}` | `PUT courier/availability`, `GET courier/offers`, `POST orders/{id}/claim · pickup · deliver` |

El contrato completo está en [`backend/README.md`](../backend/README.md#referencia-de-la-api).

## Configuración

Creá `android/local.properties` (no se sube al repo):

```properties
sdk.dir=/ruta/a/Android/Sdk
MAPS_API_KEY=tu-llave-de-google-maps
# Debug: 10.0.2.2 es el localhost de tu computadora visto desde el emulador.
# En un celular físico, usá la IP de tu computadora en la red local.
API_BASE_URL_DEBUG=http://10.0.2.2:3000/api/
# Release: el dominio desplegado (solo HTTPS)
API_BASE_URL=https://tu-dominio/api/
```

- **Debug** permite HTTP para probar contra el backend local; **release** solo acepta HTTPS (`res/xml/network_security_config.xml`).
- La llave de Maps conviene restringirla en Google Cloud al paquete `com.cletaeats.app` y a la huella SHA-1 de tu firma.
- El token de sesión no se escribe en los logs (`redactHeader`) ni se respalda en la nube (`allowBackup=false`).
- Los errores de la API llegan con un mensaje en español (`{ "error": "…" }`) que la app muestra tal cual (`core/network/ApiErrors.kt`).
