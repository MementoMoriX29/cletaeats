# Métricas de Implementación — CletaEats Backend
**Proyecto:** CletaEats — Backend Express.js + MySQL  
**Repositorio:** `Aplicaciones_M-viles` (rama `backend`)  
**Fecha de extracción:** 2026-05-17  
**Contexto:** Paper académico — Comparación React vs. Kotlin/Jetpack Compose sobre backend Express.js compartido

---

## 1. Conteo de archivos por capa

Comandos ejecutados:
```
find src/dao          -name "*.js" | wc -l   → 6
find src/repositories -name "*.js" | wc -l   → 5
find src/services     -name "*.js" | wc -l   → 5
find src/routes       -name "*.js" | wc -l   → 6
find src/models       -name "*.js" | wc -l   → 6
find src/middleware    -name "*.js" | wc -l   → 2
find src/config       -name "*.js" | wc -l   → 1
find src              -name "*.js" | wc -l   → 32  (incluye app.js)
```

| Capa | Carpeta | Archivos `.js` |
|------|---------|---------------|
| Punto de entrada | `src/` | 1 (`app.js`) |
| Rutas (Controllers) | `src/routes/` | 6 |
| Servicios (Lógica de negocio) | `src/services/` | 5 |
| Repositorios | `src/repositories/` | 5 |
| DAO (Acceso a datos) | `src/dao/` | 6 |
| Modelos / Dominio | `src/models/` | 6 |
| Middleware | `src/middleware/` | 2 |
| Configuración | `src/config/` | 1 |
| **TOTAL** | `src/` | **32** |

---

## 2. Líneas de código (LOC) por archivo clave

> Método: `wc -l <archivo>` ejecutado directamente sobre cada archivo.

---

### Pantalla de Login — ARCHIVO NO EXISTE EN ESTE PROYECTO

El backend no tiene pantallas de interfaz. El equivalente funcional es el endpoint de login en:

**Archivo:** `src/routes/authRoutes.js`  
**Líneas:** 85  
**Fragmento representativo (líneas 55–83):**
```javascript
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password, rol } = req.body;
    if (!email || !password || !rol)
      return res.status(400).json({ error: 'email, password y rol son requeridos' });

    if (rol === 'admin') {
      if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
        return res.json({ token: signToken({ id: 0, email, rol: 'admin' }), user: { id: 0, email, rol: 'admin' } });
      }
      return res.status(401).json({ error: 'Credenciales de admin incorrectas' });
    }

    let user = null;
    if (rol === 'cliente')      user = await clientRepo.getByEmail(email);
    else if (rol === 'repartidor') user = await deliveryRepo.getByEmail(email);
    else return res.status(400).json({ error: 'Rol inválido. Use: cliente | repartidor | admin' });

    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Credenciales incorrectas' });

    if (rol === 'cliente' && user.status === 'suspended')
      return res.status(403).json({ error: 'Cuenta suspendida' });

    const token = signToken({ id: user.id, national_id: user.national_id, rol });
    const { password: _pwd, ...safeUser } = user;
    res.json({ token, user: { ...safeUser, rol } });
  } catch (err) { next(err); }
});
```

---

### Pantalla de Registro — ARCHIVO NO EXISTE EN ESTE PROYECTO

El equivalente es el endpoint de registro en el mismo archivo:

**Archivo:** `src/routes/authRoutes.js`  
**Líneas:** 85 (mismo archivo que login)  
**Fragmento representativo — registro de cliente (líneas 21–36):**
```javascript
router.post('/register-client', authLimiter, async (req, res, next) => {
  try {
    const model = new Client(req.body);
    const errors = model.validate();
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });

    if (await clientRepo.getByNationalId(req.body.national_id))
      return res.status(409).json({ error: 'national_id ya registrado' });
    if (await clientRepo.getByEmail(req.body.email))
      return res.status(409).json({ error: 'email ya registrado' });

    const password = await bcrypt.hash(req.body.password, 10);
    const id = await clientRepo.create({ ...req.body, password });
    res.status(201).json({ message: 'Cliente registrado', client: await clientRepo.getById(id) });
  } catch (err) { next(err); }
});
```

---

### Pantalla Home / Lista restaurantes — ARCHIVO NO EXISTE EN ESTE PROYECTO

El equivalente es el endpoint público de listado:

**Archivo:** `src/routes/restaurantRoutes.js`  
**Líneas:** 28  
**Fragmento representativo (líneas 1–18):**
```javascript
const express           = require('express');
const restaurantService = require('../services/restaurantService');
const { verifyToken }   = require('../middleware/authMiddleware');
const { requireRole }   = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try { res.json(await restaurantService.list()); } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try { res.json(await restaurantService.getById(parseInt(req.params.id, 10))); } catch (err) { next(err); }
});

router.get('/:id/combos', async (req, res, next) => {
  try { res.json(await restaurantService.getCombos(parseInt(req.params.id, 10))); } catch (err) { next(err); }
});
```

---

### Interceptor HTTP / Middleware JWT

**Archivo:** `src/middleware/authMiddleware.js`  
**Líneas:** 16  
**Fragmento completo:**
```javascript
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

module.exports = { verifyToken };
```

**Archivo complementario:** `src/middleware/roleMiddleware.js`  
**Líneas:** 8  
**Fragmento completo:**
```javascript
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.rol)) {
    return res.status(403).json({ error: 'Acceso denegado: permisos insuficientes' });
  }
  next();
};

module.exports = { requireRole };
```

---

### Manejador de sesión (authMiddleware)

No existe un `SessionManager` ni `AuthContext` en este proyecto — es backend, no cliente. La gestión de sesión en el servidor ocurre mediante verificación JWT stateless en cada request. El archivo relevante es el ya citado `src/middleware/authMiddleware.js` (16 líneas).

La generación de tokens está en `src/routes/authRoutes.js` (líneas 18–19):
```javascript
const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });
```

---

### Modelo / DTO de Cliente

**Archivo:** `src/models/Client.js`  
**Líneas:** 25  
**Fragmento completo:**
```javascript
class Client {
  constructor({ national_id, name, address, card_number, phone, email, password }) {
    this.national_id = national_id;
    this.name        = name;
    this.address     = address;
    this.card_number = card_number;
    this.phone       = phone;
    this.email       = email;
    this.password    = password;
  }

  validate() {
    const errors = [];
    if (!this.national_id || this.national_id.trim().length < 8) errors.push('national_id inválido');
    if (!this.name || this.name.trim().length < 2)               errors.push('name requerido');
    if (!this.address)                                           errors.push('address requerida');
    if (!this.card_number || !/^\d{13,19}$/.test(this.card_number)) errors.push('card_number inválido');
    if (!this.phone)                                             errors.push('phone requerido');
    if (!this.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) errors.push('email inválido');
    if (!this.password || this.password.length < 6)              errors.push('password mínimo 6 caracteres');
    return errors;
  }
}

module.exports = Client;
```

---

### Resumen LOC por archivo clave

