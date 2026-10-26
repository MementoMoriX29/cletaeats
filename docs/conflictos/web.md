# Conflictos y Errores — CletaEats Web (React + TypeScript + Vite)

Documentación técnica de los conflictos encontrados durante el desarrollo de la aplicación web CletaEats. Utilizada como evidencia en el paper académico que compara la complejidad de implementación entre React (web) y Kotlin/Jetpack Compose (Android) sobre un backend compartido Express.js + MySQL.

---

## Índice de conflictos

| # | Nombre | Categoría | RQ |
|---|--------|-----------|-----|
| C-01 | Conflicto de peer dependencies con react-leaflet | Gestión de dependencias | RQ-1 |
| C-02 | Opción de compilador desconocida `erasableSyntaxOnly` | Configuración TypeScript | RQ-1 |
| C-03 | Tipos `@types/node` no resueltos en tsconfig | Configuración TypeScript | RQ-1 |
| C-04 | Import no utilizado detectado por `noUnusedLocals` | TypeScript strict mode | RQ-1 |
| C-05 | Error de inferencia `never` en columnas genéricas de TanStack Table | Tipado genérico avanzado | RQ-1 |
| C-06 | Advertencias de deprecación de React Router v6 | Migración de librería | RQ-1 |
| C-07 | Advertencia `@tailwind` desconocido en VS Code | Tooling / linter CSS | RQ-1 |
| C-08 | Tokens de color hardcodeados de Tailwind vs. design system | Consistencia de diseño | RQ-3 |
| C-09 | Error 400 en `POST /api/auth/login` desde el cliente web | Integración con backend | RQ-2 |
| C-10 | Manejo de sesión JWT vs. SessionManager de Android | Diferencia de plataforma | RQ-2 / RQ-3 |
| C-11 | Interceptor Axios vs. AuthInterceptor de OkHttp | Diferencia de plataforma | RQ-2 / RQ-3 |
| C-12 | Tipado de respuestas JSON del backend vs. data classes de Kotlin | Seguridad de tipos | RQ-1 / RQ-2 |

---

## C-01 — Conflicto de peer dependencies con react-leaflet

### Error message
```
npm error ERESOLVE unable to resolve dependency tree
npm error Found: react@19.2.6
npm error Could not resolve dependency:
npm error peer react@"^18.0.0" from react-leaflet@4.2.1
```

### Causa
La versión `react-leaflet@4.x` declara como peer dependency `react@^18.0.0`. El proyecto fue inicializado con la versión más reciente de React (v19.2.6), introducida con Vite 8. npm no permite instalar `react-leaflet@4.2.1` sin que se satisfaga ese rango de versión, y lanza un error `ERESOLVE` (resolución de árbol de dependencias fallida).

### Intentos fallidos
- **Intento 1**: Ejecutar `npm install` sin flags adicionales → falla con `ERESOLVE`.
- **Intento 2**: Considerar `npm install --legacy-peer-deps` → funciona técnicamente, pero introduce riesgo de incompatibilidad en runtime ya que `react-leaflet@4` no fue probado contra React 19.

### Solución final
Actualizar `react-leaflet` de `^4.2.1` a `^5.0.0` en `package.json`. La versión 5 declara compatibilidad con React 18 y 19, resolviendo el conflicto sin flags de instalación inseguros.

```json
// Antes
"react-leaflet": "^4.2.1"

// Después
"react-leaflet": "^5.0.0"
```

### Relevancia para el paper — RQ-1
Ilustra una complejidad característica del ecosistema npm: la gestión de peer dependencies requiere alinear manualmente versiones de librerías interdependientes. En el cliente Android, Gradle gestiona dependencias con Maven y los conflictos se resuelven automáticamente mediante `dependencyResolution { force(...) }` o actualizando la versión del BOM. La brecha de experiencia de desarrollador entre ambos gestores de paquetes es un factor medible de complejidad de implementación.

