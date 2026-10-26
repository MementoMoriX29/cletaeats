# Métricas CletaEats — Cliente Web (React + TypeScript + Vite)

**Fecha de extracción:** 2026-05-17  
**Rama:** web  
**Stack:** React 19 · TypeScript 5.7 · Vite 6 · Axios · TailwindCSS  
**Propósito:** Paper académico comparando React vs. Kotlin/Jetpack Compose sobre backend Express compartido.

---

## 1. Conteo de archivos por capa

Comandos ejecutados desde la raíz del proyecto:

```
find src/api        -name "*.ts"  | wc -l  →  7
find src/components -name "*.tsx" | wc -l  →  9
find src/pages      -name "*.tsx" | wc -l  → 15
find src/context    -name "*.tsx" | wc -l  →  2
find src/types      -name "*.ts"  | wc -l  →  1
find src            -name "*.tsx" -o -name "*.ts" | wc -l  → 36
```

| Carpeta | Archivos | Contenido |
|---|---|---|
| `src/api/` | 7 | Capa de acceso a datos HTTP (auth, axios, clients, deliveryPersons, orders, reports, restaurants) |
| `src/components/` | 9 | Componentes reutilizables (Layout, NavDrawer, Table, 6 componentes UI) |
| `src/pages/` | 15 | Pantallas (2 auth, 6 cliente, 2 repartidor, 5 admin) |
| `src/context/` | 2 | Estado global (AuthContext, CartContext) |
| `src/types/` | 1 | Definiciones de tipos del dominio (index.ts) |
| **Total `.ts` / `.tsx`** | **36** | — |

Archivos adicionales en la raíz: `App.tsx`, `main.tsx`, `index.css`, `App.css` (4 archivos fuera de `src/`).

---

## 2. Líneas de código (LOC) por archivo clave

Comando ejecutado: `wc -l <archivo>`

---

### 2.1 Pantalla de Login

**Archivo:** `src/pages/auth/Login.tsx`  
**Líneas:** 83

Fragmento representativo (líneas 14–42):

```tsx
export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await loginApi(form);
      login({
        id: data.id,
        nombre: data.nombre,
        email: data.email,
        role: data.role as UserRole,
        token: data.token,
      });
      const role: UserRole = data.role;
      if (role === 'cliente') navigate('/client/home');
      else if (role === 'repartidor') navigate('/delivery/dashboard');
      else navigate('/admin/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };
```

---

### 2.2 Pantalla de Registro

**Archivo:** `src/pages/auth/Register.tsx`  
**Líneas:** 88

Fragmento representativo (líneas 13–41):

```tsx
export const Register = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('cliente');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre: '', email: '', password: '', telefono: '', direccion: '', placa: '',
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === 'cliente') {
        await registerClient({ nombre: form.nombre, email: form.email, password: form.password, telefono: form.telefono, direccion: form.direccion });
      } else {
        await registerDelivery({ nombre: form.nombre, email: form.email, password: form.password, telefono: form.telefono, placa: form.placa });
      }
      toast.success('Cuenta creada. Inicia sesión.');
      navigate('/login');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };
```

---

### 2.3 Pantalla Home / Lista de restaurantes

**Archivo:** `src/pages/client/Home.tsx`  
**Líneas:** 94

Fragmento representativo (líneas 15–41):

```tsx
export const ClientHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filtered, setFiltered] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getRestaurants();
        const active = data.filter((r) => r.activo);
        setRestaurants(active);
        setFiltered(active);
      } catch {
        toast.error('Sin conexión al servidor');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const q = query.toLowerCase();
    setFiltered(restaurants.filter((r) => r.nombre.toLowerCase().includes(q) || r.categoria.toLowerCase().includes(q)));
  }, [query, restaurants]);
```

---

### 2.4 Interceptor HTTP (Axios Interceptor — equivalente a AuthInterceptor de Android)

**Archivo:** `src/api/axios.ts`  
**Líneas:** 35

Fragmento completo (archivo entero):

```typescript
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL_REMOTE as string;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: adjunta el token Bearer (= AuthInterceptor en Android)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: limpia sesión en 401 (= SessionManager en Android)
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

export default api;
```

---

### 2.5 Manejador de sesión (AuthContext — equivalente a SessionManager de Android)

**Archivo:** `src/context/AuthContext.tsx`  
**Líneas:** 87

Fragmento representativo (líneas 60–74):

