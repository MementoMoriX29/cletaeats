# CletaEats · Android

App nativa para clientes y repartidores.

**Stack:** Kotlin · Jetpack Compose · Material 3 · Retrofit + OkHttp · Room · WorkManager · DataStore · Google Maps Compose

## Estado

| Módulo | Estado |
|---|---|
| Login, registro (cliente y repartidor) y perfil | Funcional contra la API |
| Restaurantes, carrito, pedidos, seguimiento, panel del repartidor | En desarrollo: los modelos de pedidos todavía no coinciden con el contrato actual de la API. El flujo completo está disponible en la [web](../web). |

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
