# Sistema de Simulacion de Movilidad Urbana

### Frontend - Sistema de Autenticacion Real (Acta 2)

---

## Descripcion

Esta acta documenta la implementacion del sistema de autenticacion real para el frontend del sistema de simulacion de movilidad urbana. Se reemplazo completamente la autenticacion mock existente por un flujo completo basado en JWT (JSON Web Tokens) con integracion al backend FastAPI.

El sistema implementado incluye: login real contra el backend, gestion de tokens JWT, proteccion de rutas, manejo centralizado de errores HTTP 401, validacion de formularios con Zod y persistencia de sesion entre recargas de pagina.

---

## Contexto - Estado Anterior (Acta 1)

En el Acta 1, el sistema de autenticacion presentaba las siguientes limitaciones:

- **Auth Store mock**: Creaba un usuario ficticio sin comunicarse con el backend
- **Login directo**: La pagina de login llamaba `http.post('/auth/login')` directamente y guardaba `user_role` y `user_id` en localStorage
- **Sin proteccion de rutas**: Todas las rutas eran accesibles sin autenticacion
- **Sin manejo de tokens**: No existia inyeccion de `Authorization: Bearer` en las peticiones HTTP
- **Sin manejo de 401**: Las respuestas no autorizadas no eran interceptadas
- **Sin validacion de formularios**: El login usaba `useState` sin validacion estructurada

---

## Enfoque Arquitectonico de la Solucion

Se implemento siguiendo principios de **Clean Code** y **SOLID** aplicados a frontend:

- **SRP (Responsabilidad Unica)**: Cada archivo tiene una sola responsabilidad (tipos, store, guards, servicios)
- **DIP (Inversion de Dependencias)**: El HTTP client no depende del store; el store registra un callback via `http.onUnauthorized()`
- **OCP (Abierto/Cerrado)**: Los route guards son extensibles sin modificar el router
- **Sin dependencias circulares**: Flujo unidireccional `store → http` (nunca al reves)
- **Separacion de capas**: UI (componentes) / Logica (store) / Datos (services) / Tipos (types)

---

## Estructura de Archivos - Cambios Realizados

### Archivos Creados

```
src/
├── shared/
│   └── types/
│       └── auth.types.ts              # NUEVO - Schema Zod + tipos de autenticacion
│
└── features/
    └── auth/
        └── components/                # NUEVO - Directorio de componentes auth
            ├── PrivateRoute.tsx        # NUEVO - Guard para rutas protegidas
            └── PublicRoute.tsx         # NUEVO - Guard para rutas publicas
```

### Archivos Modificados

```
src/
├── App.tsx                            # MODIFICADO - Inicializacion del auth store
├── app/
│   └── router.tsx                     # MODIFICADO - Rutas con guards PrivateRoute/PublicRoute
│
├── services/
│   ├── http.ts                        # MODIFICADO - Token injection + handler 401
│   └── endpoints/
│       └── auth.endpoints.ts          # MODIFICADO - Tipos compartidos
│
├── store/
│   └── authStore.ts                   # REESCRITO - Auth store real con JWT
│
├── features/
│   └── auth/
│       └── pages/
│           └── LoginPage.tsx          # REESCRITO - React Hook Form + Zod + auth store
│
├── layouts/
│   └── DashboardLayout.tsx            # MODIFICADO - Datos de usuario desde el store
│
└── shared/
    └── types/
        └── index.ts                   # MODIFICADO - Export de auth.types
```

### Estructura Actualizada del Proyecto (Post-Acta 2)

```
src/
├── app/
│   ├── providers/
│   │   └── index.tsx
│   └── router.tsx                     # Rutas con PrivateRoute/PublicRoute
│
├── features/
│   ├── auth/
│   │   ├── components/                # NUEVO
│   │   │   ├── PrivateRoute.tsx       # Guard de rutas protegidas (Outlet pattern)
│   │   │   └── PublicRoute.tsx        # Guard de rutas publicas (Outlet pattern)
│   │   └── pages/
│   │       └── LoginPage.tsx          # Login con React Hook Form + Zod
│   │
│   ├── users/
│   │   └── pages/
│   │       ├── UserPage.tsx
│   │       └── CreateUserSidesheet.tsx
│   │
│   └── simulation/
│       └── pages/
│           ├── SimulationPage.tsx
│           ├── SimulationMap.tsx
│           ├── ControlPanel.tsx
│           ├── StatsPanel.tsx
│           └── SimulationLoader.tsx
│
├── shared/
│   ├── types/
│   │   ├── auth.types.ts              # NUEVO - LoginCredentials, LoginResponse, loginSchema
│   │   ├── user.types.ts
│   │   ├── simulation.types.ts
│   │   ├── observation.types.ts
│   │   └── index.ts
│   ├── ui/ ...
│   ├── hooks/ ...
│   ├── constants/ ...
│   └── lib/ ...
│
├── services/
│   ├── http.ts                        # Cliente HTTP con Bearer token + handler 401
│   └── endpoints/
│       ├── auth.endpoints.ts          # Endpoints tipados: login, logout, me
│       ├── user.endpoints.ts
│       ├── simulation.endpoints.ts
│       └── observation.endpoints.ts
│
├── store/
│   ├── authStore.ts                   # Auth store real: initialize, login, logout, clearSession
│   └── simulationStore.ts
│
├── layouts/
│   └── DashboardLayout.tsx            # Lee usuario desde auth store
│
├── styles/ ...
├── App.tsx                            # Inicializa auth store al montar
└── main.tsx
```