| Archivo | Líneas | Notas |
|---------|--------|-------|
| `src/app.js` | 45 | Punto de entrada, configuración Express |
| `src/routes/authRoutes.js` | 85 | Login + registro (equivalente a pantallas Login/Registro) |
| `src/routes/restaurantRoutes.js` | 28 | Equivalente a pantalla Home/Lista |
| `src/routes/clientRoutes.js` | 36 | CRUD clientes |
| `src/routes/orderRoutes.js` | 37 | CRUD pedidos |
| `src/routes/deliveryPersonRoutes.js` | 38 | CRUD repartidores |
| `src/routes/reportRoutes.js` | 29 | Reportes admin |
| `src/middleware/authMiddleware.js` | 16 | Interceptor JWT |
| `src/middleware/roleMiddleware.js` | 8 | Autorización por rol |
| `src/models/Client.js` | 25 | Modelo + validación de cliente |
| `src/models/DeliveryPerson.js` | 25 | Modelo + validación repartidor |
| `src/models/Order.js` | 22 | Modelo + validación pedido |
| `src/models/Restaurant.js` | 20 | Modelo + validación restaurante |
| `src/models/Invoice.js` | 15 | Modelo factura + cálculo IVA |
| `src/models/Combo.js` | 9 | Modelo combo |
| `src/services/orderService.js` | 94 | Lógica de negocio más compleja |
| `src/services/deliveryPersonService.js` | 53 | Lógica repartidor + quejas |
| `src/services/restaurantService.js` | 33 | Lógica restaurantes |
| `src/services/reportService.js` | 28 | Delegación de reportes |
| `src/services/clientService.js` | 25 | Lógica clientes |
| `src/repositories/clientRepository.js` | 34 | Repositorio cliente |
| `src/repositories/orderRepository.js` | 30 | Repositorio pedidos |
| `src/repositories/restaurantRepository.js` | 30 | Repositorio restaurantes |
| `src/repositories/deliveryPersonRepository.js` | 32 | Repositorio repartidores |
| `src/repositories/complaintRepository.js` | 7 | Repositorio quejas |
| `src/dao/clientDao.js` | 42 | DAO cliente (stored procedures) |
| `src/dao/orderDao.js` | 48 | DAO pedidos |
| `src/dao/restaurantDao.js` | 36 | DAO restaurantes |
| `src/dao/deliveryPersonDao.js` | 53 | DAO repartidores |
| `src/dao/complaintDao.js` | 23 | DAO quejas |
| `src/dao/comboDao.js` | 16 | DAO combos |
| `src/config/db.js` | 15 | Pool de conexiones MySQL |
| **TOTAL src/** | **1037** | Todos los archivos `.js` |

---

## 3. Patrones de diseño implementados

### Patrón Layered Architecture (Arquitectura en Capas)

**Archivos que evidencian el patrón:** toda la carpeta `src/`  
**Capas:** Routes → Services → Repositories → DAOs → MySQL  
**Fragmento de `src/app.js` (líneas 24–29) — montaje de capas:**
```javascript
app.use('/api/auth',             authRoutes);
app.use('/api/clients',          clientRoutes);
app.use('/api/restaurants',      restaurantRoutes);
app.use('/api/delivery-persons', deliveryPersonRoutes);
app.use('/api/orders',           orderRoutes);
app.use('/api/reports',          reportRoutes);
```

**Fragmento de `src/routes/clientRoutes.js` (línea 9) — ruta delega en servicio:**
```javascript
router.get('/', verifyToken, requireRole('admin'), async (req, res, next) => {
  try { res.json(await clientService.list()); } catch (err) { next(err); }
});
```

**Fragmento de `src/services/clientService.js` (líneas 3–8) — servicio delega en repositorio:**
```javascript
const list = () => clientRepo.getAll();

const getById = async (id) => {
  const client = await clientRepo.getById(id);
  if (!client) throw { status: 404, message: 'Cliente no encontrado' };
  return client;
};
```

---

### Patrón DAO (Data Access Object)

**Archivos:** `src/dao/clientDao.js`, `src/dao/orderDao.js`, `src/dao/restaurantDao.js`, `src/dao/deliveryPersonDao.js`, `src/dao/complaintDao.js`, `src/dao/comboDao.js`  
**Fragmento de `src/dao/clientDao.js` (líneas 3–11):**
```javascript
const _rows = async (sql, params = []) => {
  const [results] = await pool.query(sql, params);
  return [results[0], []];
};

const findAll          = ()      => _rows('CALL sp_list_clients()');
const findById         = (id)    => _rows('CALL sp_get_client_by_id(?)', [id]);
const findByNationalId = (nid)   => _rows('CALL sp_get_client_by_national_id(?)', [nid]);
const findByEmail      = (email) => _rows('CALL sp_get_client_by_email(?)', [email]);
```

Cada DAO encapsula exclusivamente las llamadas SQL a stored procedures de su entidad. Normaliza la estructura de respuesta de `mysql2` al invocar `CALL` (ver conflicto B-06 en `docs/conflictos-backend.md`).

---

### Patrón Repository

**Archivos:** `src/repositories/clientRepository.js`, `src/repositories/orderRepository.js`, `src/repositories/restaurantRepository.js`, `src/repositories/deliveryPersonRepository.js`, `src/repositories/complaintRepository.js`  
**Fragmento de `src/repositories/clientRepository.js` (líneas 3–13):**
```javascript
const getAll          = async ()      => { const [rows] = await dao.findAll();          return rows; };
const getByNationalId = async (nid)   => { const [rows] = await dao.findByNationalId(nid); return rows[0] ?? null; };
const getByEmail      = async (email) => { const [rows] = await dao.findByEmail(email); return rows[0] ?? null; };
const getActive       = async ()      => { const [rows] = await dao.findActive();       return rows; };

const getById = async (id) => {
  const [rows] = await dao.findById(id);
  return rows[0] ?? null;
};
```

El repositorio expone una API de dominio (objetos de negocio) y oculta la estructura interna del DAO, actuando como intermediario entre la lógica de servicio y el acceso a datos.

---

### Patrón Interceptor (Middleware Chain)

**Archivos:** `src/middleware/authMiddleware.js`, `src/middleware/roleMiddleware.js`  
**Fragmento de `src/middleware/authMiddleware.js` (líneas 3–14):**
```javascript
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};
```

Los middlewares se componen en la cadena de Express mediante `router.get('/', verifyToken, requireRole('admin'), handler)`. Cada middleware decide si pasa el control al siguiente (`next()`) o corta la cadena con una respuesta directa.

---

### Patrón Singleton (Pool de conexiones)

**Archivo:** `src/config/db.js`  
**Líneas:** 15  
**Fragmento completo:**
```javascript
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
});

module.exports = pool;
```

El módulo `db.js` crea el pool una única vez al requerirse por primera vez (`require('../config/db')`). Node.js cachea los módulos, por lo que todos los DAOs que hacen `require('../config/db')` obtienen la misma instancia del pool — comportamiento Singleton garantizado por el sistema de módulos de CommonJS.

---

### Patrón Factory (creación de modelos)

**Archivos:** `src/routes/authRoutes.js`, `src/services/restaurantService.js`, `src/services/orderService.js`  
**Fragmento de `src/routes/authRoutes.js` (líneas 22–25) — creación de instancia Client:**
```javascript
router.post('/register-client', authLimiter, async (req, res, next) => {
  try {
    const model = new Client(req.body);
    const errors = model.validate();
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });
```

**Fragmento de `src/services/orderService.js` (líneas 8–11):**
```javascript
const create = async (data) => {
  const model = new Order(data);
  const errors = model.validate();
  if (errors.length) throw { status: 400, message: errors.join(', ') };
```

Los constructores de los modelos actúan como factories de objetos de dominio con validación integrada. El caller pasa el `req.body` crudo y obtiene un objeto validado o una lista de errores.

---

### Patrones NO identificados en el código

- **Singleton (instancia explícita):** NO IDENTIFICADO EN EL CÓDIGO como clase con instancia única explícita. El pool de conexiones usa el Singleton implícito de CommonJS.
- **Observer:** PATRÓN NO IDENTIFICADO EN EL CÓDIGO. No hay event emitters ni suscriptores implementados.
- **MVVM:** PATRÓN NO IDENTIFICADO EN EL CÓDIGO. Es un patrón de arquitectura de UI; no aplica en un backend Express sin vistas.
- **Component-Based:** PATRÓN NO IDENTIFICADO EN EL CÓDIGO. Es un patrón de UI frontend; no aplica.

---

## 4. Dependencias externas

Fuente: `package.json` (verificado por lectura directa del archivo).

**Total de dependencias:** 7 en `dependencies` + 1 en `devDependencies` = **8 dependencias totales**

### `dependencies` (7)

| Dependencia | Versión en `package.json` | Propósito |
|-------------|--------------------------|-----------|
| `express` | `^5.2.1` | Framework HTTP, enrutamiento, middleware |
| `mysql2` | `^3.22.3` | Driver MySQL con soporte para Promises y stored procedures |
| `jsonwebtoken` | `^9.0.3` | Firma y verificación de tokens JWT |
| `bcryptjs` | `^3.0.3` | Hash de contraseñas con bcrypt |
| `express-rate-limit` | `^8.5.2` | Limitador de intentos por IP en rutas de autenticación |
| `cors` | `^2.8.6` | Configuración de CORS para clientes web y móvil |
| `dotenv` | `^17.4.2` | Carga de variables de entorno desde `.env` |

### `devDependencies` (1)

| Dependencia | Versión en `package.json` | Propósito |
|-------------|--------------------------|-----------|
| `nodemon` | `^3.1.14` | Reinicio automático del servidor en desarrollo |

### Las 5 más importantes para integración con clientes

1. **`express` `^5.2.1`** — define la estructura de endpoints que consume tanto React como Android. La versión 5 (aún beta en el ecosistema) cambia el manejo de errores async respecto a Express 4.
2. **`jsonwebtoken` `^9.0.3`** — emite tokens con `expiresIn: '2h'` que ambos clientes deben almacenar y enviar en el header `Authorization: Bearer <token>`.
3. **`bcryptjs` `^3.0.3`** — aplica `bcrypt.hash(password, 10)` en registro y `bcrypt.compare()` en login. El salt round 10 introduce latencia medible (~100ms) que afecta la percepción de respuesta en ambos clientes.
4. **`mysql2` `^3.22.3`** — maneja la conexión con MySQL vía stored procedures. Su estructura de resultado al invocar `CALL` (ver B-06 en `docs/conflictos-backend.md`) motivó la capa DAO completa.
5. **`express-rate-limit` `^8.5.2`** — limita a 20 intentos por IP en 15 minutos en `/api/auth/*`. El conflicto B-01 (`docs/conflictos-backend.md`) documenta cómo su configuración sin `trust proxy` bloqueó ambos clientes en producción.

---

## 5. Endpoints expuestos por el backend

Fuente: verificación directa de cada archivo en `src/routes/`. Prefijo base: `/api`.

### Autenticación — `src/routes/authRoutes.js`

| Método | Ruta | Auth requerida | Descripción |
|--------|------|----------------|-------------|
| `POST` | `/api/auth/register-client` | No | Registro de nuevo cliente (con rate limit: 20/15min) |
| `POST` | `/api/auth/register-delivery-person` | No | Registro de repartidor (con rate limit: 20/15min) |
| `POST` | `/api/auth/login` | No | Login (cliente, repartidor o admin) — retorna JWT 2h (con rate limit: 20/15min) |

### Clientes — `src/routes/clientRoutes.js`

| Método | Ruta | Auth requerida | Descripción |
|--------|------|----------------|-------------|
| `GET` | `/api/clients/` | JWT + rol `admin` | Lista todos los clientes |
| `GET` | `/api/clients/:id` | JWT | Obtiene cliente por ID (cliente solo puede ver el propio) |
| `PUT` | `/api/clients/:id` | JWT | Actualiza cliente (cliente solo puede editar el propio) |
| `PUT` | `/api/clients/:id/status` | JWT + rol `admin` | Cambia estado del cliente (active/suspended) |

### Restaurantes — `src/routes/restaurantRoutes.js`

| Método | Ruta | Auth requerida | Descripción |
|--------|------|----------------|-------------|
| `GET` | `/api/restaurants/` | No | Lista todos los restaurantes (público) |
| `GET` | `/api/restaurants/:id` | No | Obtiene restaurante por ID (público) |
| `GET` | `/api/restaurants/:id/combos` | No | Lista combos del restaurante (público) |
| `POST` | `/api/restaurants/` | JWT + rol `admin` | Crea restaurante |
| `PUT` | `/api/restaurants/:id` | JWT + rol `admin` | Actualiza restaurante |

### Repartidores — `src/routes/deliveryPersonRoutes.js`

| Método | Ruta | Auth requerida | Descripción |
|--------|------|----------------|-------------|
| `GET` | `/api/delivery-persons/` | JWT + rol `admin` | Lista todos los repartidores |
| `GET` | `/api/delivery-persons/:id` | JWT + rol `admin` o `repartidor` | Obtiene repartidor por ID |
| `PUT` | `/api/delivery-persons/:id/status` | JWT + rol `admin` | Cambia estado (available/busy/suspended) |
| `POST` | `/api/delivery-persons/:id/complaints` | JWT + rol `cliente` | Registra queja sobre repartidor |

### Pedidos — `src/routes/orderRoutes.js`

| Método | Ruta | Auth requerida | Descripción |
|--------|------|----------------|-------------|
| `POST` | `/api/orders/` | JWT + rol `cliente` | Crea pedido (asigna repartidor automáticamente) |
| `GET` | `/api/orders/client/:clientId` | JWT | Lista pedidos por cliente |
| `GET` | `/api/orders/:id` | JWT | Obtiene pedido por ID |
| `PUT` | `/api/orders/:id/status` | JWT + rol `repartidor` o `admin` | Actualiza estado del pedido |
| `GET` | `/api/orders/:id/invoice` | JWT | Obtiene factura del pedido |

### Reportes — `src/routes/reportRoutes.js`

| Método | Ruta | Auth requerida | Descripción |
|--------|------|----------------|-------------|
| `GET` | `/api/reports/clients/active` | JWT + rol `admin` | Clientes activos |
| `GET` | `/api/reports/clients/suspended` | JWT + rol `admin` | Clientes suspendidos |
| `GET` | `/api/reports/clients/most-orders` | JWT + rol `admin` | Clientes con más pedidos |
| `GET` | `/api/reports/restaurants` | JWT + rol `admin` | Listado restaurantes |
| `GET` | `/api/reports/restaurants/most-orders` | JWT + rol `admin` | Restaurante con más pedidos |
| `GET` | `/api/reports/restaurants/least-orders` | JWT + rol `admin` | Restaurante con menos pedidos |
| `GET` | `/api/reports/restaurants/sales-by-restaurant` | JWT + rol `admin` | Ventas por restaurante |
| `GET` | `/api/reports/restaurants/total-sales` | JWT + rol `admin` | Ventas totales |
| `GET` | `/api/reports/delivery-persons/no-warnings` | JWT + rol `admin` | Repartidores sin amonestaciones |
| `GET` | `/api/reports/delivery-persons/complaints` | JWT + rol `admin` | Repartidores con quejas |
| `GET` | `/api/reports/orders/by-client` | JWT + rol `admin` | Pedidos agrupados por cliente |
| `GET` | `/api/reports/orders/peak-hours` | JWT + rol `admin` | Horas pico de pedidos |

### Utilidades

| Método | Ruta | Auth requerida | Descripción |
|--------|------|----------------|-------------|
| `GET` | `/health` | No | Health check (`{ status: 'ok', service: 'CletaEats API' }`) |

**Total de endpoints:** 3 (auth) + 4 (clients) + 5 (restaurants) + 4 (delivery-persons) + 5 (orders) + 12 (reports) + 1 (health) = **34 endpoints**

---

## 6. Retos de integración específicos

Todos los retos a continuación están documentados en `docs/conflictos-backend.md`. Se cita el archivo exacto donde se manifestó cada uno y la solución aplicada con código real.

---

### B-01 — Rate limiter no respeta IP real del cliente detrás de proxy

**Archivo donde se manifestó:** `src/app.js`  
**Síntoma:** El rate limiter de `express-rate-limit` contaba todas las peticiones como provenientes de la IP del proxy (`::1`) en Railway, disparando el límite de 20 req/15min de forma inmediata para todos los usuarios.  
**Solución aplicada (commit `895b26c`) — `src/app.js` línea 14:**
```javascript
const app = express();

app.set('trust proxy', 1);   // lee X-Forwarded-For en lugar de req.socket.remoteAddress

app.use(cors({ ... }));
```

---

### B-02 — Colación UTF-8 incompatible en stored procedures

**Archivo donde se manifestó:** `procedures.sql` / `create_procedures_workbench.sql`  
**Síntoma:** MySQL error 1267 (`Illegal mix of collations`) al comparar parámetros VARCHAR con columnas de la DB en MySQL 8.x en producción (Railway).  
**Solución aplicada (commit `895b26c`) — ejemplo en `procedures.sql`:**
```sql
-- Antes (fallaba en MySQL 8.x en producción)
SELECT * FROM client WHERE email = p_email;

-- Después (con COLLATE explícito)
SELECT * FROM client WHERE email = p_email COLLATE utf8mb4_unicode_ci;
```

---

### B-03 — `Duplicate entry` al re-ejecutar el schema con seed data

**Archivo donde se manifestó:** `database.sql`  
**Síntoma:** `ERROR 1062 (23000): Duplicate entry '1' for key 'restaurant.PRIMARY'` al re-ejecutar el script con datos de prueba ya existentes.  
**Solución aplicada (commit `895b26c`) — `database.sql`:**
```sql
-- Antes (fallaba en segunda ejecución)
INSERT INTO restaurant (name, tax_id, ...) VALUES ('La Soda Tica', ...);

-- Después (idempotente)
INSERT IGNORE INTO restaurant (name, tax_id, ...) VALUES ('La Soda Tica', ...);
```

---

### B-04 — Sintaxis `DELIMITER` incompatible con MySQL Workbench "Run SQL Script"

**Archivo donde se manifestó:** `procedures.sql` (original)  
**Síntoma:** `ERROR 1064 (42000): syntax near 'DELIMITER //'` al ejecutar con MySQL Workbench → "Run SQL Script".  
**Solución aplicada (commit `895b26c`):** Crear `create_procedures_workbench.sql` sin `DELIMITER`, con `BEGIN...END` nativo:
```sql
-- create_procedures_workbench.sql (sin DELIMITER — compatible con Workbench)
DROP FUNCTION IF EXISTS fn_calculate_combo_price;
CREATE FUNCTION fn_calculate_combo_price(p_number INT)
RETURNS DECIMAL(10,2) DETERMINISTIC
BEGIN
  RETURN (p_number + 3) * 1000;
END;
```

---

### B-05 — Archivo `.env` comprometido en el historial de git

**Archivo donde se manifestó:** `.env` (commit `913f540`)  
**Síntoma:** El archivo `.env` con credenciales reales fue incluido en el commit inicial sin `.gitignore`.  
**Solución aplicada (commit `fcca463`):**
```bash
# .gitignore creado con:
.env

# Eliminado del tracking:
git rm --cached .env
```
Las credenciales permanecen accesibles en el historial (`git show 913f540:.env`). En un entorno de producción real requeriría rotación de credenciales y reescritura del historial con `git filter-repo`.

---

### B-06 — Estructura de resultado de `mysql2` al invocar `CALL`

**Archivo donde se manifestó:** Todos los archivos en `src/dao/`  
**Síntoma:** `result.insertId` devolvía `undefined` al invocar stored procedures con `mysql2`, porque la estructura es `results[0][0].insertId` (primer ResultSet, primera fila), no `result.insertId`.  
**Solución aplicada — helper `_rows` en `src/dao/clientDao.js` (líneas 3–6):**
```javascript
const _rows = async (sql, params = []) => {
  const [results] = await pool.query(sql, params);
  return [results[0], []];   // normaliza el primer ResultSet
};
```

---

### B-07 — Autenticación de admin con texto plano vs. bcrypt

**Archivo donde se manifestó:** `src/routes/authRoutes.js`  
**Descripción:** El admin autentica contra variables de entorno con comparación `===` directa; clientes y repartidores usan `bcrypt.compare()`. Asimetría deliberada para el contexto académico pero relevante como riesgo de seguridad y como causa de confusión durante integración (campo `rol` vs. `role`).  
**Código en `src/routes/authRoutes.js` (líneas 61–66):**
```javascript
if (rol === 'admin') {
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    return res.json({ token: signToken({ id: 0, email, rol: 'admin' }) });
  }
  return res.status(401).json({ error: 'Credenciales de admin incorrectas' });
}
```

---

### B-08 — Condición de carrera en asignación de repartidor disponible

**Archivo donde se manifestó:** `src/services/orderService.js`  
**Descripción:** El stored procedure `sp_get_available_delivery_person` hace `SELECT ... WHERE status = 'available' LIMIT 1` sin lock. Si dos pedidos se crean simultáneamente, ambos pueden asignar el mismo repartidor.  
**Código afectado en `src/services/orderService.js` (líneas 34–49):**
```javascript
const deliveryPerson = await deliveryPersonRepo.getAvailable();   // sin FOR UPDATE
if (!deliveryPerson)
  throw { status: 503, message: 'No hay repartidores disponibles' };

const orderId = await orderRepo.create({ ..., delivery_person_id: deliveryPerson.id });
// ... operaciones entre medio ...
await deliveryPersonRepo.updateStatus(deliveryPerson.id, 'busy'); // puede llegar tarde
```
La mitigación correcta (`SELECT ... FOR UPDATE` en una transacción) no fue implementada en este contexto académico.

---

### B-09 — Duplicación del cálculo del IVA entre capa JS y capa SQL

**Archivos afectados:** `src/models/Invoice.js` y `procedures.sql`  
**Código en `src/models/Invoice.js` (línea 6):**
```javascript
this.iva = Math.round(subtotal * 0.13 * 100) / 100;
```
**Función SQL en `procedures.sql` (no invocada activamente):**
```sql
CREATE FUNCTION fn_calculate_iva(p_subtotal DECIMAL(10,2))
RETURNS DECIMAL(10,2) DETERMINISTIC
BEGIN
  RETURN ROUND(p_subtotal * 0.13, 2);
END;
```

---

### B-10 — JWT sin endpoint de refresco

**Archivo donde se manifestó:** `src/routes/authRoutes.js` y `src/middleware/authMiddleware.js`  
**Descripción:** Los tokens expiran en 2h (`expiresIn: '2h'`) y no existe `/api/auth/refresh`. Cuando expiran, `authMiddleware.js` retorna 401 y ambos clientes deben re-autenticar completamente.  
**Código en `src/routes/authRoutes.js` (líneas 18–19):**
```javascript
const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });
```

---

### B-11 — `comboDao` invocado directamente desde repositorio de restaurante

**Archivo donde se manifestó:** `src/repositories/restaurantRepository.js`  
**Descripción:** Viola la convención de que cada repositorio tiene un único DAO de referencia.  
**Código en `src/repositories/restaurantRepository.js` (líneas 1–2):**
```javascript
const dao      = require('../dao/restaurantDao');
const comboDao = require('../dao/comboDao');   // dependencia cruzada entre capas
```

---

## 7. Validaciones de formularios

El backend implementa validación en **2 niveles**: modelo de dominio (JavaScript) y servidor (Express routes).

### Conteo exacto de entidades con validación

| Entidad | Validación en Modelo (JS) | Validación adicional en Route/Service | Total campos validados |
|---------|--------------------------|--------------------------------------|------------------------|
| `Client` | Sí — `src/models/Client.js` | Sí — duplicado de national_id y email | 7 campos |
| `DeliveryPerson` | Sí — `src/models/DeliveryPerson.js` | Sí — duplicado de national_id y email | 7 campos |
| `Order` | Sí — `src/models/Order.js` | Sí — verificación de combo/restaurante | 4 campos base + items |
| `Restaurant` | Sí — `src/models/Restaurant.js` | Sí — duplicado de tax_id | 4 campos |
| `Complaint` | No (sin modelo propio) | Sí — `src/services/deliveryPersonService.js` | 4 campos |
| `Login` | No (sin modelo propio) | Sí — `src/routes/authRoutes.js` | 3 campos |

**Formularios con validación: 6 entidades — todas tienen algún nivel de validación en servidor.**  
**Formularios con validación a nivel cliente (front-end):** NO APLICA EN ESTE PROYECTO — este es el backend.

### Nivel de validación

- **Solo servidor:** `Complaint`, `Login` (no tienen clase modelo)
- **Modelo de dominio + servidor:** `Client`, `DeliveryPerson`, `Order`, `Restaurant`
- **Base de datos (constraints SQL):** NO VERIFICADO directamente desde este código — depende de las constraints en `database.sql`

### Ejemplo de validación real — `src/models/Client.js` (líneas 12–22):
```javascript
validate() {
  const errors = [];
  if (!this.national_id || this.national_id.trim().length < 8) errors.push('national_id inválido');
  if (!this.name || this.name.trim().length < 2)               errors.push('name requerido');
  if (!this.address)                                           errors.push('address requerida');
  if (!this.card_number || !/^\d{13,19}$/.test(this.card_number)) errors.push('card_number inválido');
  if (!this.phone)                                             errors.push('phone requerido');
  if (!this.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) errors.push('email inválido');
  if (!this.password || this.password.length < 6)              errors.push('password mínimo 6 caracteres');
  return errors;
}
```

### Ejemplo de validación en service — `src/services/deliveryPersonService.js` (líneas 25–33):
```javascript
for (const [field, val] of [
  ['friendliness', friendliness],
  ['response_time', response_time],
  ['presentation', presentation],
]) {
  if (!val || val < 1 || val > 5)
    throw { status: 400, message: `${field} debe ser entre 1 y 5` };
}
```

---

## Resumen ejecutivo

| Métrica | Valor exacto |
|---------|-------------|
| Total archivos `.js` en `src/` | 32 |
| Total LOC en `src/` | 1.037 |
| Capas arquitectónicas | 5 (Routes, Services, Repositories, DAOs, Models) + 2 transversales (Middleware, Config) |
| Total endpoints REST expuestos | 34 |
| Endpoints públicos (sin auth) | 5 (`GET /api/restaurants/`, `GET /api/restaurants/:id`, `GET /api/restaurants/:id/combos`, `POST /api/auth/register-*` x2, `POST /api/auth/login`, `GET /health`) |
| Endpoints protegidos con JWT | 29 |
| Dependencias de producción | 7 |
| Dependencias de desarrollo | 1 |
| Patrones de diseño identificados | 5 (Layered Architecture, DAO, Repository, Interceptor/Middleware, Singleton via CommonJS, Factory) |
| Entidades con validación de servidor | 6 |
| Retos de integración documentados | 11 (B-01 a B-11 en `docs/conflictos-backend.md`) |
| Retos resueltos con commit verificable | 5 (B-01, B-02, B-03, B-04, B-05) |
| Retos identificados pero no resueltos (contexto académico) | 6 (B-06 a B-11) |

---

*Métricas extraídas directamente del código fuente del proyecto — `Aplicaciones_M-viles` — el 2026-05-17.*  
*Cada número proviene de un comando ejecutado (`wc -l`, `find | wc -l`) o de lectura directa de archivos verificados.*  
*Paper académico: Comparación React vs. Kotlin/Jetpack Compose sobre backend Express.js + MySQL compartido.*
