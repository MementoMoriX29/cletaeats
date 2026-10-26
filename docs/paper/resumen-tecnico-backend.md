# CletaEats — Resumen Técnico del Proyecto

> Proyecto académico: API REST para plataforma de delivery, backend compartido entre cliente Android (Kotlin/Jetpack Compose) y panel web (React). Sirve como base para un paper que compara complejidad de implementación entre ambas plataformas cliente.

---

## Stack y versiones

| Tecnología | Versión | Rol |
|---|---|---|
| Node.js | 18+ (implied) | Runtime |
| **express** | `^5.2.1` | Framework HTTP |
| **mysql2** | `^3.22.3` | Driver MySQL con Promises |
| **jsonwebtoken** | `^9.0.3` | Generación y verificación JWT |
| **bcryptjs** | `^3.0.3` | Hash de contraseñas (salt 10) |
| **express-rate-limit** | `^8.5.2` | Rate limiting en endpoints de auth |
| **dotenv** | `^17.4.2` | Variables de entorno |
| **cors** | `^2.8.6` | Cross-Origin Resource Sharing |
| nodemon *(dev)* | `^3.1.14` | Auto-reload en desarrollo |

**Base de datos:** MySQL 8.x — `utf8mb4_unicode_ci`  
**Scripts npm:** `npm start` → `node src/app.js` | `npm run dev` → `nodemon src/app.js`

---

## Estructura de carpetas

```
Aplicaciones_M-viles/
├── src/
│   ├── app.js                           ← Entry point, monta rutas y middleware global
│   ├── config/
│   │   └── db.js                        ← Pool MySQL (connectionLimit: 10)
│   ├── middleware/
│   │   ├── authMiddleware.js            ← Verifica JWT Bearer token → req.user
│   │   └── roleMiddleware.js            ← Factory requireRole(...roles) → 403
│   ├── models/                          ← Validación de dominio (sin ORM)
│   │   ├── Client.js                    ← Valida national_id, email, card_number, password
│   │   ├── Combo.js                     ← Valida combo_number (1-9), calcula precio
│   │   ├── DeliveryPerson.js            ← Mismos campos que Client
│   │   ├── Invoice.js                   ← Calcula IVA (13%), transporte, total
│   │   ├── Order.js                     ← Valida items[], distance_km, restaurant_id
│   │   └── Restaurant.js               ← Valida name, tax_id, address, food_type
│   ├── dao/                             ← Acceso directo a DB (ejecuta stored procedures)
│   │   ├── clientDao.js
│   │   ├── comboDao.js
│   │   ├── complaintDao.js
│   │   ├── deliveryPersonDao.js
│   │   ├── orderDao.js
│   │   └── restaurantDao.js
│   ├── repositories/                    ← Adapta resultados de DAOs al formato de app
│   │   ├── clientRepository.js
│   │   ├── complaintRepository.js
│   │   ├── deliveryPersonRepository.js
│   │   ├── orderRepository.js
│   │   └── restaurantRepository.js      ← ⚠️ importa comboDao directamente (B-11)
│   ├── services/                        ← Lógica de negocio
│   │   ├── clientService.js
│   │   ├── deliveryPersonService.js
│   │   ├── orderService.js              ← Flujo completo de creación de pedido (10 pasos)
│   │   ├── reportService.js
│   │   └── restaurantService.js
│   └── routes/                          ← Endpoints HTTP
│       ├── authRoutes.js
│       ├── clientRoutes.js
│       ├── deliveryPersonRoutes.js
│       ├── orderRoutes.js
│       ├── reportRoutes.js
│       └── restaurantRoutes.js
├── database.sql                         ← DDL + 42 stored procedures + 4 funciones + seed data
├── procedures.sql                       ← Solo procedimientos (CLI mysql)
├── create_procedures_workbench.sql      ← Procedimientos sin DELIMITER (MySQL Workbench)
├── .env                                 ← Variables de entorno (NO en git)
├── .env.example                         ← Plantilla de variables sin valores
├── package.json
├── README.md                            ← Documentación completa (~1310 líneas)
└── docs/
    ├── TECHNICAL_SUMMARY.md             ← Este archivo
    ├── conflictos-backend.md            ← Log de 11 conflictos durante desarrollo
    ├── conflictos-web.md                ← Conflictos del cliente React
    └── metricas-paper/                  ← Métricas del paper académico
```

