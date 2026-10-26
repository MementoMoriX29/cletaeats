# Conflictos y Errores — CletaEats Backend (Express.js + MySQL)

Documentación técnica de los conflictos encontrados durante el desarrollo del backend de CletaEats. Utilizada como evidencia en el paper académico que compara la complejidad de implementación entre React (web) y Kotlin/Jetpack Compose (Android) sobre un backend compartido Express.js + MySQL.

---

## Índice de conflictos

| # | Nombre | Categoría | Commit de fix | RQ |
|---|--------|-----------|---------------|-----|
| B-01 | Rate limiter no respeta IP real del cliente detrás de proxy | Configuración Express | `895b26c` | RQ-2 |
| B-02 | Colación UTF-8 incompatible en stored procedures | Base de datos / MySQL | `895b26c` | RQ-2 |
| B-03 | `Duplicate entry` en seed data al re-ejecutar el schema | Base de datos / Idempotencia | `895b26c` | RQ-1 |
| B-04 | Sintaxis `DELIMITER` incompatible con MySQL Workbench | Tooling / Entorno | `895b26c` | RQ-1 |
| B-05 | Archivo `.env` con credenciales comprometido en git | Seguridad / DevOps | `fcca463` | RQ-1 |
| B-06 | Estructura de resultado de `mysql2` al invocar `CALL` | Integración Node.js–MySQL | — | RQ-2 |
| B-07 | Autenticación de admin con texto plano vs. bcrypt en DB | Diseño de autenticación | — | RQ-2 |
| B-08 | Condición de carrera en asignación de repartidor disponible | Concurrencia / Base de datos | — | RQ-2 |
| B-09 | Duplicación del cálculo del IVA entre capa JS y capa SQL | Arquitectura / Mantenibilidad | — | RQ-1 |
| B-10 | JWT sin endpoint de refresco: sesión expira silenciosamente | Integración con clientes | — | RQ-2 |
| B-11 | `comboDao` invocado directamente desde el repositorio de restaurante | Arquitectura en capas | — | RQ-1 |

---

## B-01 — Rate limiter no respeta IP real del cliente detrás de proxy

### Error / Síntoma
```
Error: Too many requests, please try again later.
(status 429 en todos los clientes, incluso con pocas peticiones)
```
Localmente la API funcionaba sin problema. Al desplegar en Railway (detrás de un reverse proxy), el rate limiter de `express-rate-limit` contaba todas las peticiones como provenientes de la misma IP — la IP interna del proxy — y disparaba el límite de 20 peticiones por ventana de 15 minutos de forma inmediata.

### Causa
`express-rate-limit` usa `req.ip` para identificar clientes. En un entorno con proxy inverso, Express resuelve `req.ip` como `::1` o la IP del proxy en lugar de la IP del cliente real contenida en el header `X-Forwarded-For`, a menos que se configure explícitamente `trust proxy`.

### Intento fallido
- Aumentar el `max` a 100 → resuelve el síntoma pero no la causa. Todos los usuarios seguían compartiendo el mismo contador.

### Solución final
Agregar `app.set('trust proxy', 1)` **antes** de montar cualquier middleware en `src/app.js`:

```javascript
// src/app.js — commit 895b26c
const app = express();

app.set('trust proxy', 1);   // ← añadido

app.use(cors({ ... }));
```

Con esta configuración, Express lee `X-Forwarded-For` y expone la IP real del cliente en `req.ip`, permitiendo que `express-rate-limit` cuente por cliente y no por proxy.

### Relevancia para el paper — RQ-2
Ilustra cómo la configuración del backend afecta directamente a ambos clientes (Android y React). La ausencia de `trust proxy` bloqueaba todas las operaciones de login de ambas aplicaciones en producción. En un backend móvil puro (sin web frontend), el mismo error habría afectado exclusivamente a la app Android, pero al compartir backend entre clientes multiplatforma el impacto es doble y la prioridad de fix es mayor.

---

## B-02 — Colación UTF-8 incompatible en stored procedures

### Error message (MySQL)
```
ERROR 1267 (HY000): Illegal mix of collations
(utf8mb4_0900_ai_ci, IMPLICIT) and
(utf8mb4_unicode_ci, IMPLICIT) for operation '='
```

### Causa
La base de datos fue creada con `COLLATE utf8mb4_unicode_ci`:

