# Seguridad

Este documento resume cómo se protege CletaEats, qué puede hacer cada rol y qué limitaciones se conocen.
Es un proyecto académico: las medidas están **alineadas** con OWASP Top 10 y con buenas prácticas de PCI DSS y de la Ley 8968,
pero el sistema **no está certificado** bajo ninguna norma.

## Reportar una vulnerabilidad

Si encontrás un problema de seguridad, no abras un issue público: usá **Security → Report a vulnerability** en este repositorio
(reporte privado de GitHub).

---

## Matriz de permisos

✔ = permitido · **propio** = solo sobre sus propios datos · — = denegado

| Recurso / acción | Público | Cliente | Restaurante | Repartidor | Soporte |
|---|:-:|:-:|:-:|:-:|:-:|
| Crear cuenta de cliente o enviar solicitud de repartidor | ✔ | | | | |
| Ver restaurantes, menús, costo de envío y tiempo estimado | ✔ | ✔ | ✔ | ✔ | ✔ |
| Editar su perfil y cambiar su contraseña | — | propio | propio | propio | propio |
| Direcciones de entrega | — | propias | — | — | — |
| Cotizar y hacer un pedido | — | ✔ | — | — | — |
| Ver un pedido | — | propio | de su restaurante | asignado | ✔ |
| Seguir un pedido en tiempo real | — | propio | de su restaurante | asignado | ✔ |
| Cancelar un pedido | — | propio, mientras está por confirmar | — | — | ✔ si no está cerrado |
| Aceptar, rechazar o marcar listo | — | — | de su restaurante | — | — |
| Ver pedidos disponibles y aceptar uno | — | — | — | aprobado, conectado, uno a la vez | — |
| Retirar, entregar y enviar su ubicación | — | — | — | asignado | — |
| Calificar al repartidor y al restaurante | — | propio, una vez, entregado | — | — | — |
| Reportar un problema con un pedido | — | propio | — | — | — |
| Menú, horario y ajustes de la tienda | — | — | propio | — | — |
| Alta y edición de restaurantes con la cuenta del dueño | — | — | — | — | ✔ |
| Aprobar, amonestar, suspender y reactivar repartidores | — | — | — | — | ✔ |
| Suspender y reactivar clientes | — | — | — | — | ✔ |
| Resolver reportes, con reembolso o amonestación | — | — | — | — | ✔ |
| Indicadores del negocio | — | — | — | — | ✔ |

Las reglas se prueban en `backend/tests/` (por ejemplo, `orders.test.js` → *quién ve qué* y `merchant.test.js` → *no puede tocar productos de otro restaurante*).

### Cada rol ve solo lo que necesita

Un mismo pedido se devuelve distinto según quién lo pide:

| Dato del pedido | Cliente | Restaurante | Repartidor |
|---|:-:|:-:|:-:|
| Nombre del cliente | completo | "María G." | "María G." |
| Dirección de entrega | ✔ | — | ✔ (completa solo mientras lo lleva) |
| Teléfono del cliente | — | — | solo mientras lo lleva |
| Desglose del precio | completo | subtotal | total, envío y propina |
| Comprobante de SINPE | ✔ | ✔ | — |

---

## Controles según OWASP Top 10 (2021)