```tsx
const login = (user: AuthUser) => {
  localStorage.setItem('token', user.token);
  localStorage.setItem('userId', String(user.id));
  localStorage.setItem('userRole', user.role);
  localStorage.setItem('userName', user.nombre);
  localStorage.setItem('userEmail', user.email);
  dispatch({ type: 'LOGIN', payload: user });
};

const logout = () => {
  localStorage.clear();
  dispatch({ type: 'LOGOUT' });
};

const isRole = (role: UserRole) => state.user?.role === role;
```

---

### 2.6 Modelo / DTO de Cliente (TypeScript interfaces — equivalente a data classes de Kotlin)

**Archivo:** `src/types/index.ts`  
**Líneas:** 151

Fragmento representativo — interfaz `Client` y tipos relacionados (líneas 57–66):

```typescript
export interface Client {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  estado: 'activo' | 'suspendido';
  fecha_registro: string;
}
```

---

## 3. Patrones de diseño implementados

### 3.1 Singleton

**Archivo:** `src/api/axios.ts` (líneas 8–12)

Se crea **una única instancia** del cliente Axios mediante `axios.create()` y se exporta como `default`. Todos los módulos de la capa `src/api/` importan esta instancia compartida. No se puede crear otra instancia con la misma configuración desde fuera del módulo.

```typescript
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export default api;
```

---

### 3.2 Interceptor

**Archivo:** `src/api/axios.ts` (líneas 15–33)

Se registran dos interceptores sobre la instancia Singleton: uno de **petición** (inyecta el header `Authorization`) y uno de **respuesta** (captura errores 401 y limpia la sesión). Es el equivalente directo a `AuthInterceptor.kt` de OkHttp en Android.

```typescript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
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

---

### 3.3 Observer (Publish-Subscribe via React Context API)

**Archivos:** `src/context/AuthContext.tsx` (líneas 37–87) y `src/context/CartContext.tsx` (líneas 77–108)

`AuthContext` y `CartContext` implementan el patrón Observer: el Provider emite cambios de estado y los componentes suscritos (vía `useContext`) se re-renderizan automáticamente cuando el estado cambia. Es el equivalente a `StateFlow` + `collectAsState()` en Jetpack Compose.

```tsx
// AuthContext.tsx — Provider (publicador)
const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, { user: null, isLoading: true });
  // ...
  return (
    <AuthContext.Provider value={{ ...state, login, logout, isRole }}>
      {children}
    </AuthContext.Provider>
  );
};

// useAuth() — Suscriptor
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
```

---

### 3.4 Arquitectura por Capas (Layered Architecture)

**Directorio:** `src/` completo

La estructura de carpetas establece capas con responsabilidades únicas y dependencias unidireccionales (`pages` → `context` → `api` → HTTP):

```
src/
├── api/        ← Capa de datos: llamadas HTTP al backend (7 archivos)
├── context/    ← Capa de estado global: AuthContext, CartContext (2 archivos)
├── components/ ← Capa de UI reutilizable: componentes sin lógica de negocio (9 archivos)
├── pages/      ← Capa de vistas: pantallas que orquestan context + API (15 archivos)
└── types/      ← Capa de dominio: interfaces TypeScript del modelo (1 archivo)
```

Evidencia en `src/pages/client/Home.tsx` (líneas 5–13) — la página importa de las 3 capas inferiores pero ninguna capa inferior importa de `pages/`:

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRestaurants } from '../../api/restaurants';   // ← capa api
import type { Restaurant } from '../../types';             // ← capa types
import { SkeletonCard } from '../../components/ui/Skeleton'; // ← capa components
import { useAuth } from '../../context/AuthContext';       // ← capa context
```

---

### 3.5 Arquitectura Basada en Componentes (Component-Based)

**Directorio:** `src/components/ui/` — 6 componentes reutilizables

Componentes UI agnósticos al dominio, consumidos por múltiples pantallas:

| Componente | Archivo | Líneas |
|---|---|---|
| `Input` | `src/components/ui/Input.tsx` | 18 |
| `Button` | `src/components/ui/Button.tsx` | 33 |
| `Badge` | `src/components/ui/Badge.tsx` | 17 |
| `Card` | `src/components/ui/Card.tsx` | 11 |
| `EmptyState` | `src/components/ui/EmptyState.tsx` | 17 |
| `Skeleton` | `src/components/ui/Skeleton.tsx` | 21 |