---

## Flujos de Autenticacion Implementados

### Flujo de Inicio de Sesion (Login)

```
Usuario ingresa credenciales
   |
   v
React Hook Form valida con Zod
   |  (si invalido: muestra errores inline)
   v
authStore.login(credentials)
   |
   v
POST /auth/login  →  { access_token, token_type }
   |
   v
Guarda token en localStorage (clave: "auth_token")
   |
   v
GET /auth/me  →  { id, nombre_completo, email, rol_id }
   |
   v
Store: isAuthenticated = true, user = datos
   |
   v
PublicRoute detecta cambio  →  Navigate to /dashboard
```

### Flujo de Inicializacion (App Mount)

```
App.tsx monta
   |
   v
useEffect → authStore.initialize()
   |
   v
Registra handler 401 en HttpClient
   |
   v
Lee localStorage("auth_token")
   |
   ├── Sin token → isLoading = false → PublicRoute muestra login
   |
   └── Con token → GET /auth/me
                       |
                       ├── 200 OK → user + isAuthenticated = true → PrivateRoute permite acceso
                       |
                       └── 401/Error → removeItem token → isLoading = false → redirige a login
```

### Flujo de Cierre de Sesion (Logout)

```
Usuario hace clic en "Cerrar Sesion"
   |
   v
authStore.logout()
   |
   v
POST /auth/logout (notifica al backend)
   |
   v
clearSession()
   |
   v
localStorage.removeItem("auth_token")
localStorage.removeItem("user_role")    ← limpieza de claves legacy
localStorage.removeItem("user_id")      ← limpieza de claves legacy
   |
   v
Store: user = null, isAuthenticated = false
   |
   v
PrivateRoute detecta cambio → Navigate to /login
```

### Flujo de Sesion Expirada (401 Automatico)

```
Cualquier peticion HTTP autenticada
   |
   v
HttpClient envia Authorization: Bearer <token>
   |
   v
Backend responde 401 (token expirado/invalido)
   |
   v
HttpClient detecta: status === 401 AND token existia
   |
   v
Llama unauthorizedHandler → authStore.clearSession()
   |  (NO llama POST /auth/logout → evita loop infinito)
   v
Store: isAuthenticated = false
   |
   v
PrivateRoute redirige a /login automaticamente
```

---

## Detalle de Implementacion por Archivo

### auth.types.ts - Tipos de Autenticacion

Define los contratos de datos para el sistema de autenticacion:

- **loginSchema**: Esquema Zod con validaciones:
  - `email`: string, formato email valido (`"Correo electronico invalido"`)
  - `password`: string, minimo 1 caracter (`"La contrasena es requerida"`)
- **LoginCredentials**: Tipo inferido del schema Zod (email + password)
- **LoginResponse**: Respuesta del backend con `access_token` y `token_type`

---

### http.ts - Cliente HTTP con Autenticacion

Se extendio el cliente HTTP existente con 3 capacidades nuevas:

#### 1. Constante AUTH_TOKEN_KEY

```ts
export const AUTH_TOKEN_KEY = 'auth_token'
```

Exportada para que el auth store use la misma clave, evitando strings magicos duplicados.

#### 2. Inyeccion Automatica de Token

El metodo `buildHeaders()` lee el token de localStorage y agrega el header:

```
Authorization: Bearer <token>
```

en todas las peticiones HTTP automaticamente. Si no hay token, el header no se agrega.

#### 3. Handler de 401 No Autorizado