```sql
CREATE DATABASE IF NOT EXISTS cletaeats
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Sin embargo, cuando MySQL Workbench ejecuta `CREATE PROCEDURE`, la sesión del servidor hereda la colación por defecto del servidor (`utf8mb4_0900_ai_ci` en MySQL 8.x). Al comparar un parámetro `VARCHAR` con una columna cuya colación es `utf8mb4_unicode_ci`, MySQL detecta un conflicto de colaciones y lanza el error 1267.

Los procedimientos afectados eran los que hacían búsquedas por campos de texto:
- `sp_get_client_by_national_id`
- `sp_get_client_by_email`
- `sp_get_restaurant_by_tax_id`
- `sp_get_delivery_person_by_national_id`
- `sp_get_delivery_person_by_email`

### Intento fallido
- Ejecutar los procedimientos sin COLLATE → funcionaban en entorno local (MySQL 5.7) pero fallaban en producción (MySQL 8.x en Railway).

### Solución final
Agregar `COLLATE utf8mb4_unicode_ci` explícito en cada cláusula `WHERE` de los procedimientos afectados:

```sql
-- Antes (procedures.sql inicial)
SELECT * FROM client WHERE email = p_email;

-- Después (commit 895b26c)
SELECT * FROM client WHERE email = p_email COLLATE utf8mb4_unicode_ci;
```

Se creó adicionalmente `create_procedures_workbench.sql` (sin `DELIMITER`) para facilitar la ejecución desde Workbench (ver B-04).

### Relevancia para el paper — RQ-2
El error solo se manifestaba en producción, no en desarrollo local, aumentando el ciclo de debugging. En el cliente Android (Kotlin), el mapeo JSON→data class no interactúa con la colación; el error se habría manifestado igualmente. Sin embargo, la depuración fue más difícil desde el cliente web porque el Network tab solo muestra un error 500 genérico, mientras que el log del servidor en Railway mostró el código SQL exacto.

---

## B-03 — `Duplicate entry` al re-ejecutar el schema con datos semilla

### Error message (MySQL)
```
ERROR 1062 (23000): Duplicate entry '1' for key 'restaurant.PRIMARY'
ERROR 1062 (23000): Duplicate entry '1-1' for key 'combo.PRIMARY'
```

### Causa
El archivo `database.sql` incluía tanto el DDL (schema) como los `INSERT` de datos de prueba en el mismo script. Usar `CREATE TABLE IF NOT EXISTS` hace el DDL idempotente, pero los `INSERT INTO` normales fallan si los registros ya existen.

```sql
-- Antes — fallaba en segunda ejecución
INSERT INTO restaurant (name, tax_id, ...) VALUES
('La Soda Tica', '3-101-100001', ...),
...
```

Esto afectaba a 10 bloques `INSERT` (8 restaurantes + 2 bloques de combos iniciales).

### Solución final
Cambiar `INSERT INTO` por `INSERT IGNORE INTO` en todos los bloques de seed data (commit 895b26c):

```sql
-- Después — idempotente
INSERT IGNORE INTO restaurant (name, tax_id, ...) VALUES
('La Soda Tica', '3-101-100001', ...),
...
```

### Relevancia para el paper — RQ-1
La gestión de migraciones en Node.js/Express requiere disciplina manual: no existe un equivalente a `Room Migrations` de Android que versione el schema automáticamente. La idempotencia del script de seed debe garantizarse a mano. En Android con Room, `fallbackToDestructiveMigration()` o estrategias de migración explícitas evitan este tipo de error.

---

## B-04 — Sintaxis `DELIMITER` incompatible con MySQL Workbench "Run SQL Script"

### Error message (MySQL Workbench)
```
ERROR 1064 (42000): You have an error in your SQL syntax;
check the manual that corresponds to your MySQL server version
for the right syntax to use near 'DELIMITER //' at line 1
```

### Causa
MySQL Workbench tiene dos modos de ejecución de SQL:

| Modo | `DELIMITER` | Cuándo usar |
|------|-------------|-------------|
| Editor SQL (Ctrl+Enter) | Soportado | Scripts cortos |
| "Run SQL Script" (Ctrl+Shift+Enter / File → Open SQL Script) | **No soportado** | Scripts grandes |

El archivo `database.sql` usaba `DELIMITER //` para definir funciones y stored procedures, que es la sintaxis correcta para el cliente de línea de comandos `mysql`. Sin embargo, "Run SQL Script" de Workbench parsea `BEGIN...END` de forma nativa y no entiende el cambio de delimitador, produciendo errores de sintaxis en cada bloque.