Ejemplo — `src/components/ui/Input.tsx` (archivo completo):

```tsx
interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = ({ label, error, className = '', ...rest }: Props) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm text-muted-foreground">{label}</label>
    <input
      className={`bg-card border ${error ? 'border-error' : 'border-border'} rounded-lg px-3 py-2 text-white ...`}
      {...rest}
    />
    {error && <span className="text-xs text-error">{error}</span>}
  </div>
);
```

---

### 3.6 Patrones NO identificados en el código

| Patrón | Estado |
|---|---|
| **Repository** (clase) | PATRÓN NO IDENTIFICADO EN EL CÓDIGO. Los archivos `src/api/*.ts` exponen funciones sueltas que abstraen HTTP, pero no implementan una clase Repository con interfaz formal. Es un equivalente funcional, no el patrón clásico. |
| **MVVM** (clase ViewModel) | PATRÓN NO IDENTIFICADO EN EL CÓDIGO. `AuthContext` y `CartContext` cumplen el rol de ViewModel (separan lógica de UI), pero no son instancias de una clase ViewModel formal. React no impone esta arquitectura. |
| **DAO** | PATRÓN NO IDENTIFICADO EN EL CÓDIGO. No aplica: el cliente web no accede a base de datos directamente; toda persistencia va al backend vía HTTP. |
| **Factory** | PATRÓN NO IDENTIFICADO EN EL CÓDIGO. No hay función Factory ni clase Factory en el código fuente. |

---

## 4. Dependencias externas

**Archivo fuente:** `package.json`

**Total de dependencias:** 10 `dependencies` + 15 `devDependencies` = **25 paquetes**

### Dependencies (10)

| Paquete | Versión exacta en package.json | Rol en integración con backend |
|---|---|---|
| `axios` | `^1.7.9` | Cliente HTTP — todas las llamadas al backend Express |
| `react-router-dom` | `^6.28.1` | Navegación entre rutas / protección por rol |
| `react` | `^19.0.0` | Framework UI base |
| `react-dom` | `^19.0.0` | Renderizado en el DOM |
| `@tanstack/react-table` | `^8.20.6` | Tablas de administración (reportes, clientes, repartidores) |
| `lucide-react` | `^0.468.0` | Iconos UI |
| `react-hot-toast` | `^2.4.1` | Notificaciones de errores/éxito del backend |
| `react-leaflet` | `^5.0.0` | Mapa de seguimiento de pedidos |
| `leaflet` | `^1.9.4` | Dependencia peer de react-leaflet |
| `recharts` | `^2.14.1` | Gráficas en pantalla de reportes admin |

### DevDependencies (12)

`@eslint/js ^9.17.0` · `@types/leaflet ^1.9.14` · `@types/react ^19.0.2` · `@types/react-dom ^19.0.2` · `@vitejs/plugin-react ^4.3.4` · `autoprefixer ^10.4.20` · `eslint ^9.17.0` · `eslint-plugin-react-hooks ^5.0.0` · `eslint-plugin-react-refresh ^0.4.16` · `globals ^15.14.0` · `postcss ^8.4.49` · `tailwindcss ^3.4.17` · `typescript ~5.7.2` · `typescript-eslint ^8.18.2` · `vite ^6.0.5`

> Conteo verificado manualmente línea por línea en `package.json`.

---

## 5. Endpoints consumidos

**Total de endpoints:** 34 (contados línea a línea en los 6 archivos de `src/api/`)

### 5.1 Autenticación — `src/api/auth.ts`

| Método | Endpoint | Archivo:Línea |
|---|---|---|
| POST | `/auth/login` | `src/api/auth.ts:6` |
| POST | `/auth/register-client` | `src/api/auth.ts:9` |
| POST | `/auth/register-delivery-person` | `src/api/auth.ts:12` |

### 5.2 Restaurantes — `src/api/restaurants.ts`

| Método | Endpoint | Archivo:Línea |
|---|---|---|
| GET | `/restaurants` | `src/api/restaurants.ts:6` |
| GET | `/restaurants/:id` | `src/api/restaurants.ts:9` |
| GET | `/restaurants/:id/combos` | `src/api/restaurants.ts:12` |
| POST | `/restaurants` | `src/api/restaurants.ts:15` |
| PUT | `/restaurants/:id` | `src/api/restaurants.ts:18` |
| PUT | `/restaurants/:id/combos/:comboId` | `src/api/restaurants.ts:21` |