---

## Endpoints implementados

Base path: `/api`

### Auth — `authRoutes.js`

| Método | Ruta | Auth | Rate limit | Descripción |
|--------|------|------|-----------|-------------|
| `POST` | `/auth/register-client` | Ninguna | 20/15min | Registra nuevo cliente. Valida modelo, verifica unicidad de `national_id` y `email`, hashea password con bcrypt. Devuelve 201 + objeto cliente. |
| `POST` | `/auth/register-delivery-person` | Ninguna | 20/15min | Igual que registro de cliente pero para repartidores. |
| `POST` | `/auth/login` | Ninguna | 20/15min | Login para los tres roles. `rol` requerido en body (`cliente` \| `repartidor` \| `admin`). Admin autentica contra `.env` (sin bcrypt). Otros roles usan `bcrypt.compare`. Devuelve `{ token, user }`. |

### Clientes — `clientRoutes.js`

| Método | Ruta | Auth | Roles permitidos | Descripción |
|--------|------|------|-----------------|-------------|
| `GET` | `/clients` | JWT | `admin` | Lista todos los clientes. |
| `GET` | `/clients/:id` | JWT | `admin`, `cliente` (solo propio) | Devuelve un cliente por ID. Cliente solo puede ver su propio perfil (403 si intenta acceder a otro). |
| `PUT` | `/clients/:id` | JWT | `admin`, `cliente` (solo propio) | Actualiza datos del cliente. No permite cambiar `national_id` ni `password`. |
| `PUT` | `/clients/:id/status` | JWT | `admin` | Cambia status a `active` o `suspended`. |

### Restaurantes — `restaurantRoutes.js`

| Método | Ruta | Auth | Roles permitidos | Descripción |
|--------|------|------|-----------------|-------------|
| `GET` | `/restaurants` | Ninguna | Público | Lista todos los restaurantes. |
| `GET` | `/restaurants/:id` | Ninguna | Público | Devuelve restaurante por ID. |
| `GET` | `/restaurants/:id/combos` | Ninguna | Público | Devuelve los combos (1-9) del restaurante. Precio = `(número + 3) × 1000` CRC. |
| `POST` | `/restaurants` | JWT | `admin` | Crea restaurante. Valida modelo (name, tax_id único, address, food_type). |
| `PUT` | `/restaurants/:id` | JWT | `admin` | Actualiza datos del restaurante. |

### Pedidos — `orderRoutes.js`

| Método | Ruta | Auth | Roles permitidos | Descripción |
|--------|------|------|-----------------|-------------|
| `POST` | `/orders` | JWT | `cliente` | Crea pedido. Asigna repartidor disponible automáticamente, calcula factura. Devuelve order + items. Lanza 503 si no hay repartidores. |
| `GET` | `/orders/client/:clientId` | JWT | `admin`, `cliente` (solo propio) | Lista pedidos de un cliente. |
| `GET` | `/orders/:id` | JWT | Cualquier rol autenticado | Devuelve pedido + items por ID. |
| `PUT` | `/orders/:id/status` | JWT | `repartidor` (solo su pedido), `admin` | Actualiza estado del pedido. Al llegar a `delivered`, libera al repartidor (`available`). Estados válidos: `preparing` → `in_transit` → `delivered` \| `suspended`. |
| `GET` | `/orders/:id/invoice` | JWT | Cualquier rol autenticado | Devuelve factura del pedido (subtotal, transporte, IVA 13%, total). |

### Repartidores — `deliveryPersonRoutes.js`