### Intento fallido
- Ejecutar el script completo con copy-paste en el editor SQL → fallaba por el tamaño (>700 líneas) y comportamiento errático con `DELIMITER`.
- Ejecutar línea a línea → tedioso y propenso a errores de orden (las funciones deben crearse antes que los procedimientos que las llaman).

### Solución final
Crear dos versiones del script de procedimientos:

1. **`database.sql`** — conserva `DELIMITER //` para uso con el CLI de MySQL (`mysql -u root -p < database.sql`).
2. **`create_procedures_workbench.sql`** (nuevo en commit 895b26c) — mismo contenido sin `DELIMITER`, para usar con Workbench via "Run SQL Script":

```sql
-- create_procedures_workbench.sql (sin DELIMITER)
-- Compatible con MySQL Workbench "Run SQL Script"
-- Usage: File → Open SQL Script → Ctrl+Shift+Enter

DROP FUNCTION IF EXISTS fn_calculate_combo_price;
CREATE FUNCTION fn_calculate_combo_price(p_number INT)
RETURNS DECIMAL(10,2) DETERMINISTIC
BEGIN
  RETURN (p_number + 3) * 1000;
END;
```

### Relevancia para el paper — RQ-1
En Android, la base de datos Room se define en Kotlin con annotations (`@Entity`, `@Dao`, `@Database`) y el compilador genera el SQL automáticamente. No existe un problema equivalente de compatibilidad entre herramientas SQL porque el desarrollador no escribe SQL de DDL directamente. La necesidad de mantener dos versiones del mismo script SQL es una complejidad sin equivalente en el ecosistema Android.

---

## B-05 — Archivo `.env` con credenciales comprometido en git

### Síntoma
```
git log --all --oneline
913f540 Backend CletaEats - estructura inicial   ← .env incluido aquí
fcca463 Add .gitignore and remove .env from tracking
```

### Causa
En el commit inicial (`913f540`), el archivo `.env` fue incluido en el repositorio sin que existiera un `.gitignore` previo. El `.env` contenía:

```env
DB_PASSWORD=290410
JWT_SECRET=cletaEats$2026#jwt!secretKey@heredia
ADMIN_EMAIL=admin@cletaeats.com
ADMIN_PASSWORD=AdminSecure123
```

El error fue reconocido posteriormente (commit `fcca463`): se creó `.gitignore` y se eliminó `.env` del tracking con `git rm --cached .env`.

### Impacto de seguridad
Aunque el archivo fue removido del árbol de trabajo, las credenciales permanecen accesibles en el historial de git:
```bash
git show 913f540:.env   # muestra las credenciales
```
En un repositorio público, esto constituiría una brecha de seguridad irreversible sin rotar las credenciales y reescribir la historia con `git filter-repo`.

### Solución adoptada
1. Crear `.gitignore` con `.env` incluido.
2. Ejecutar `git rm --cached .env` para dejar de rastrear el archivo.
3. Commit `fcca463` formaliza el fix.
4. Mantener `.env.example` como referencia de estructura sin valores reales.

### Solución correcta (no aplicada por ser entorno académico)
Rotar todas las credenciales comprometidas y reescribir el historial:
```bash
git filter-repo --path .env --invert-paths
```

### Relevancia para el paper — RQ-1
En proyectos Android, las credenciales suelen almacenarse en `local.properties` (ignorado por defecto por Android Studio) o en `BuildConfig` fields, que el IDE configura para no ser rastreados. El scaffolding de Express/Node.js no protege por defecto el `.env`, requiriendo que el desarrollador configure `.gitignore` manualmente desde el inicio.

---

## B-06 — Estructura de resultado de `mysql2` al invocar `CALL`

### Síntoma
```javascript
// Sin el DAO layer: acceso incorrecto
const [result] = await pool.query('CALL sp_create_client(...)', [...]);
console.log(result.insertId);   // undefined — result es un array de arrays
```

### Causa
Al ejecutar un `CALL sp_...` con `mysql2`, el resultado tiene una estructura diferente a un `INSERT` o `SELECT` directo:

```javascript
// Estructura real de mysql2 al llamar un CALL:
[
  [ ResultSet ],        // results[0]: array de filas del primer SELECT dentro del SP
  [ FieldPacket ]       // results[1]: metadatos de columnas
]

// Para SPs que retornan: SELECT insertId AS insertId
results[0][0].insertId   // primer resultado, primera fila, campo insertId
```

Esto contrasta con un `INSERT` directo donde `result.insertId` está disponible directamente:
```javascript
const [result] = await pool.query('INSERT INTO client ...', [...]);
result.insertId;   // funciona directamente
```

### Solución final
Implementar una capa DAO (`src/dao/`) con una función helper `_rows` que normaliza la extracción:

```javascript
// src/dao/clientDao.js
const _rows = async (sql, params = []) => {
  const [results] = await pool.query(sql, params);
  return [results[0], []];   // siempre retorna el primer ResultSet normalizado
};

const insert = async (data) => {
  const [results] = await pool.query('CALL sp_create_client(...)', [...]);
  // results[0][0].insertId — primer ResultSet, primera fila
  return [{ insertId: results[0][0].insertId, affectedRows: 1 }, []];
};
```

Esta abstracción permite que la capa Repository (`src/repositories/`) consuma datos con la misma API que si fueran `INSERT` directos.

### Relevancia para el paper — RQ-1 / RQ-2
En Android con Room, los DAO son interfaces con anotaciones (`@Insert`, `@Query`) y el compilador genera el código de acceso. El desarrollador nunca lidia con la estructura interna de los resultados. En Node.js/mysql2, la diferencia entre invocar un `INSERT` directo y un `CALL` de stored procedure requiere manejo explícito, motivando una capa DAO adicional que no habría sido necesaria con SQL directo.

---

## B-07 — Autenticación del administrador con texto plano vs. bcrypt para otros roles

### Descripción
El backend implementa tres roles: `cliente`, `repartidor` y `admin`. Los dos primeros verifican la contraseña mediante `bcrypt.compare()` contra el hash almacenado en la base de datos. El admin autentica directamente contra variables de entorno sin hashing:

```javascript
// src/routes/authRoutes.js — autenticación admin
if (rol === 'admin') {
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    return res.json({ token: signToken({ id: 0, email, rol: 'admin' }) });
  }
  return res.status(401).json({ error: 'Credenciales de admin incorrectas' });
}

// Para cliente/repartidor — comparación bcrypt correcta
if (!user || !(await bcrypt.compare(password, user.password)))
  return res.status(401).json({ error: 'Credenciales incorrectas' });
```

### Problema detectado durante integración
El cliente web recibió un error 400 (`email, password y rol son requeridos`) porque el campo enviado era `role` en lugar de `rol`. Al corregir el campo, el 400 cambió a 401, lo que reveló que las credenciales en `.env` no coincidían con las usadas en el cliente. Ver también conflicto C-09 en `conflictos-web.md`.

### Implicaciones de diseño
| Aspecto | Admin | Cliente / Repartidor |
|---------|-------|---------------------|
| Almacenamiento | Variable de entorno (texto plano) | DB con hash bcrypt |
| Verificación | `===` string directo | `bcrypt.compare()` |
| Rotación de credencial | Requiere redespliegue | UPDATE en DB |
| Número de cuentas | 1 fija | N dinámico |

La asimetría es una simplificación deliberada para el contexto académico, pero introduce un riesgo de seguridad real en producción.

### Relevancia para el paper — RQ-2
Ambos clientes (Android y React) tuvieron que identificar el campo correcto del body (`rol` vs `role`) sin contrato OpenAPI. La inconsistencia de diseño en el backend amplificó el error de integración en ambos clientes, evidenciando que en arquitecturas multiplatforma la calidad del contrato del backend impacta directamente en el costo de integración de cada cliente.

---

## B-08 — Condición de carrera en asignación de repartidor disponible

### Descripción
El flujo de creación de una orden en `src/services/orderService.js` sigue estos pasos:

```javascript
// Paso 1: obtener repartidor disponible
const deliveryPerson = await deliveryPersonRepo.getAvailable();
if (!deliveryPerson)
  throw { status: 503, message: 'No hay repartidores disponibles' };

// Paso 2: crear la orden (varios await entre medio)
const orderId = await orderRepo.create({ ..., delivery_person_id: deliveryPerson.id });

// Paso 3: marcar repartidor como ocupado
await deliveryPersonRepo.updateStatus(deliveryPerson.id, 'busy');
```