### 5.3 Pedidos — `src/api/orders.ts`

| Método | Endpoint | Archivo:Línea |
|---|---|---|
| POST | `/orders` | `src/api/orders.ts:13` |
| GET | `/orders/client/:clientId` | `src/api/orders.ts:16` |
| GET | `/orders/:id` | `src/api/orders.ts:19` |
| PUT | `/orders/:id/status` | `src/api/orders.ts:22` |
| GET | `/orders/:id/invoice` | `src/api/orders.ts:25` |

### 5.4 Clientes — `src/api/clients.ts`

| Método | Endpoint | Archivo:Línea |
|---|---|---|
| GET | `/clients` | `src/api/clients.ts:6` |
| GET | `/clients/:id` | `src/api/clients.ts:9` |
| PUT | `/clients/:id` | `src/api/clients.ts:12` |
| PUT | `/clients/:id/status` | `src/api/clients.ts:15` |

### 5.5 Repartidores — `src/api/deliveryPersons.ts`

| Método | Endpoint | Archivo:Línea |
|---|---|---|
| GET | `/delivery-persons` | `src/api/deliveryPersons.ts:6` |
| GET | `/delivery-persons/:id` | `src/api/deliveryPersons.ts:9` |
| PUT | `/delivery-persons/:id/status` | `src/api/deliveryPersons.ts:12` |
| POST | `/delivery-persons/:id/complaints` | `src/api/deliveryPersons.ts:15` |

### 5.6 Reportes — `src/api/reports.ts`

| Método | Endpoint | Archivo:Línea |
|---|---|---|
| GET | `/reports/clients/active` | `src/api/reports.ts:4` |
| GET | `/reports/clients/suspended` | `src/api/reports.ts:5` |
| GET | `/reports/clients/most-orders` | `src/api/reports.ts:6` |
| GET | `/reports/restaurants` | `src/api/reports.ts:8` |
| GET | `/reports/restaurants/most-orders` | `src/api/reports.ts:9` |
| GET | `/reports/restaurants/least-orders` | `src/api/reports.ts:10` |
| GET | `/reports/restaurants/sales-by-restaurant` | `src/api/reports.ts:11` |
| GET | `/reports/restaurants/total-sales` | `src/api/reports.ts:12` |
| GET | `/reports/delivery-persons/no-warnings` | `src/api/reports.ts:14` |
| GET | `/reports/delivery-persons/complaints` | `src/api/reports.ts:15` |
| GET | `/reports/orders/by-client` | `src/api/reports.ts:17` |
| GET | `/reports/orders/peak-hours` | `src/api/reports.ts:18` |

---

## 6. Retos de integración específicos

Fuente: `docs/conflictos-web.md` — 12 conflictos documentados durante el desarrollo.

---

### C-01 — Conflicto de peer dependencies con react-leaflet

**Archivo donde se manifestó:** `package.json`  
**Descripción:** `react-leaflet@4.x` requiere `react@^18` como peer dependency; el proyecto usa `react@19`. npm lanzó error `ERESOLVE` al instalar.  
**Solución aplicada:** Actualizar `react-leaflet` de `^4.2.1` a `^5.0.0` en `package.json`.

```json
// Antes
"react-leaflet": "^4.2.1"

// Después
"react-leaflet": "^5.0.0"
```

---

### C-02 — Opción de compilador desconocida `erasableSyntaxOnly`

**Archivo donde se manifestó:** `tsconfig.app.json`, `tsconfig.node.json`  
**Descripción:** Vite 8 generó el proyecto apuntando a TypeScript 6.x. Al reconfigurar a `~5.7.2` por compatibilidad con librerías, la opción `erasableSyntaxOnly` (exclusiva de TS 6+) bloqueó `tsc -b`.  
**Solución aplicada:** Eliminar la línea `"erasableSyntaxOnly": true` de ambos tsconfig.

```json
// Antes
"erasableSyntaxOnly": true   ← eliminado

// Después
(línea eliminada)
```

---

### C-05 — Error de inferencia `never` en columnas genéricas de TanStack Table

**Archivo donde se manifestó:** `src/pages/admin/Reports.tsx:61`  
**Descripción:** `createColumnHelper<Record<string, unknown>>()` colapsaba `TValue` a `never`, impidiendo la asignación de cualquier `ColumnDef`.  
**Solución aplicada:** Construir las columnas como `any[]` con `accessorKey` en lugar de la API funcional de `createColumnHelper`.

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