- Metodo publico `onUnauthorized(handler)` permite registrar un callback
- En el metodo `request()`, si la respuesta es 401 **Y** habia un token presente al momento de la peticion, se ejecuta el callback
- La condicion "token presente" es critica: evita que un 401 en el endpoint de login (credenciales incorrectas) dispare la limpieza de sesion

#### Metodos Helper Agregados

- `buildUrl(endpoint, params)`: Construye la URL con query params
- `buildHeaders(customHeaders)`: Construye headers con Content-Type + Authorization
- `getAuthToken()`: Lee el token de localStorage

---

### authStore.ts - Store de Autenticacion (Zustand)

Reescritura completa del store. Interfaz:

```ts
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  initialize: () => Promise<void>
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  clearSession: () => void
  clearError: () => void
}
```

#### Estado Inicial

| Campo | Valor | Razon |
|-------|-------|-------|
| `user` | `null` | Sin usuario hasta verificar |
| `isAuthenticated` | `false` | No autenticado por defecto |
| `isLoading` | `true` | **Critico**: previene flash de login antes de verificar token existente |
| `error` | `null` | Sin errores iniciales |

#### Acciones

| Accion | Responsabilidad |
|--------|----------------|
| `initialize()` | Registra handler 401, verifica token existente via GET /auth/me |
| `login(credentials)` | POST /auth/login → guarda token → GET /auth/me → establece sesion |
| `logout()` | POST /auth/logout → clearSession() |
| `clearSession()` | Limpia localStorage + resetea estado (para 401 handler, sin llamada API) |
| `clearError()` | Limpia el mensaje de error |

#### Separacion clearSession vs logout

| | `logout()` | `clearSession()` |
|--|-----------|------------------|
| Llama API | Si (POST /auth/logout) | No |
| Limpia estado | Si (via clearSession) | Si |
| Usado por | Boton "Cerrar Sesion" | Handler 401 del HttpClient |
| Razon | Notificar al backend | Evitar loop infinito (401 → logout → 401 → ...) |

#### Funcion Helper

```ts
function extractErrorMessage(data: unknown): string
```

Parsea errores del backend FastAPI (formato `{ detail: string }`) de forma segura sin usar `any`.

---

### PrivateRoute.tsx - Guard de Rutas Protegidas

Componente que protege rutas que requieren autenticacion:

- **Patron**: Layout Route con `<Outlet />` (React Router DOM 6)
- **isLoading = true**: Muestra spinner centrado (Loader2 de lucide-react)
- **isAuthenticated = false**: Redirige a `/login` con `<Navigate replace />`
- **isAuthenticated = true**: Renderiza `<Outlet />` (rutas hijas)

#### Uso en el Router

```tsx
<Route element={<PrivateRoute />}>
  <Route path="/dashboard" element={...} />
  <Route path="/users" element={...} />
  <Route path="/simulation" element={...} />
</Route>
```

---

### PublicRoute.tsx - Guard de Rutas Publicas

Componente inverso al PrivateRoute:

- **isLoading = true**: Muestra spinner centrado
- **isAuthenticated = true**: Redirige a `/dashboard` (usuario ya logueado)
- **isAuthenticated = false**: Renderiza `<Outlet />` (muestra login)

#### Uso en el Router

```tsx
<Route element={<PublicRoute />}>
  <Route path="/login" element={<LoginPage />} />
</Route>
```

---

### LoginPage.tsx - Pagina de Login (Reescrita)

Se reemplazo el manejo de formulario manual con React Hook Form + Zod:

#### Antes (Acta 1)

- 4 estados con `useState` (email, password, isLoading, error)
- Llamada directa a `http.post('/auth/login')`
- Navegacion manual con `useNavigate`
- Sin validacion estructurada

#### Despues (Acta 2)

- `useForm<LoginCredentials>` con `zodResolver(loginSchema)`
- Estado de carga y error desde `useAuthStore`
- `onSubmit` simplificado: `await login(credentials)`
- Navegacion automatica via PublicRoute
- Errores de validacion inline bajo cada campo
- Errores del servidor en alerta superior

#### Integracion con React Hook Form

| Campo | Registro | Validacion Zod |
|-------|----------|----------------|
| Email | `{...register('email')}` | `z.string().email()` |
| Password | `{...register('password')}` | `z.string().min(1)` |

- `noValidate` en el `<form>` desactiva la validacion nativa del navegador
- La visibilidad de contrasena (`showPassword`) se mantiene como `useState` local (es estado de UI puro)
- El diseno visual se preservo identico al original

---

### router.tsx - Sistema de Rutas Actualizado

Se reorganizo el router para usar layout routes con guards:

#### Estructura de Rutas

| Ruta | Guard | Layout | Componente |
|------|-------|--------|------------|
| `/login` | PublicRoute | Ninguno | LoginPage |
| `/dashboard` | PrivateRoute | DashboardLayout | Resumen del Sistema |
| `/users` | PrivateRoute | DashboardLayout | UserPage |
| `/simulation` | PrivateRoute | DashboardLayout | SimulationPage |
| `/` (index) | Ninguno | - | Redirect a /login |
| `*` (catch-all) | Ninguno | - | Redirect a /login |

Las rutas catch-all (`index` y `*`) estan fuera de ambos guards para redirigir siempre a `/login`. Si el usuario ya esta autenticado, PublicRoute lo redirige automaticamente a `/dashboard`.

---

### App.tsx - Inicializacion

Se agrego la llamada a `initialize()` del auth store en el `useEffect` del componente raiz:

```
App monta → useEffect → initialize()
  → Registra handler 401 en HttpClient
  → Verifica token existente en localStorage
  → Si hay token: GET /auth/me para restaurar sesion
  → Si no hay token: isLoading = false
```

El selector `(s) => s.initialize` asegura que el componente no se re-renderice por cambios de estado no relacionados.

---

### DashboardLayout.tsx - Layout con Auth Store

Se reemplazo el acceso directo a localStorage por el auth store:

#### Antes (Acta 1)

```ts
const userRole = localStorage.getItem('user_role') ?? '5'
const roleName = ROLE_NAMES[userRole] ?? 'Operador'
const initials = roleName.slice(0, 2).toUpperCase()
// Logout: http.post('/auth/logout') + localStorage.clear()
```

#### Despues (Acta 2)

```ts
const user = useAuthStore((s) => s.user)
const logout = useAuthStore((s) => s.logout)
const roleName = user ? ROLE_NAMES[user.rol_id] : 'Operador'
const initials = user ? getInitials(user.nombre_completo) : 'OP'
const displayName = user?.nombre_completo ?? 'Terminal_01'
// Logout: await logout() + navigate('/login')
```

Cambios adicionales:

- `ROLE_NAMES` cambiado de `Record<string, string>` a `Record<number, string>` (claves numericas)
- Funcion `getInitials(name)` para extraer iniciales del nombre real del usuario
- El header muestra el nombre real del usuario autenticado en lugar de "Terminal_01"
- El avatar usa `user.rol_id` para determinar la clase CSS de color

---

### auth.endpoints.ts - Endpoints Tipados

Se actualizaron los tipos para usar las definiciones compartidas:

| Endpoint | Metodo | Tipo Request | Tipo Response |
|----------|--------|-------------|---------------|
| `/auth/login` | POST | `LoginCredentials` | `LoginResponse` |
| `/auth/logout` | POST | - | - |
| `/auth/me` | GET | - | `User` |

Se reemplazaron las interfaces locales `LoginRequest` y `LoginResponse` por los tipos compartidos de `@/shared/types/auth.types`.

---

## Consideraciones Tecnicas

### Sin Dependencias Circulares

```
auth.types.ts ← authStore.ts ← PrivateRoute/PublicRoute ← router.tsx
                     ↓
                  http.ts (registra callback, NO importa del store)
```

El HTTP client es independiente: lee el token directamente de `localStorage` y usa un patron callback (`onUnauthorized`) para notificar al store sin importarlo.

---

### Prevencion de Flash de Login

El estado `isLoading` inicia en `true`. Esto asegura que:

1. Al montar la app, ambos guards muestran spinner (no el login)
2. `initialize()` verifica si hay un token valido
3. Solo despues de la verificacion se muestra login o dashboard

Sin este comportamiento, un usuario con sesion activa veria un parpadeo del login antes de ser redirigido.

---

### Proteccion contra 401 en Login

El handler 401 solo se activa cuando:
- La respuesta HTTP es 401 **Y**
- Habia un token presente al momento de hacer la peticion

Esto evita que un 401 por credenciales incorrectas en POST /auth/login dispare la limpieza de sesion (ya que en ese momento no hay token en localStorage).

---

### Limpieza de Claves Legacy

La funcion `clearSession()` elimina no solo `auth_token` sino tambien las claves legacy del Acta 1:

```ts
localStorage.removeItem('auth_token')
localStorage.removeItem('user_role')    // legacy Acta 1
localStorage.removeItem('user_id')      // legacy Acta 1
```

Esto previene datos huerfanos en el navegador de usuarios que migren entre versiones.

---

### Validacion con Zod + React Hook Form