El stored procedure `sp_get_available_delivery_person` hace `SELECT ... WHERE status = 'available' LIMIT 1` sin adquirir un lock sobre la fila.

### Condición de carrera
Si dos peticiones de orden llegan simultáneamente:
1. Request A → lee repartidor #3 (status: `available`)
2. Request B → lee repartidor #3 (status: `available`, el update del paso 3 de A aún no ocurrió)
3. Request A → crea orden, marca #3 como `busy`
4. Request B → crea orden con el mismo repartidor #3, que ahora ya está `busy`

Resultado: el repartidor #3 tiene dos órdenes activas simultáneas.

### Mitigación correcta (no implementada — contexto académico)
Usar una transacción con `SELECT ... FOR UPDATE`:

```sql
START TRANSACTION;
SELECT id FROM delivery_person
  WHERE status = 'available' AND warnings_count < 4
  ORDER BY id ASC LIMIT 1 FOR UPDATE;
-- ... crear orden ...
UPDATE delivery_person SET status = 'busy' WHERE id = @selected_id;
COMMIT;
```

### Relevancia para el paper — RQ-2
En Android, las Coroutines de Kotlin facilitan la ejecución secuencial de operaciones async, pero no resuelven condiciones de carrera que ocurren en el servidor. La diferencia es que en una app de delivery real, múltiples clientes (Android y web) pueden crear órdenes concurrentemente sobre el mismo backend, haciendo que la corrección de la condición de carrera sea crítica. Un backend compartido amplifica el impacto de cualquier bug de concurrencia.

---

## B-09 — Duplicación del cálculo del IVA entre capa JS y capa SQL

### Descripción
El IVA (13%) se calcula en dos lugares distintos del stack:

**Capa JavaScript (`src/models/Invoice.js`):**
```javascript
this.iva = Math.round(subtotal * 0.13 * 100) / 100;
this.total = subtotal + transport_cost + this.iva;
```

**Capa SQL (`procedures.sql`):**
```sql
CREATE FUNCTION fn_calculate_iva(p_subtotal DECIMAL(10,2))
RETURNS DECIMAL(10,2) DETERMINISTIC
BEGIN
  RETURN ROUND(p_subtotal * 0.13, 2);
END;
```

El flujo real usa la versión JavaScript: `Invoice.js` calcula `iva` y `total`, y los pasa como parámetros a `sp_create_invoice`. La función SQL `fn_calculate_iva` existe en la DB pero **no se invoca desde ningún stored procedure activo**.

### Riesgo de mantenibilidad
Si la tasa de IVA cambia de 13% a, por ejemplo, 15%:
- Hay que actualizar `Invoice.js` (línea 6)
- Hay que actualizar `fn_calculate_iva` en la DB
- Hay que actualizar la constante en `fn_calculate_total`

Si se actualiza en un lugar y no en el otro, los reportes generados desde SQL (que podrían usar `fn_calculate_iva` en consultas futuras) diferirían de los cálculos de la API.

### Relevancia para el paper — RQ-1
Este tipo de duplicación es más difícil de detectar en Node.js + MySQL que en Android con Room, porque en Room toda la lógica de negocio vive en el ViewModel de Kotlin y el SQL de Room solo describe queries, no lógica. La separación de capas en Express no impide que lógica de negocio migre hacia los stored procedures y se duplique.

---

## B-10 — JWT sin endpoint de refresco: sesión expira silenciosamente

### Descripción
Los tokens JWT se firman con expiración de 2 horas:

```javascript
// src/routes/authRoutes.js
const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });
```

No existe ningún endpoint `/api/auth/refresh` ni mecanismo de renovación. Cuando el token expira, el middleware `verifyToken` retorna:

```javascript
// src/middleware/authMiddleware.js
} catch {
  return res.status(401).json({ error: 'Token inválido o expirado' });
}
```

### Síntoma en clientes
- **Android**: el `AuthInterceptor` de OkHttp captura el 401 y llama a `sessionManager.clearSession()`, redirigiendo al login. El usuario ve el flujo.
- **React**: el interceptor de Axios hace `localStorage.clear()` y `window.location.href = '/login'`, causando una recarga completa de la página. El usuario pierde el estado de la UI sin advertencia previa.

En ninguno de los dos clientes el usuario recibe una notificación de "tu sesión está por expirar" ni puede renovar sin re-autenticarse.