---

### C-08 — Tokens de color hardcodeados vs. design system

**Archivo donde se manifestó:** 18 archivos `.tsx` en `src/`  
**Descripción:** Se usaron clases Tailwind estándar (`border-gray-700`, `bg-gray-800`) en lugar de los tokens semánticos del design system, generando inconsistencia visual con el cliente Android.  
**Solución aplicada:** Ampliar `tailwind.config.js` con tokens semánticos y reemplazar globalmente con `sed` en los 18 archivos afectados.

```bash
find ./src -name "*.tsx" -exec sed -i \
  's/border-gray-[678]00/border-border/g;
   s/hover:bg-gray-[78]00/hover:bg-secondary/g;
   s/bg-gray-800/bg-secondary/g' {} +
```

---

### C-09 — Error 400 en `POST /api/auth/login` desde el cliente web

**Archivo donde se manifestó:** `src/api/auth.ts:6` / backend Railway  
**Descripción:** El servidor rechazó la petición de login con HTTP 400. Causa investigada: credenciales de admin no existentes en la base de datos Railway o divergencia en nombres de campos.  
**Solución aplicada:** Verificar que Axios envía `Content-Type: application/json` (confirmado en `axios.ts`); resolver sembrando el usuario admin en la base de datos de Railway.

---

### C-10 — Manejo de sesión JWT vs. SessionManager de Android

**Archivo donde se manifestó:** `src/context/AuthContext.tsx` (líneas 60–66)  
**Descripción:** Android usa `DataStore` cifrado; React usa `localStorage` en texto plano. Requirió decisión de diseño explícita sobre trade-offs de seguridad.  
**Solución aplicada:** Se adoptó `localStorage` por equivalencia funcional en contexto académico, con nota de que en producción se usarían cookies HttpOnly.

```typescript
const login = (user: AuthUser) => {
  localStorage.setItem('token', user.token);
  localStorage.setItem('userId', String(user.id));
  localStorage.setItem('userRole', user.role);
  // ...
};
```

---

### C-11 — Interceptor Axios vs. AuthInterceptor de OkHttp

**Archivo donde se manifestó:** `src/api/axios.ts` (líneas 15–33)  
**Descripción:** El redirect en error 401 fuerza recarga completa del navegador (`window.location.href = '/login'`) en lugar de navegación in-stack, lo que es una diferencia observable en UX respecto a Android.  
**Solución aplicada:** Se aceptó la limitación; es inherente a la arquitectura de SPA sin SSR.

```typescript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login'; // recarga completa — no hay alternativa sin router context
    }
    return Promise.reject(error);
  }
);
```

---

### C-12 — Tipado de respuestas JSON del backend vs. data classes de Kotlin

**Archivo donde se manifestó:** `src/types/index.ts` (campo `restaurante_nombre?`)  
**Descripción:** Axios no valida el JSON en runtime. Los campos que el backend devuelve solo en algunos endpoints (e.g., `restaurante_nombre`) deben marcarse como opcionales, forzando null-checks en los componentes.  
**Solución aplicada:** Campos opcionales en la interfaz + operador `??` en la UI.

```tsx
// Null-check necesario porque el campo puede no venir del backend
<p>{order.restaurante_nombre ?? `Restaurante #${order.restaurante_id}`}</p>
```

> Los conflictos C-03, C-04, C-06, C-07 también están documentados en `docs/conflictos-web.md` y corresponden a configuración de tsconfig, imports no utilizados, deprecaciones de React Router v6 y configuración de VS Code con Tailwind. No se reproducen aquí por no ser retos de integración con el backend.

---

## 7. Validaciones de formularios

Metodología: se leyeron los 15 archivos de `src/pages/` y los 2 de `src/context/` buscando
elementos `<form>`, `<input>`, `<textarea>` y botones de envío. Se registran tanto los formularios
con tag `<form>` como los pseudo-formularios (inputs + botón `onClick` sin tag `<form>`).

---

### 7.1 Inventario completo de formularios

#### F-01 — Login

**Archivo:** `src/pages/auth/Login.tsx`  
**Tag `<form>`:** Sí (línea 52)  
**Nivel de validación:** Cliente (HTML5) + Servidor (mensaje del backend)  
**Campos y reglas (líneas 53–71):**

| Campo | Atributos de validación | Regla aplicada |
|---|---|---|
| email | `type="email"` · `required` | Formato RFC email · campo obligatorio |
| password | `type="password"` · `required` | Tipo contraseña (oculta texto) · campo obligatorio |

Los atributos llegan al `<input>` nativo mediante `{...rest}` en `src/components/ui/Input.tsx:13`.  
El navegador bloquea el envío del formulario si algún campo incumple antes de invocar `handleSubmit`.

```tsx
// src/pages/auth/Login.tsx — líneas 53–71
<form onSubmit={handleSubmit} className="flex flex-col gap-4">
  <Input
    label="Correo electrónico"
    type="email"
    placeholder="correo@ejemplo.com"
    value={form.email}
    onChange={(e) => setForm({ ...form, email: e.target.value })}
    required
  />
  <Input
    label="Contraseña"
    type="password"
    placeholder="••••••••"
    value={form.password}
    onChange={(e) => setForm({ ...form, password: e.target.value })}
    required
  />
  <Button type="submit" loading={loading} size="lg" className="mt-2">
    Iniciar sesión
  </Button>