---

## C-02 — Opción de compilador desconocida `erasableSyntaxOnly`

### Error message
```
tsconfig.app.json(21,5): error TS5023: Unknown compiler option 'erasableSyntaxOnly'.
tsconfig.node.json(20,5): error TS5023: Unknown compiler option 'erasableSyntaxOnly'.
```

### Causa
Vite 8 generó el proyecto con TypeScript 6.x como versión objetivo en `package.json`, el cual incluye la opción `erasableSyntaxOnly`. Sin embargo, para mantener compatibilidad con las librerías de terceros (TanStack Table, React Router, Recharts), el proyecto fue reconfigurado a TypeScript `~5.7.2`. La opción `erasableSyntaxOnly` es exclusiva de TypeScript 6+ y no existe en la versión 5.x, provocando que `tsc -b` falle.

### Intentos fallidos
- **Intento 1**: Ignorar el error asumiendo que Vite lo omitía → el comando `tsc -b` en el script `build` falla antes de invocar Vite.

### Solución final
Eliminar la línea `"erasableSyntaxOnly": true` de ambos archivos `tsconfig.app.json` y `tsconfig.node.json`.

### Relevancia para el paper — RQ-1
Refleja que el toolchain de React (Vite + TypeScript + ESLint) tiene un ciclo de versiones más agresivo que el de Android (Kotlin + AGP + Gradle), lo que genera incompatibilidades entre la configuración generada por el scaffolding y las librerías que se instalan inmediatamente después. En Kotlin/Compose el compilador y el SDK están versionados juntos en el BOM de Compose, reduciendo este tipo de fricción.

---

## C-03 — Tipos `@types/node` no resueltos en tsconfig

### Error message
```
error TS2688: Cannot find type definition file for 'node'.
  The file is in the program because:
    Entry point of type library 'node' specified in compilerOptions
```

### Causa
El archivo `tsconfig.node.json` (generado por Vite para compilar `vite.config.ts`) declaraba `"types": ["node"]`, pero `@types/node` no estaba instalado como devDependency en el `package.json` actualizado. Al reescribir el archivo de dependencias para agregar todas las librerías de CletaEats, se omitió `@types/node`.

### Intentos fallidos
- **Intento 1**: Agregar `@types/node` a `devDependencies` → resuelve el error pero agrega un paquete innecesario para una SPA que no usa APIs de Node.js directamente.

### Solución final
Vaciar el array `types` en `tsconfig.node.json` eliminando la referencia a `node`, ya que `vite.config.ts` no requiere tipos de Node.js al usar el módulo ESM de Vite.

```json
// Antes
"types": ["node"]

// Después
"types": []
```

### Relevancia para el paper — RQ-1
En Android, los tipos del SDK están siempre disponibles sin configuración adicional. En React/TypeScript, los tipos del entorno (browser, node, DOM) deben declararse explícitamente en `tsconfig`, añadiendo una capa de configuración que no tiene equivalente directo en el desarrollo con Kotlin.

---

## C-04 — Import no utilizado detectado por `noUnusedLocals`

### Error message
```
src/api/orders.ts(3,22): error TS6196: 'OrderItem' is declared but never used.
```

### Causa
El archivo `src/api/orders.ts` importaba el tipo `OrderItem` de `../types` para anotar el cuerpo de la función `createOrder`. Al refactorizar, el tipo fue internalizado en la firma del payload (`{ combo_id: number; cantidad: number }[]`) y el import quedó huérfano. TypeScript con `"noUnusedLocals": true` trata esto como error de compilación, no como advertencia.

### Intentos fallidos
- **Intento 1**: Desactivar `noUnusedLocals` en tsconfig → solución válida pero empeora la calidad del código a largo plazo.

### Solución final
Eliminar el import de `OrderItem` del archivo `src/api/orders.ts`.

