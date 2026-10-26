# Seguridad

Este documento resume cómo se protege CletaEats, qué puede hacer cada rol y qué limitaciones se conocen.
Es un proyecto académico: las medidas están **alineadas** con OWASP Top 10 y con buenas prácticas de PCI DSS y de la Ley 8968,
pero el sistema **no está certificado** bajo ninguna norma.

## Reportar una vulnerabilidad

Si encontrás un problema de seguridad, no abras un issue público: usá **Security → Report a vulnerability** en este repositorio
(reporte privado de GitHub). Respondo en cuanto pueda.

---

## Matriz de permisos

✔ = permitido · **propio** = solo sobre sus propios datos · — = denegado

| Recurso / acción | Público | Cliente | Repartidor | Admin |
|---|:-:|:-:|:-:|:-:|
| Registrarse e iniciar sesión | ✔ | | | |
| Ver restaurantes y combos | ✔ | ✔ | ✔ | ✔ |
| Crear, editar y borrar restaurantes y combos | — | — | — | ✔ |
| Ver y editar perfil de cliente | — | propio | — | ✔ |
| Suspender o reactivar clientes | — | — | — | ✔ |
| Crear pedido | — | ✔ | — | — |
| Ver pedido, factura y ubicación | — | propio | asignado | ✔ |
| Historial de pedidos de un cliente | — | propio | — | ✔ |
| Cambiar estado del pedido | — | — | asignado | ✔ |
| Calificar al repartidor | — | propio, 1 vez, entregado | — | — |
| Reportar a un repartidor | — | solo si lo atendió | — | — |
| Ver y editar perfil de repartidor | — | — | propio | ✔ |
| Cambiar estado del repartidor | — | — | propio: disponible ↔ inactivo | ✔ (incluye suspender) |
| Amonestar repartidores | — | — | — | ✔ |
| Reportes | — | — | — | ✔ |
| Seguimiento en tiempo real: escuchar | — | propio | asignado | ✔ |
| Seguimiento en tiempo real: enviar ubicación | — | — | asignado, en camino | — |

Cada regla tiene un test automático en [`backend/tests/api.test.js`](backend/tests/api.test.js).

---

## Controles según OWASP Top 10 (2021)

| Riesgo | Cómo se mitiga |
|---|---|
| **A01 Control de acceso roto** | Rol y propiedad se verifican en el servidor en cada ruta y en el socket. El `client_id` de un pedido sale del token, nunca del body. Los pedidos ajenos responden 404 (no se puede averiguar qué IDs existen). Un repartidor suspendido no puede reactivarse solo. |
| **A02 Fallas criptográficas** | Contraseñas con bcrypt (costo 10; 12 para el admin). JWT HS256 con secreto de ≥ 32 caracteres y expiración de 2 h. HTTPS en el despliegue de producción (Caddy) y obligatorio en la app Android release (`network_security_config`). |
| **A03 Inyección** | Todo acceso a datos usa procedimientos almacenados o consultas parametrizadas con `mysql2`; no se arma SQL concatenando datos del usuario. React escapa la salida por defecto. |
| **A04 Diseño inseguro** | Las reglas que afectan el precio o la reputación las decide el servidor: si es feriado (hora de Costa Rica), a qué repartidor se califica y que la calificación sea única por pedido. |
| **A05 Configuración insegura** | Cabeceras de seguridad con `helmet`, sin `X-Powered-By`, CORS restringido en producción, límite de 100 KB en el body, contenedor sin root, errores 500 sin detalles internos. |
| **A06 Componentes vulnerables** | `npm audit` en CI (falla con severidad alta) y Dependabot mensual para npm, Gradle y GitHub Actions. |
| **A07 Fallas de autenticación** | Rate limiting en login y registro (20 intentos / 15 min por IP). Mismo mensaje y mismo tiempo de respuesta para correo inexistente o contraseña incorrecta. Contraseñas de 8 caracteres o más. |
| **A08 Integridad de software y datos** | `package-lock.json` versionado e instalación con `npm ci`. CodeQL y gitleaks en cada push. |
| **A09 Registro y monitoreo** | Los errores inesperados se registran en el servidor; `/health` verifica API y base de datos para el monitoreo. |
| **A10 SSRF** | La API no hace peticiones a URLs que provengan del usuario. |

## Datos sensibles

| Dato | Tratamiento |
|---|---|
| Tarjeta | Se recibe para validar el formato y **solo se guardan los últimos 4 dígitos** (`card_last4`). Principio de PCI DSS: no almacenar el número completo si no es necesario. |
| Contraseñas | Hash bcrypt. Nunca se devuelven en la API, tampoco en los listados del admin. |
| Token de sesión | No incluye datos personales (solo `id` y `rol`). En Android no se respalda en la nube (`allowBackup=false`) y no se escribe en los logs. |
| Secretos | Solo por variables de entorno. `.env`, llaves y `google-services.json` están en `.gitignore`; gitleaks revisa el historial en CI. |
| Datos personales (Ley 8968) | Se piden solo los datos necesarios para entregar el pedido; la tarjeta queda reducida a 4 dígitos. |

## Evidencia automatizada

| Herramienta | Qué verifica | Dónde |
|---|---|---|
| Jest + Supertest | 36 tests de integración contra MySQL real: permisos, reglas de negocio, socket | `ci.yml` → backend |
| npm audit | Dependencias de producción sin vulnerabilidades altas | `ci.yml` → backend y web |
| CodeQL | Análisis estático de JavaScript/TypeScript (consultas `security-extended`) | `codeql.yml` |
| gitleaks | Secretos en el código y en el historial | `ci.yml` → secrets |
| Dependabot | Actualizaciones de dependencias | `dependabot.yml` |

---

## Limitaciones conocidas

- **La distancia del pedido la calcula el cliente.** El servidor la limita a 50 km, pero un cliente modificado podría declarar menos distancia. Lo correcto sería calcularla en el servidor con las coordenadas de entrega.
- **El token web se guarda en `localStorage`.** Un XSS podría leerlo. Mitigado porque React escapa la salida; la alternativa más robusta es una cookie `HttpOnly`.
- **Sin revocación de tokens.** Un token robado vale hasta que expira (2 h). No hay refresh tokens ni cierre de sesión en el servidor.
- **Admin único** definido por variables de entorno, sin segundo factor.
- **Dependencia de desarrollo con aviso moderado:** `tailwindcss` 3 usa una versión de `postcss-selector-parser` con un problema de rendimiento al compilar CSS. Solo afecta el build (que procesa CSS propio), no la app publicada.
- **Ubicaciones en memoria:** la última posición de cada pedido vive en memoria del proceso; con varias instancias de la API haría falta Redis.