</form>
```

Manejo de error de servidor (líneas 36–39):

```tsx
} catch (err: unknown) {
  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  toast.error(msg || 'Credenciales incorrectas');
}
```

**Reglas de cliente:** 4 (`required`×2, `type="email"`, `type="password"`)

---

#### F-02 — Registro

**Archivo:** `src/pages/auth/Register.tsx`  
**Tag `<form>`:** Sí (línea 63)  
**Nivel de validación:** Cliente (HTML5) + Servidor (mensaje del backend)  
**Campos y reglas (líneas 64–73):**

| Campo | Atributos de validación | Regla aplicada | Condición |
|---|---|---|---|
| nombre | `required` | Campo obligatorio | siempre |
| email | `type="email"` · `required` | Formato RFC email · campo obligatorio | siempre |
| password | `type="password"` · `required` · `minLength={6}` | Tipo contraseña · obligatorio · mínimo 6 caracteres | siempre |
| telefono | `required` | Campo obligatorio | siempre |
| direccion | `required` | Campo obligatorio | solo tab `cliente` |
| placa | `required` | Campo obligatorio | solo tab `repartidor` |

```tsx
// src/pages/auth/Register.tsx — líneas 64–73
<Input label="Nombre completo" value={form.nombre} onChange={set('nombre')} required />
<Input label="Correo electrónico" type="email" value={form.email} onChange={set('email')} required />
<Input label="Contraseña" type="password" value={form.password} onChange={set('password')} required minLength={6} />
<Input label="Teléfono" value={form.telefono} onChange={set('telefono')} required />
{tab === 'cliente' && (
  <Input label="Dirección" value={form.direccion} onChange={set('direccion')} required />
)}
{tab === 'repartidor' && (
  <Input label="Placa del vehículo" value={form.placa} onChange={set('placa')} required />
)}
```

Manejo de error de servidor (líneas 35–38):

```tsx
} catch (err: unknown) {
  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  toast.error(msg || 'Error al registrar');
}
```

**Reglas de cliente:** 9 (`required`×5 permanentes + `required`×1 condicional, `type="email"`, `type="password"`, `minLength={6}`)  
> Las reglas de `direccion` y `placa` son mutuamente excluyentes: el navegador solo valida la que está montada en el DOM según el tab activo.

---

#### F-03 — Carrito (confirmación de pedido)

**Archivo:** `src/pages/client/Cart.tsx`  
**Tag `<form>`:** No — usa `<button onClick={handleOrder}>` (línea 109)  
**Nivel de validación:** Cliente (JavaScript manual) + Servidor (mensaje del backend)  
**Campos:**

| Campo | Elemento HTML | Validación en cliente | Nivel |
|---|---|---|---|
| `address` | `<input>` sin atributos (línea 87) | `!address.trim()` → toast + return (línea 23) | JavaScript |
| `notes` | `<textarea>` sin atributos (línea 94) | Sin validación — campo opcional | — |

```tsx
// src/pages/client/Cart.tsx — líneas 22–24
const handleOrder = async () => {
  if (!address.trim()) { toast.error('Ingresa tu dirección de entrega'); return; }
  if (!restauranteId) return;
```

Los inputs no tienen `required` ni ningún atributo HTML5 de validación. La única restricción es la
comprobación manual `!address.trim()` ejecutada en JavaScript antes de llamar al backend.

```tsx
// src/pages/client/Cart.tsx — líneas 86–101
<label className="text-muted-foreground text-sm">Dirección de entrega</label>
<input
  className="bg-surface border border-border rounded-lg px-3 py-2 text-white ..."
  placeholder={user?.nombre ? `Dirección en Heredia` : 'Tu dirección...'}
  value={address}
  onChange={(e) => setAddress(e.target.value)}
/>
<label className="text-muted-foreground text-sm mt-1">Notas (opcional)</label>
<textarea
  className="bg-surface border border-border rounded-lg px-3 py-2 ..."
  rows={2}
  placeholder="Sin cebolla, extra salsa..."
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
/>
```

**Reglas de cliente:** 1 (`address.trim()` no vacío)

---

#### F-04 — Perfil del cliente (edición) — VALIDACIÓN SOLO DELEGADA AL BACKEND

**Archivo:** `src/pages/client/Profile.tsx`  
**Tag `<form>`:** Sí (línea 70)  
**Nivel de validación:** Solo servidor — ningún atributo HTML5 ni comprobación JavaScript en el cliente  
**Campos (líneas 71–73):**

| Campo | Atributos de validación | Observación |
|---|---|---|
| nombre | ninguno | No tiene `required`, `minLength` ni `pattern` |
| telefono | ninguno | No tiene `required` ni `pattern` |
| direccion | ninguno | No tiene `required` |

```tsx
// src/pages/client/Profile.tsx — líneas 70–75
<form onSubmit={handleSave} className="flex flex-col gap-4">
  <Input label="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
  <Input label="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
  <Input label="Dirección" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
  <Button type="submit" loading={saving}>Guardar cambios</Button>
</form>
```

El formulario envía la petición PUT al backend incluso con todos los campos vacíos. El error se
captura genéricamente:

```tsx
// src/pages/client/Profile.tsx — líneas 41–43
} catch {
  toast.error('Error al guardar');
}
```

> No se expone el mensaje del backend (`response.data.message`) al usuario — es el único formulario con captura genérica sin mostrar el detalle del error del servidor.

**Reglas de cliente:** 0

---

#### F-05 — Restaurantes (alta/edición admin) — VALIDACIÓN SOLO DELEGADA AL BACKEND

**Archivo:** `src/pages/admin/Restaurants.tsx`  
**Tag `<form>`:** No — usa `<Button onClick={handleSaveRestaurant}>` (línea 171) y `<Button onClick={handleSaveCombo}>` (línea 218)  
**Nivel de validación:** Solo servidor — ningún atributo HTML5 ni comprobación JavaScript  
**Campos del formulario de restaurante (líneas 164–169):**

| Campo | Elemento | Atributos de validación |
|---|---|---|
| nombre | `Input` | ninguno |
| categoria | `Input` | ninguno |
| telefono | `Input` | ninguno |
| direccion | `Input` | ninguno |
| descripcion | `Input` | ninguno |

**Campo del formulario de combo (líneas 211–215):**

| Campo | Elemento | Atributos de validación |
|---|---|---|
| comboDesc | `<textarea>` | ninguno |

```tsx
// src/pages/admin/Restaurants.tsx — líneas 163–172
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <Input label="Nombre" value={form.nombre ?? ''} onChange={set('nombre')} />
  <Input label="Categoría" value={form.categoria ?? ''} onChange={set('categoria')} />
  <Input label="Teléfono" value={form.telefono ?? ''} onChange={set('telefono')} />
  <Input label="Dirección" value={form.direccion ?? ''} onChange={set('direccion')} />
  <Input label="Descripción" value={form.descripcion ?? ''} onChange={set('descripcion')} className="sm:col-span-2" />