Se utiliza el patron `zodResolver` para integrar validacion declarativa con el manejo de formularios:

- **Zod** define las reglas de validacion como un schema reutilizable
- **React Hook Form** maneja el estado del formulario sin re-renders innecesarios
- **zodResolver** conecta ambas librerias automaticamente
- Los tipos se infieren del schema (`z.infer<typeof loginSchema>`) eliminando duplicacion

---

### Selectores Zustand para Performance

Se utilizan selectores granulares en lugar de destructuring del store completo:

```ts
// En PrivateRoute/PublicRoute (renderizan frecuentemente):
const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
const isLoading = useAuthStore((s) => s.isLoading)

// En DashboardLayout:
const user = useAuthStore((s) => s.user)
const logout = useAuthStore((s) => s.logout)
```

Esto asegura que cada componente solo se re-renderice cuando cambian los valores que consume, no ante cualquier cambio del store.

---

## Estado Actual (Post-Acta 2)

- [x] Arquitectura modular por features implementada
- [x] **Sistema de autenticacion real con JWT** ← NUEVO
- [x] **Proteccion de rutas (PrivateRoute/PublicRoute)** ← NUEVO
- [x] **Inyeccion automatica de Bearer token** ← NUEVO
- [x] **Manejo centralizado de errores 401** ← NUEVO
- [x] **Validacion de login con Zod + React Hook Form** ← NUEVO
- [x] **Persistencia de sesion entre recargas** ← NUEVO
- [x] CRUD completo de usuarios/operadores con edicion inline
- [x] Sistema de roles con 5 niveles de acceso
- [x] Modulo de simulacion con visualizacion geoespacial
- [x] Mapa interactivo de Cali con Leaflet + GeoJSON
- [x] Panel de control de simulacion (play/pause/reset/step)
- [x] Metricas en tiempo real con graficas de Recharts
- [x] Layout Dashboard con sidebar navegable
- [x] Cliente HTTP con tipado completo y autenticacion
- [x] Store de simulacion con loop automatico
- [x] Libreria de componentes UI compartidos (10 componentes)
- [x] Tipos TypeScript para User, Simulation, Observation, Auth
- [x] Endpoints tipados para 4 modulos (auth, users, simulations, observations)

---

## Proximos Pasos

- Implementacion de control de acceso por roles (RBAC) en el frontend
- Refresh token automatico (silent refresh antes de expiracion)
- Modulo visual de Observaciones (formulario georeferenciado)
- Pagina de Cartografia con mapa de calor (heatmap)
- Pagina de Reportes con exportacion de datos
- Pagina de Auditoria con logs del sistema
- Dashboard ejecutivo con metricas agregadas
- Comparador de escenarios de simulacion
- Editor visual de reglas del automata celular
- Historial de simulaciones ejecutadas
- Notificaciones en tiempo real con WebSocket
- Responsive design para dispositivos moviles

---

## Justificacion de Decisiones Tecnicas

### Zustand sobre Redux para Auth

- Estado de autenticacion es simple (user, token, flags)
- Zustand permite logica asincrona directa sin middleware (thunks, sagas)
- Selectores nativos para optimizar re-renders
- Integracion directa con el HTTP client via callback pattern

### Layout Routes sobre HOC Wrapper

- El patron `<Route element={<PrivateRoute />}>` con `<Outlet />` es la forma idiomatica de React Router 6
- Evita prop drilling de `children`
- Permite anidar multiples rutas protegidas bajo un solo guard
- Mas legible y mantenible que envolver cada ruta individualmente

### Zod sobre validacion manual

- Schema declarativo y reutilizable
- Inferencia de tipos automatica (`z.infer`)
- Mensajes de error en espanol configurables por campo
- Integracion nativa con React Hook Form via `zodResolver`

### clearSession separado de logout

- Evita loop infinito: `401 → logout() → POST /auth/logout → 401 → ...`
- Principio de responsabilidad unica: logout = API + limpieza, clearSession = solo limpieza
- El 401 handler nunca debe hacer llamadas API (podrian fallar con el mismo 401)

### Token en localStorage (no cookies httpOnly)

- Compatible con SPAs que necesitan enviar el token en headers
- El backend FastAPI espera `Authorization: Bearer` no cookies
- La alternativa (cookies httpOnly) requiere configuracion CORS especifica del backend
- Para este contexto academico, localStorage es suficiente

---

## Autor

Proyecto desarrollado como parte de trabajo de grado en Ingenieria de Sistemas - Universidad Autonoma de Occidente, Cali, Colombia.