| Riesgo | Cómo se mitiga |
|---|---|
| **A01 Control de acceso roto** | Rol y propiedad se verifican en el servidor en cada ruta y en el socket; los ids del cliente, del restaurante y del repartidor salen del token, nunca del body. Los pedidos ajenos responden 404, así no se puede averiguar qué ids existen. Un repartidor pendiente o suspendido no puede tomar pedidos. |
| **A02 Fallas criptográficas** | Contraseñas con bcrypt (costo 12). JWT HS256 firmado con un secreto de 32 caracteres o más. HTTPS en producción (Caddy) y obligatorio en la app Android release (`network_security_config`). |
| **A03 Inyección** | Todo acceso a datos usa procedimientos almacenados o consultas parametrizadas con `mysql2`. Las búsquedas escapan los comodines de `LIKE`. React escapa la salida por defecto. |
| **A04 Diseño inseguro** | Lo que mueve dinero lo decide el servidor: precios del menú, distancia, envío, recargo por feriado (hora de Costa Rica), tarifa de servicio, IVA y reembolsos. Las transiciones del pedido se validan dentro de transacciones con bloqueo de fila: dos repartidores no pueden tomar el mismo pedido y nada se puede saltar un estado. |
| **A05 Configuración insegura** | Cabeceras de seguridad con `helmet`, sin `X-Powered-By`, CORS restringido en producción, límite de 100 KB en el body, contenedor sin root, errores 500 sin detalles internos. No hay cuenta de administración en los datos de demostración ni en variables de entorno: se crea con `npm run create-admin`. |
| **A06 Componentes vulnerables** | `npm audit` en CI (falla con severidad alta) y Dependabot mensual para npm, Gradle y GitHub Actions. |
| **A07 Fallas de autenticación** | Límite de 20 intentos de login o registro cada 15 min por IP, y límites generales para la API y para crear pedidos. Mismo mensaje y mismo tiempo de respuesta para un correo inexistente o una contraseña incorrecta. Contraseñas de 8 a 72 caracteres. Cada petición revisa la cuenta: una suspensión o un cambio de contraseña invalidan al instante las sesiones abiertas, también los sockets. |
| **A08 Integridad de software y datos** | `package-lock.json` versionado e instalación con `npm ci`. CodeQL y gitleaks en cada push. Toda entrada se valida y normaliza con esquemas zod antes de llegar a los servicios. |
| **A09 Registro y monitoreo** | Los errores inesperados se registran en el servidor; `/health` verifica la API y la base de datos para el monitoreo. |
| **A10 SSRF** | La API no hace peticiones a URLs que provengan del usuario. La foto de portada de un restaurante solo se acepta como enlace `https` y la descarga el navegador, no el servidor. |

## Datos sensibles

| Dato | Tratamiento |
|---|---|
| Tarjeta | El número, el vencimiento y el código se validan y se convierten en un token en el navegador, como con una pasarela real (Stripe, BAC Credomatic). **Al servidor solo llegan el token, la marca y los últimos 4 dígitos**, que es lo único que se guarda. En la demo la pasarela es simulada. |
| Contraseñas | Hash bcrypt. Nunca se devuelven en la API, tampoco en los listados de soporte. La contraseña temporal del dueño de un restaurante nuevo se muestra una sola vez. |
| Token de sesión | Solo lleva el id de la cuenta, el rol y una versión de sesión; nada personal. En Android no se respalda en la nube (`allowBackup=false`) y no se escribe en los logs. |
| Ubicación del repartidor | Se envía solo mientras está conectado y como mucho cada 3 segundos; la ven el cliente y el restaurante del pedido que lleva. |
| Secretos | Solo por variables de entorno. `.env`, llaves y `google-services.json` están en `.gitignore`; gitleaks revisa el historial en CI. |
| Datos personales (Ley 8968) | Se piden solo los datos necesarios para entregar: nombre, correo, teléfono y direcciones. La cédula se pide únicamente a los repartidores. Cada rol ve lo mínimo para su tarea (tabla de arriba). |

## Evidencia automatizada

| Herramienta | Qué verifica | Dónde |
|---|---|---|
| Jest + Supertest | 75 tests de integración contra MySQL real: permisos, reglas de negocio, carreras entre repartidores, pagos, sesiones y socket | `ci.yml` → backend |
| npm audit | Dependencias de producción sin vulnerabilidades altas | `ci.yml` → backend y web |
| CodeQL | Análisis estático de JavaScript/TypeScript (consultas `security-extended`) | `codeql.yml` |
| gitleaks | Secretos en el código y en el historial | `ci.yml` → secrets |
| Dependabot | Actualizaciones de dependencias | `dependabot.yml` |

---

## Limitaciones conocidas

- **Pagos simulados.** La tokenización de tarjetas imita una pasarela real pero no cobra; SINPE Móvil se confía al comprobante que escribe el cliente (en producción se verificaría con el banco).
- **El token web se guarda en `localStorage`.** Un XSS podría leerlo. Está mitigado porque React escapa la salida y la sesión se puede revocar desde el servidor; la alternativa más robusta es una cookie `HttpOnly`.
- **Sin segundo factor** para las cuentas de soporte.
- **Límites de peticiones en memoria.** Con varias instancias de la API haría falta un almacén compartido (Redis) para los límites y para Socket.IO.
- **Avisos moderados en herramientas de desarrollo.** `npm audit` reporta problemas moderados en dependencias de eslint y jest (minimatch, glob, deepmerge). Solo se usan para revisar y probar el código; las dependencias de producción no tienen vulnerabilidades conocidas y CI lo verifica en cada push.