```typescript
// Antes
import type { Order, OrderItem } from '../types';

// Después
import type { Order } from '../types';
```

### Relevancia para el paper — RQ-1
El modo estricto de TypeScript (`noUnusedLocals`, `noUnusedParameters`) equivale funcionalmente al análisis estático de Kotlin con las advertencias del compilador sobre código muerto. Sin embargo, en TypeScript este nivel de strictness es **opt-in** por configuración, mientras que en Kotlin/Android Studio la detección de código no utilizado es nativa y visual (código grisado), sin bloquear la compilación. Esto implica mayor superficie de configuración en el stack web.

---

## C-05 — Error de inferencia `never` en columnas genéricas de TanStack Table

### Error message
```
src/pages/admin/Reports.tsx(61,32): error TS2345:
Argument of type '{ header: string; cell: (info: any) => string; }'
is not assignable to parameter of type 'never'.
```

### Causa
La función `buildColumns` en `AdminReports` intentaba construir columnas dinámicamente a partir de datos cuya forma (`Record<string, unknown>[]`) se desconoce en tiempo de compilación. TanStack Table v8 usa tipos genéricos muy estrictos: `ColumnDef<TData, TValue>` donde `TData` debe ser un tipo concreto. Al pasarle `Record<string, unknown>` como `TData`, TypeScript no puede inferir `TValue` para el accessor, colapsando el tipo a `never`. Cualquier objeto que se intente asignar a `ColumnDef<unknown, never>` falla.

### Intentos fallidos
- **Intento 1**: Usar `createColumnHelper<Record<string, unknown>>()` y `.accessor(key as never, ...)` → el cast `as never` resuelve el accessor pero el tipo del objeto column definition sigue siendo `never` en el array de retorno.
- **Intento 2**: Tipar el retorno como `ColumnDef<Record<string, unknown>>[]` → TypeScript rechaza la asignación porque `TValue` sigue sin resolverse.

### Solución final
Evitar `createColumnHelper` para datos dinámicos y construir el array de columnas como objetos planos tipados con `any[]`, usando `accessorKey` en lugar del API funcional:

```typescript
function buildColumns(data: Record<string, unknown>[]): any[] {
  if (!data.length) return [];
  return Object.keys(data[0]).map((key) => ({
    accessorKey: key,
    header: key,
    cell: (info: any) => String(info.getValue() ?? ''),
  }));
}
```

### Relevancia para el paper — RQ-1
Este conflicto no tiene equivalente en Kotlin. En Jetpack Compose, una `LazyColumn` con datos dinámicos simplemente itera sobre una `List<Map<String, Any>>` sin restricciones de tipo en tiempo de compilación para las celdas. El sistema de genéricos de TypeScript aplicado a librerías UI como TanStack Table introduce una complejidad de tipos que no existe en el equivalente Android. Es evidencia directa de mayor carga cognitiva de implementación en React para pantallas de reportes dinámicos.

---

## C-06 — Advertencias de deprecación de React Router v6

### Error message (consola del navegador)
```
⚠️ React Router Future Flag Warning: React Router will begin wrapping state
updates in React.startTransition in v7. You can use the v7_startTransition
future flag to opt-in early.

⚠️ React Router Future Flag Warning: Relative route resolution within Splat
routes is changing in v7. You can use the v7_relativeSplatPath future flag
to opt-in early.
```

### Causa
React Router v6.28+ introduce advertencias en consola para comportamientos que cambiarán en v7. La ausencia de las `future flags` en el componente `<BrowserRouter>` activa las advertencias en cada montaje de la aplicación, ya que el router detecta que el código usa la API legacy de v6 sin indicar preparación para v7.

### Intentos fallidos
- **Intento 1**: Ignorar las advertencias asumiendo que son informativas → persisten en consola durante el desarrollo, contaminando el output de debugging.

### Solución final
Agregar las `future flags` correspondientes al componente `<BrowserRouter>`:

```tsx
<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
```

### Relevancia para el paper — RQ-1
En Android, los cambios de API entre versiones de Navigation Compose se manejan mediante la actualización del BOM de Compose, con migraciones guiadas por Android Studio. En React, las librerías de routing deprecan comportamientos dentro de la misma versión major usando flags opt-in, lo que requiere que el desarrollador monitoree changelogs activamente para evitar deuda técnica silenciosa.

---

## C-07 — Advertencia `@tailwind` desconocido en VS Code

### Error message (IDE)
```
Unknown at rule @tailwind  [unknownAtRules]  src/index.css:1
Unknown at rule @tailwind  [unknownAtRules]  src/index.css:2
Unknown at rule @tailwind  [unknownAtRules]  src/index.css:3
```

### Causa
El servidor de lenguaje CSS de VS Code (basado en el estándar W3C) no reconoce las directivas `@tailwind base`, `@tailwind components` y `@tailwind utilities` porque son extensiones propietarias de Tailwind CSS, no parte del estándar CSS. El linter las marca como reglas desconocidas.

### Intentos fallidos
- **Intento 1**: Agregar `// @ts-ignore` o comentarios de supresión → no aplica para archivos CSS.
- **Intento 2**: Instalar la extensión oficial de Tailwind CSS para VS Code → suprime las advertencias en el editor pero no persiste la configuración para otros desarrolladores del proyecto.

### Solución final
Agregar una configuración local de VS Code en `.vscode/settings.json` para suprimir la validación de at-rules desconocidos:

```json
{
  "css.lint.unknownAtRules": "ignore"
}
```

### Relevancia para el paper — RQ-1
Ilustra que el ecosistema React/Tailwind requiere configuración adicional del entorno de desarrollo (editor + linter + PostCSS + Vite) para funcionar sin ruido. En Android Studio, el entorno de desarrollo está más integrado con el framework (Jetpack Compose, Material 3) y no requiere supresiones manuales de linters para usar las APIs estándar del SDK.

---

## C-08 — Tokens de color hardcodeados de Tailwind vs. design system

### Descripción
Durante la implementación inicial de componentes, se usaron clases de Tailwind del sistema de colores por defecto (`border-gray-700`, `border-gray-800`, `hover:bg-gray-800`, `bg-gray-700`) en lugar de los tokens semánticos definidos en el design system de CletaEats.

### Causa
El scaffolding de componentes priorizó velocidad de implementación usando la paleta gris incorporada de Tailwind, que es funcionalmente similar pero no exacta a la paleta del cliente Android. Por ejemplo:
- `gray-800` de Tailwind = `#1f2937` — el design system usa `border: #2A2A2A`
- `gray-700` de Tailwind = `#374151` — el design system usa `secondary: #2A2A2A`

### Impacto
Inconsistencia visual entre la app web y la app Android: los bordes y fondos secundarios diferían en ~10% de luminosidad respecto a los definidos en el design system compartido.

### Solución final
1. Ampliar `tailwind.config.js` con todos los tokens semánticos del design system (`border`, `secondary`, `card`, `muted-foreground`, `ring`, etc.).
2. Reemplazar globalmente con `sed` todas las clases hardcodeadas en los 18 archivos TSX afectados:

```bash
find ./src -name "*.tsx" -exec sed -i \
  's/border-gray-[678]00/border-border/g;
   s/hover:bg-gray-[78]00/hover:bg-secondary/g;
   s/bg-gray-800/bg-secondary/g;
   s/text-text-secondary/text-muted-foreground/g' {} +
```

### Relevancia para el paper — RQ-3
Evidencia un reto de consistencia de design system entre clientes. En Android, la paleta Material 3 se define una vez en `Theme.kt` y todos los Composables la consumen mediante `MaterialTheme.colorScheme.X`, lo que hace imposible usar colores fuera del tema sin hacerlo explícitamente. En React + Tailwind, es posible usar cualquier color del sistema por defecto de Tailwind sin que el compilador lo detecte, requiriendo disciplina de equipo o procesos de revisión adicionales para mantener la consistencia.