### Relevancia para el paper — RQ-2
El impacto de la expiración del token es diferente entre clientes: Android mantiene el stack de navegación y redirige sin recargar; React hace una recarga completa (`window.location.href`) que destruye el estado de la aplicación. Esto evidencia que un mismo comportamiento del backend (expiración de JWT) tiene consecuencias de UX distintas dependiendo de la plataforma cliente.

---

## B-11 — `comboDao` invocado directamente desde el repositorio de restaurante

### Descripción
La arquitectura sigue el patrón: **Route → Service → Repository → DAO → DB**.

Sin embargo, `restaurantRepository.js` importa **dos DAOs distintos** directamente:

```javascript
// src/repositories/restaurantRepository.js
const dao      = require('../dao/restaurantDao');
const comboDao = require('../dao/comboDao');   // ← acceso directo, rompe la capa
```

`restaurantDao.js` no expone métodos de combo. La responsabilidad de combos quedó dividida entre `restaurantDao` (no tiene métodos de combo) y `comboDao` (accedido directamente desde el repositorio), violando el principio de que cada repositorio tiene un único DAO de referencia.

### Causa
Durante el desarrollo se optó por rapidez: `comboDao` se creó por separado y se importó directamente en el repositorio en lugar de agregar los métodos a `restaurantDao`.

### Impacto
- El `restaurantDao` no encapsula toda la responsabilidad de acceso a datos de restaurantes.
- Si se quiere cambiar la fuente de datos de combos (e.g., de stored procedures a queries directas), hay que modificar el repositorio además del DAO.

### Relevancia para el paper — RQ-1
En Android con Room, cada entidad (`@Entity`) tiene su propio `@Dao` y estos se componen en el `@Database`. El compilador impone que los DAOs estén declarados en el `@Database`, lo que da trazabilidad. En Express, la arquitectura en capas es una convención, no una restricción del framework, y es más fácil introducir dependencias cruzadas entre capas sin que el compilador lo detecte.

---

## Resumen de impacto por pregunta de investigación

### RQ-1 — Complejidad de implementación y configuración

| Factor | Android + Room | Express + MySQL | Más complejo |
|--------|----------------|-----------------|-------------|
| Gestión de migraciones | Room Migrations automáticas | Scripts SQL manuales (B-03, B-04) | Express |
| Compatibilidad de herramientas SQL | N/A (Room genera SQL) | `DELIMITER` vs Workbench (B-04) | Express |
| Credenciales en repositorio | `local.properties` ignorado por defecto | `.env` sin `.gitignore` inicial (B-05) | Express |
| Lógica de negocio duplicada | ViewModel único | JS + SQL functions (B-09) | Express |
| Arquitectura en capas | Forzada por compilador | Convención, fácil de violar (B-11) | Express |
| Interfaz con la DB | Annotations + codegen | API de mysql2 manual (B-06) | Express |

### RQ-2 — Integración con clientes multiplatforma

| Conflicto | Impacto en Android | Impacto en React |
|-----------|-------------------|-----------------|
| B-01 Rate limiter | 429 en todas las peticiones | 429 en todas las peticiones |
| B-02 Colación UTF-8 | 500 en login/registro | 500 en login/registro |
| B-07 Campo `rol` vs `role` | Error claro en Logcat | Error 400 en Network tab |
| B-10 JWT sin refresh | Redirect limpio al login (Navigation) | Recarga completa (`window.location`) |
| B-08 Race condition | Pedido doble si concurrente | Pedido doble si concurrente |

Los errores B-01 y B-02 afectaron a ambos clientes por igual. B-07 y B-10 tuvieron manifestaciones de UX distintas dependiendo de la plataforma, evidenciando que el backend compartido no garantiza experiencia equivalente en ambos clientes.

### RQ-3 — Consistencia de patrones entre clientes

Los errores del backend (B-01 a B-11) no afectan directamente la consistencia de patrones entre los dos clientes, pero los errores de contrato (B-07, B-10) obligaron a implementar manejo de error defensivo en ambos clientes de forma independiente, sin un mecanismo compartido (ausencia de OpenAPI/Swagger). Esta independencia aumenta el riesgo de divergencia en el comportamiento ante errores del servidor.

---

*Documento generado durante el desarrollo de CletaEats Backend — Mayo 2026*
*Proyecto académico: Comparación React vs. Kotlin/Jetpack Compose sobre backend Express.js compartido*