| Método | Ruta | Auth | Roles permitidos | Descripción |
|--------|------|------|-----------------|-------------|
| `GET` | `/delivery-persons` | JWT | `admin` | Lista todos los repartidores. |
| `GET` | `/delivery-persons/:id` | JWT | `admin`, `repartidor` (solo propio) | Devuelve repartidor por ID. |
| `PUT` | `/delivery-persons/:id/status` | JWT | `admin` | Cambia status: `available` \| `busy` \| `suspended`. |
| `POST` | `/delivery-persons/:id/complaints` | JWT | `cliente` | Registra queja contra repartidor. Valida `friendliness`, `response_time`, `presentation` (1-5). Si `adds_warning=true`, incrementa contador; al llegar a 4, el SP suspende al repartidor automáticamente. |

### Reportes — `reportRoutes.js` (todos requieren JWT + rol `admin`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/reports/clients/active` | Clientes con status `active`. |
| `GET` | `/reports/clients/suspended` | Clientes con status `suspended`. |
| `GET` | `/reports/clients/most-orders` | Clientes ordenados por cantidad de pedidos. |
| `GET` | `/reports/restaurants` | Lista completa de restaurantes. |
| `GET` | `/reports/restaurants/most-orders` | Restaurante con más pedidos. |
| `GET` | `/reports/restaurants/least-orders` | Restaurante con menos pedidos. |
| `GET` | `/reports/restaurants/sales-by-restaurant` | Ventas totales agrupadas por restaurante. |
| `GET` | `/reports/restaurants/total-sales` | Total de ventas globales. |
| `GET` | `/reports/delivery-persons/no-warnings` | Repartidores sin advertencias. |
| `GET` | `/reports/delivery-persons/complaints` | Quejas agrupadas por repartidor. |
| `GET` | `/reports/orders/by-client` | Pedidos agrupados por cliente. |
| `GET` | `/reports/orders/peak-hours` | Pedidos por hora del día (`HOUR(placed_at), COUNT(*)`). |