---

## C-09 — Error 400 en `POST /api/auth/login` desde el cliente web

### Error message (consola)
```
aplicacionesm-viles-production.up.railway.app/api/auth/login:1
Failed to load resource: the server responded with a status of 400 ()
```

### Causa (en investigación)
El código HTTP 400 (Bad Request) indica que el servidor recibió la petición pero rechazó el cuerpo. Las causas posibles son:

1. **Credenciales incorrectas**: El usuario admin no existe aún en la base de datos de Railway, o las credenciales utilizadas no coinciden con las sembradas en el backend.
2. **Nombres de campos divergentes**: El backend Express podría esperar campos con nombres distintos a `{ email, password }` (por ejemplo `usuario`, `correo`, `contraseña`).
3. **Content-Type**: Si el backend no tiene `express.json()` configurado correctamente, el body llega vacío y falla la validación.

### Intentos fallidos
- **Intento 1**: Verificar que Axios envía `Content-Type: application/json` → confirmado en el interceptor de `axios.ts`.

### Estado actual
Pendiente de verificar el cuerpo exacto de la respuesta 400 en DevTools → Network → Response, y comparar con el esquema de validación del endpoint en el backend.

### Relevancia para el paper — RQ-2
Este es el conflicto más significativo para RQ-2. Ilustra cómo la integración entre un cliente web y un backend compartido expone problemas que el cliente Android podría no presentar si fue desarrollado en paralelo con el backend:

- En Android (Retrofit + Kotlin), si el campo se llama `password` en el data class pero el backend espera `contraseña`, el error es un 400 que aparece igual. Sin embargo, Kotlin data classes y las anotaciones `@SerializedName` de Gson/Moshi hacen el mapping explícito y documentado en el código.
- En React, el objeto enviado por Axios es un POJO de JavaScript, sin ningún esquema formal que force la correspondencia con el contrato del backend.
- La ausencia de un contrato compartido (OpenAPI/Swagger) entre backend y ambos clientes amplifica este problema.

---

## C-10 — Manejo de sesión JWT vs. SessionManager de Android

### Descripción
El cliente web y el cliente Android implementan el mismo concepto (persistencia de sesión JWT) de formas estructuralmente distintas, lo que requirió decisiones de diseño explícitas en React.

### Implementación Android (referencia)
```kotlin
// SessionManager.kt — usa DataStore (persistencia cifrada)
class SessionManager(private val context: Context) {
    private val dataStore = context.dataStore
    suspend fun saveToken(token: String) { /* ... */ }
    suspend fun getToken(): String? { /* ... */ }
}
```

### Implementación React (solución adoptada)
```typescript
// AuthContext.tsx — usa localStorage (persistencia en texto plano)
const login = (user: AuthUser) => {
    localStorage.setItem('token', user.token);
    localStorage.setItem('userId', String(user.id));
    localStorage.setItem('userRole', user.role);
    localStorage.setItem('userName', user.nombre);
    localStorage.setItem('userEmail', user.email);
};
```

### Diferencias clave

| Aspecto | Android (DataStore) | React (localStorage) |
|---------|--------------------|-----------------------|
| Cifrado | Sí (EncryptedDataStore) | No — texto plano |
| Hilo | Coroutines (async) | Síncrono |
| Persistencia | App storage seguro | Browser storage |
| Expiración | Manual | Manual |
| SSR compatible | N/A | No |

### Causa del conflicto
`localStorage` es la solución más simple disponible en el navegador sin librerías adicionales. Alternativas como `sessionStorage` (más segura pero no persiste entre pestañas), cookies HttpOnly (más seguras pero requieren configuración de CORS en el backend) o librerías como `zustand-persist` añaden complejidad. Se eligió `localStorage` por equivalencia funcional con la prueba de concepto académica, asumiendo que en producción se usarían cookies HttpOnly.