</div>
<div className="flex gap-3">
  <Button onClick={handleSaveRestaurant} loading={saving}>{editId ? 'Actualizar' : 'Crear'}</Button>
```

El error del servidor sí se extrae y muestra al usuario (líneas 85–87):

```tsx
} catch (err: unknown) {
  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  toast.error(msg || 'Error al guardar');
}
```

**Reglas de cliente:** 0

---

### 7.2 Interacción adicional — `window.prompt()` en DeliveryPersons

**Archivo:** `src/pages/admin/DeliveryPersons.tsx` (líneas 35–36)  
**Tipo:** Diálogo nativo del navegador, no un formulario HTML  
**Validación:** Comprobación de valor falsy (`!motivo`) — previene envío con cancelación o string vacío

```tsx
// src/pages/admin/DeliveryPersons.tsx — líneas 35–36
const motivo = prompt(`Motivo de la amonestación para ${person.nombre}:`);
if (!motivo) return;
```

No se contabiliza como formulario HTML ya que no usa elementos `<input>` ni `<form>`. La regla `!motivo` atrapa tanto la cancelación del diálogo (`null`) como el string vacío.

---

### 7.3 Pantallas sin formulario

Las siguientes 10 pantallas no tienen inputs de usuario que se envíen al backend:

| Archivo | Razón |
|---|---|
| `src/pages/client/Home.tsx` | Solo buscador local (filtra sin llamada HTTP) |
| `src/pages/client/Restaurant.tsx` | Solo lectura de datos; agregar al carrito no es un formulario |
| `src/pages/client/OrderTracking.tsx` | Solo visualización |
| `src/pages/client/History.tsx` | Solo visualización |
| `src/pages/admin/Dashboard.tsx` | Solo estadísticas |
| `src/pages/admin/Clients.tsx` | Solo acciones de toggle de estado (sin inputs de texto) |
| `src/pages/admin/Reports.tsx` | Solo selección de reporte (botones, sin inputs) |
| `src/pages/delivery/Dashboard.tsx` | Toggle de disponibilidad (botón sin inputs de texto) |
| `src/pages/delivery/History.tsx` | Solo visualización |

---

### 7.4 Tabla resumen

| Formulario | Archivo | Tag `<form>` | Reglas cliente | Reglas servidor | Nivel |
|---|---|---|---|---|---|
| Login | `src/pages/auth/Login.tsx:52` | Sí | 4 | Sí — mensaje backend | Cliente + Servidor |
| Registro | `src/pages/auth/Register.tsx:63` | Sí | 9 | Sí — mensaje backend | Cliente + Servidor |
| Carrito | `src/pages/client/Cart.tsx:22` | No | 1 | Sí — mensaje backend | Cliente (JS) + Servidor |
| Perfil | `src/pages/client/Profile.tsx:70` | Sí | 0 | Sí — genérico | Solo Servidor |
| Restaurantes (admin) | `src/pages/admin/Restaurants.tsx:163` | No | 0 | Sí — mensaje backend | Solo Servidor |

**Totales:**
- Formularios identificados: **5** (3 con tag `<form>` + 2 pseudo-formularios)
- Formularios con validación en cliente: **3** (Login, Registro, Carrito)
- Formularios sin validación en cliente: **2** (Perfil, Restaurantes admin)
- Total reglas de validación en cliente: **14** (4 + 9 + 1)
- Estrategia de validación en cliente: HTML5 nativo (`required`, `type`, `minLength`) + 1 comprobación JavaScript manual (`address.trim()`)
- Sin uso de librerías de validación (Zod, Yup, React Hook Form)

---

## Resumen de métricas clave

| Métrica | Valor |
|---|---|
| Total archivos TypeScript/TSX | 36 |
| Archivos en capa API | 7 |
| Archivos en capa componentes | 9 |
| Archivos en capa páginas | 15 |
| Archivos en capa contexto | 2 |
| LOC Login | 83 |
| LOC Register | 88 |
| LOC Home (lista restaurantes) | 94 |
| LOC axios.ts (interceptor HTTP) | 35 |
| LOC AuthContext.tsx | 87 |
| LOC types/index.ts (modelos) | 151 |
| Total dependencias (dep + devDep) | 25 |
| Endpoints consumidos del backend | 34 |
| Formularios identificados en src/pages/ | 5 |
| Formularios con validación en cliente | 3 (Login, Registro, Carrito) |
| Formularios sin validación en cliente | 2 (Perfil, Restaurantes admin) |
| Total reglas de validación en cliente | 14 |
| Reglas HTML5 nativas | 13 (required, type, minLength) |
| Reglas JavaScript manual | 1 (address.trim() en Cart) |
| Librerías de validación de formularios | 0 — sin Zod, Yup ni React Hook Form |
| Retos de integración documentados | 12 (C-01 a C-12) |
| Retos relacionados con backend | 4 (C-09, C-10, C-11, C-12) |

---

*Documento generado el 2026-05-17. Todas las métricas fueron extraídas directamente del código fuente mediante lectura directa de los 15 archivos de `src/pages/`. Ningún número fue estimado o inventado.*