### Health check

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/health` | `{"status":"ok","service":"CletaEats API"}` — sin auth, para monitoreo. |

**Total: 28 endpoints**

---

## Pantallas implementadas (Android)

> **El cliente Android (Kotlin/Jetpack Compose) no está en este directorio de trabajo.** Solo existe el backend Express. El README del backend y `conflictos-backend.md` mencionan patrones de integración Android (Retrofit, Room, OkHttp `AuthInterceptor`, Navigation Component, WorkManager) pero no hay archivos `.kt` ni `build.gradle` en este repositorio.
>
> Si el código Android existe en otro directorio, debe analizarse por separado. Lo que sí se puede inferir del backend es qué pantallas *necesitaría* la app:

| Pantalla inferida | Endpoints que consumiría | Notas |
|-------------------|--------------------------|-------|
| Login | `POST /auth/login` | Rol `cliente` o `repartidor` |
| Registro de cliente | `POST /auth/register-client` | |
| Lista de restaurantes | `GET /restaurants` | Sin auth |
| Detalle de restaurante + combos | `GET /restaurants/:id/combos` | Sin auth |
| Crear pedido | `POST /orders` | JWT requerido |
| Historial de pedidos | `GET /orders/client/:id` | |
| Detalle de pedido + factura | `GET /orders/:id`, `GET /orders/:id/invoice` | |
| Perfil del cliente | `GET /clients/:id`, `PUT /clients/:id` | |
| Panel del repartidor | `GET /delivery-persons/:id`, `PUT /orders/:id/status` | |
| Registrar queja | `POST /delivery-persons/:id/complaints` | Rol `cliente` |
| Panel admin (web, no Android) | Todos los endpoints `/reports/*` | |

---

## Patrones de diseño presentes

### 1. Arquitectura en capas (Layered Architecture)
Flujo: `Route → Service → Repository → DAO → MySQL`

| Capa | Archivos | Responsabilidad |
|------|---------|----------------|
| Routes | `src/routes/*.js` | Parse HTTP, delega a Service |
| Service | `src/services/*.js` | Lógica de negocio, orquesta repos |
| Repository | `src/repositories/*.js` | Adapta resultados de DAOs |
| DAO | `src/dao/*.js` | Ejecuta stored procedures |
| Model | `src/models/*.js` | Validación y cálculos de dominio |

### 2. Data Access Object (DAO)
**Archivos:** `src/dao/clientDao.js`, `orderDao.js`, etc.  
Cada DAO encapsula las llamadas a stored procedures y normaliza la estructura nested de `mysql2` mediante el helper privado `_rows` ([clientDao.js:3-7](src/dao/clientDao.js#L3-L7)).

### 3. Repository Pattern
**Archivos:** `src/repositories/*.js`  
Actúa como adaptador entre el DAO (retorna arrays crudos) y el Service (espera objetos o `null`). Ejemplo: `getById(id) → rows[0] ?? null` ([clientRepository.js](src/repositories/clientRepository.js)).

### 4. Middleware Chain (Chain of Responsibility)
**Archivos:** `src/middleware/authMiddleware.js`, `roleMiddleware.js`  
Cada request pasa por `verifyToken` → `requireRole(...)` antes de llegar al handler. Permite componer protecciones de forma declarativa en cada ruta ([app.js:24-29](src/app.js#L24-L29)).

### 5. Factory Method
**Archivo:** `src/middleware/roleMiddleware.js:1`  
`requireRole(...roles)` es una factory que retorna un middleware específico para el conjunto de roles dado.

### 6. Domain Model + Validation Object
**Archivos:** `src/models/*.js`  
Cada modelo expone `validate()` que retorna un array de errores. El patrón evita que la validación quede en el Service o la Route ([Order.js:10-19](src/models/Order.js#L10-L19), [Client.js](src/models/Client.js)).

### 7. Centralized Error Handling
**Archivo:** `src/app.js:35-40`  
Un único middleware `(err, req, res, next)` al final de la cadena captura todos los errores lanzados desde servicios (`throw { status, message }`). Evita bloques try/catch en cada handler salvo para el `next(err)`.

### 8. Stored Procedure Facade (en base de datos)
**Archivo:** `database.sql`  
42 stored procedures exponen una API SQL limpia a la capa Node.js. Toda la lógica de acceso a datos vive en el motor MySQL, incluyendo cálculos financieros (`fn_calculate_iva`, `fn_calculate_total`).

---

## Estado de autenticación

### Flujo completo Login → Request autenticado

```
Cliente (Android / React)
        │
        │  POST /api/auth/login
        │  Body: { email, password, rol }
        ▼
authRoutes.js:55-83
        │
        ├─ rol === 'admin'
        │       └─ Compara contra process.env.ADMIN_EMAIL / ADMIN_PASSWORD
        │          (texto plano, sin bcrypt)
        │
        └─ rol === 'cliente' | 'repartidor'
                └─ Busca user por email en DB
                   └─ bcrypt.compare(password, user.password)
                      └─ Si suspendido → 403
        │
        ▼
signToken({ id, national_id, rol })  ← JWT firmado con JWT_SECRET, expira en 2h
        │
        ▼
Respuesta: { token: "eyJ...", user: { id, name, email, rol, ... } }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Request autenticado:
        │
        │  Authorization: Bearer eyJ...
        ▼
authMiddleware.js:3-14  (verifyToken)
        │
        ├─ Sin header → 401 "Token requerido"
        └─ jwt.verify(token, JWT_SECRET) → req.user = { id, national_id, rol, iat, exp }
        │
        ▼
roleMiddleware.js:1-6  (requireRole — solo si la ruta lo exige)
        │
        └─ req.user.rol ∈ roles[] → next()
           else → 403 "Acceso denegado"
        │
        ▼
Handler de la ruta
```

### Variables de entorno necesarias para auth

| Variable | Uso |
|----------|-----|
| `JWT_SECRET` | Firma y verifica todos los tokens |
| `ADMIN_EMAIL` | Credencial de admin (texto plano) |
| `ADMIN_PASSWORD` | Credencial de admin (texto plano) |

### Payload del JWT

```json
// Cliente / Repartidor
{ "id": 5, "national_id": "12345678", "rol": "cliente", "iat": 1234, "exp": 5678 }

// Admin
{ "id": 0, "email": "admin@cletaeats.com", "rol": "admin", "iat": 1234, "exp": 5678 }
```

### Limitaciones actuales del sistema de auth
- **Sin refresh token** — el token expira en 2h sin posibilidad de renovación silenciosa (`/api/auth/refresh` no existe).
- **Sin lista negra (blacklist)** — un token robado es válido hasta que expire.
- **Asimetría admin** — admin autentica con comparación `===` en texto plano; roles de DB usan bcrypt.

---

## Qué está incompleto o roto

> Fuente: `docs/conflictos-backend.md`. Los ítems marcados con ❌ **no tienen fix aplicado**.

### Problemas de seguridad

| ID | Archivo | Descripción | Estado |
|----|---------|-------------|--------|
| **B-05** | Historial git | `.env` con credenciales fue committeado en `913f540`. Visible en `git show 913f540:.env`. Fix completo requiere `git filter-repo --path .env --invert-paths` + rotar credenciales. | ❌ Pendiente (destructivo, requiere coordinación) |
| **B-07** | [authRoutes.js:62-65](src/routes/authRoutes.js#L62-L65) | Admin ahora usa `bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH)`. Hash generado y escrito en `.env`. `.env.example` actualizado. | ✅ Resuelto |

### Problemas de concurrencia

| ID | Archivo | Descripción | Estado |
|----|---------|-------------|--------|
| **B-08** | [orderService.js:35](src/services/orderService.js#L35) | Nuevo SP `sp_claim_delivery_person` hace `SELECT FOR UPDATE` + `UPDATE status='busy'` en una transacción atómica. `orderService` usa `claimAvailable()` y ya no llama `updateStatus('busy')` por separado. | ✅ Resuelto |

### Problemas de arquitectura / mantenibilidad

| ID | Archivo | Descripción | Estado |
|----|---------|-------------|--------|
| **B-09** | [orderDao.js:30](src/dao/orderDao.js#L30) + SQL | `sp_create_invoice` ahora calcula IVA y total internamente con `fn_calculate_iva` y `fn_calculate_total`. `orderService` solo pasa `subtotal` y `transport_cost`. Un único lugar define la lógica financiera. | ✅ Resuelto |
| **B-11** | [restaurantDao.js](src/dao/restaurantDao.js) | Métodos `findCombos` y `findComboById` movidos a `restaurantDao`. `restaurantRepository` ya no importa `comboDao`. | ✅ Resuelto |

### Problemas de UX / integración con clientes

| ID | Archivo | Descripción | Estado |
|----|---------|-------------|--------|
| **B-10** | [authRoutes.js](src/routes/authRoutes.js) | Nuevo endpoint `POST /api/auth/refresh` — recibe el token vigente (vía `verifyToken`) y devuelve uno nuevo con 2h frescos sin re-autenticar. | ✅ Resuelto |

### Resueltos (referencia)

| ID | Fix | Commit |
|----|-----|--------|
| B-01 | `app.set('trust proxy', 1)` en [app.js:14](src/app.js#L14) — rate limiter usaba IP del proxy | `895b26c` |
| B-02 | `COLLATE utf8mb4_unicode_ci` explícito en cláusulas `WHERE` de SPs de búsqueda por texto | `895b26c` |
| B-03 | `INSERT IGNORE INTO` en bloques de seed data para idempotencia | `895b26c` |
| B-04 | Archivo `create_procedures_workbench.sql` sin `DELIMITER` para compatibilidad con Workbench | `895b26c` |
| B-06 | Helper `_rows` en DAOs que normaliza la estructura nested `results[0]` de `mysql2` al invocar `CALL` | Mitigado |

### Funcionalidades no implementadas (inferidas)

- No existe endpoint `DELETE` para ninguna entidad (borrado lógico vía `status` en su lugar).
- No existe paginación en endpoints de listado (`GET /clients`, `GET /delivery-persons`).
- No existe validación de que el `client_id` del body coincida con `req.user.id` en `POST /orders` — el service usa el `client_id` inyectado desde `req.user.id` en la ruta ([orderRoutes.js:10](src/routes/orderRoutes.js#L10)), lo cual es correcto, pero no valida el campo si se envía explícitamente en el body.
- No existe documentación OpenAPI/Swagger — los clientes deben conocer el contrato a través del README.
- No hay tests automatizados (ningún archivo `*.test.js` o `*.spec.js`).

---

*Generado el 2026-05-28 — rama `backend`*