### Relevancia para el paper — RQ-2 / RQ-3
Evidencia directa de diferencia en complejidad de integración segura con el backend entre plataformas. Android ofrece almacenamiento seguro de credenciales como característica de primera clase (DataStore, Keystore). El navegador ofrece `localStorage` sin cifrado, lo que requiere diseño adicional para seguridad equivalente — aumentando la complejidad de implementación en el cliente web.

---

## C-11 — Interceptor Axios vs. AuthInterceptor de OkHttp

### Descripción
Ambos clientes necesitan inyectar el header `Authorization: Bearer <token>` en cada petición autenticada. La implementación difiere en estructura y comportamiento de error.

### Implementación Android (referencia)
```kotlin
// AuthInterceptor.kt
class AuthInterceptor(private val sessionManager: SessionManager) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = runBlocking { sessionManager.getToken() }
        val request = chain.request().newBuilder()
            .header("Authorization", "Bearer $token")
            .build()
        val response = chain.proceed(request)
        if (response.code == 401) {
            runBlocking { sessionManager.clearSession() }
        }
        return response
    }
}
```

### Implementación React (solución adoptada)
```typescript
// axios.ts
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.clear();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);
```

### Diferencias clave

| Aspecto | Android (OkHttp) | React (Axios) |
|---------|-----------------|---------------|
| Sincronismo | Bloqueante con `runBlocking` | Asíncrono (Promise) |
| Acceso al token | DataStore (suspend) | localStorage (sync) |
| Redirect en 401 | Navigation component | `window.location.href` (recarga completa) |
| Testabilidad | Mock de `Interceptor.Chain` | Mock de adaptador Axios |
| Tipado | Fuertemente tipado (Kotlin) | Débilmente tipado (`error: unknown`) |

### Relevancia para el paper — RQ-2 / RQ-3
El patrón Interceptor es funcionalmente equivalente entre ambos clientes (Singleton con intercepción de peticiones), lo que lo hace un ejemplo directo de RQ-3 (patrones de diseño entre clientes). Sin embargo, la implementación en React requiere manejar la naturaleza asíncrona de JavaScript sin los beneficios de las Coroutines de Kotlin, y el redirect en 401 fuerza una recarga completa del navegador en lugar de una navegación dentro del stack, lo que es una diferencia observable en la experiencia de usuario.

---

## C-12 — Tipado de respuestas JSON del backend vs. data classes de Kotlin

### Descripción
El backend Express.js devuelve objetos JSON sin un contrato formal. Cada cliente debe mapear esos objetos a su sistema de tipos nativo, con distintos niveles de seguridad.

### Implementación Android (referencia)
```kotlin
// Order.kt — data class con serialización automática
data class Order(
    val id: Int,
    val clienteId: Int,          // Gson mapea snake_case automáticamente
    val restauranteId: Int,
    val estado: OrderStatus,     // enum con validación en compile-time
    val total: Double,
    val items: List<OrderItem>
)
```
Si el backend cambia el nombre de un campo, el error se detecta en la deserialización con un `JsonSyntaxException` claro.

### Implementación React (solución adoptada)
```typescript
// types/index.ts — interface TypeScript
export interface Order {
    id: number;
    cliente_id: number;          // snake_case manual — sin transformación automática
    restaurante_id: number;
    estado: OrderStatus;         // type alias — validado solo en compile-time
    total: number;
    items: OrderItem[];
    restaurante_nombre?: string; // campo opcional que puede no venir del backend
}
```

### Problema encontrado
Los campos como `restaurante_nombre` y `repartidor_nombre` son opcionales (`?`) porque el backend los incluye solo en algunos endpoints (e.g., `/orders/:id` pero no en `/orders/client/:clientId`). Esto requirió marcar múltiples campos como opcionales, perdiendo parte de la seguridad de tipos y forzando null-checks en los componentes:

```tsx
// Null-check necesario porque el campo puede no venir
<p>{order.restaurante_nombre ?? `Restaurante #${order.restaurante_id}`}</p>
```

En Kotlin, este mismo problema generaría un `NullPointerException` en runtime si el campo no es `String?`, forzando al desarrollador a definir el contrato explícitamente desde el principio.

### Causa
La ausencia de un esquema OpenAPI/Swagger para el backend compartido significa que cada cliente infiere los tipos de los objetos JSON de forma independiente, sin garantía de sincronía. TypeScript añade seguridad estática en compile-time, pero en runtime Axios devuelve el JSON sin validación, por lo que un campo renombrado en el backend genera bugs silenciosos (el campo llega `undefined`) en lugar de errores explícitos.

### Relevancia para el paper — RQ-1 / RQ-2
Es la diferencia de integración más profunda entre ambos clientes:
- **Kotlin** con Gson/Moshi tiene validación de tipos en deserialización (runtime safety).
- **TypeScript** con Axios tiene validación de tipos solo en compilación (compile-time safety), pero cero garantías en runtime.
- Ambos enfoques son inseguros ante cambios del contrato del backend, pero los síntomas difieren: Kotlin falla ruidosamente (excepción), React falla silenciosamente (`undefined`).
- Esto aumenta la carga de debugging en el cliente web, especialmente para campos opcionales o inconsistentes entre endpoints.

---

## Resumen de impacto por pregunta de investigación

### RQ-1 — Complejidad de implementación de interfaces equivalentes

| Factor | Android | React | Impacto |
|--------|---------|-------|---------|
| Configuración de entorno | Gradle + BOM | Vite + tsconfig + PostCSS + ESLint | Mayor en React |
| Tipado estático | Compilador Kotlin | TypeScript (compile-time) | Equivalente |
| Seguridad de tipos en runtime | Sí (Gson/Moshi) | No (Axios sin schema) | Mayor riesgo en React |
| Compatibilidad de dependencias | Maven + BOM | npm + peer deps | Mayor fricción en React |
| Errores de compilación bloqueantes | 0 tras setup | 5 durante desarrollo | React |
| Curva de configuración del IDE | Baja | Media | React |

### RQ-2 — Retos de integración con el backend compartido

| Conflicto | Android | React |
|-----------|---------|-------|
| JWT storage | DataStore cifrado | localStorage plano |
| JWT injection | OkHttp Interceptor | Axios interceptor |
| Mapeo JSON→tipos | Gson automático + explícito | TypeScript manual + runtime unsafe |
| Error 400 debug | Stack trace con campo | Response body manual |
| Redirect en 401 | Navigation (in-stack) | window.location (recarga) |

### RQ-3 — Patrones de diseño para consistencia entre clientes

| Patrón | Android | React | Consistencia |
|--------|---------|-------|--------------|
| State management | ViewModel + StateFlow | Context API + useReducer | Alta |
| HTTP client | Retrofit + OkHttp | Axios | Alta |
| Auth interceptor | AuthInterceptor (OkHttp) | Interceptor (Axios) | Alta |
| Session | SessionManager | localStorage + AuthContext | Media |
| Navigation guard | NavGraph + roles | RoleGuard (Outlet) | Alta |
| Design tokens | Theme.kt / MaterialTheme | tailwind.config.js | Media (ver C-08) |

Los patrones de diseño son altamente consistentes entre clientes (RQ-3 satisfecho), pero la consistencia del design system requirió corrección manual (C-08), evidenciando que la consistencia en React no está forzada por el framework sino por convención.

---

*Documento generado durante el desarrollo de CletaEats Web — Mayo 2026*
*Proyecto académico: Comparación React vs. Kotlin/Jetpack Compose sobre backend Express.js compartido*
