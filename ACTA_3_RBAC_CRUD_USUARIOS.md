# Sistema de Simulacion de Movilidad Urbana

### Frontend - Control de Acceso por Roles (RBAC) + CRUD Completo de Usuarios (Acta 3)

---

## Descripcion

Esta acta documenta la implementacion del sistema de Control de Acceso Basado en Roles (RBAC) y la reescritura completa del modulo CRUD de usuarios para el frontend del sistema SIMCORE. Se implemento un sistema de permisos granular con 5 niveles de rol, filtrado dinamico de la interfaz segun el rol del usuario autenticado, y un CRUD completo con validacion Zod, actualizaciones optimistas, notificaciones toast (Sonner), y vista responsiva para dispositivos moviles.

El sistema incluye: hook `usePermissions()` para consulta declarativa de permisos, componente `<PermissionGate>` para proteccion visual de secciones, componente `<AccessDenied>` para feedback de acceso restringido, sidebar filtrado por roles, CRUD de usuarios con toggle de estado activo/inactivo, formulario de creacion con React Hook Form + Zod, actualizaciones optimistas con rollback automatico, y diseño responsivo con cards para movil.

---

## Contexto - Estado Anterior (Acta 2)

En el Acta 2, el sistema presentaba las siguientes limitaciones respecto a RBAC y gestion de usuarios:

- **Sin sistema de permisos**: Todos los usuarios autenticados veian las mismas opciones del sidebar
- **Sin filtrado por roles**: No existia restriccion de acceso a secciones segun el rol del usuario
- **CRUD basico**: UserPage usaba `http` directamente, sin endpoints centralizados, sin toasts, sin toggle de estado
- **Sin validacion en creacion**: CreateUserSidesheet usaba `useState` sin validacion estructurada
- **Sin feedback visual**: Operaciones exitosas/fallidas no tenian notificaciones para el usuario
- **Sin responsive**: La tabla de usuarios no se adaptaba a dispositivos moviles
- **Sin actualizaciones optimistas**: Cada operacion esperaba la respuesta del servidor antes de actualizar la UI
- **Tipo User incompleto**: No incluia campo `activo` para estado del usuario

---

## Enfoque Arquitectonico de la Solucion

Se implemento siguiendo principios de **Clean Code** y **SOLID** aplicados a frontend:

- **SRP (Responsabilidad Unica)**: `usePermissions` solo consulta permisos, `PermissionGate` solo controla visibilidad, `AccessDenied` solo muestra feedback
- **OCP (Abierto/Cerrado)**: El sidebar es extensible — agregar un item solo requiere anadir un objeto al array `menuItems` con su campo `roles`
- **DIP (Inversion de Dependencias)**: UserPage consume `userEndpoints` (capa de servicio) en lugar de `http` directamente
- **ISP (Segregacion de Interfaces)**: `usePermissions` expone metodos granulares (`hasRole`, `hasMinRole`, permisos especificos) en lugar de un objeto monolitico
- **Composicion sobre herencia**: `PermissionGate` envuelve children con un patron declarativo, no requiere herencia de componentes

---

## Jerarquia de Roles

| Nivel | Enum | Nombre | Peso | Acceso |
|-------|------|--------|------|--------|
| 1 | `ADMIN` | Administrador | 100 | Acceso total: Panel, Operadores, Simulaciones, Cartografia, Reportes, Auditoria |
| 2 | `COORDINATOR` | Coordinador Tecnico | 80 | Panel, Operadores, Simulaciones, Cartografia, Reportes, Auditoria |
| 3 | `TECHNICIAN` | Equipo Tecnico | 60 | Panel, Simulaciones, Cartografia, Reportes |
| 4 | `FOUNDATION_HEAD` | Jefe de Fundacion | 40 | Panel, Cartografia, Reportes |
| 5 | `FIELD_WORKER` | Trabajador de Campo | 20 | Panel, Cartografia |

---

## Estructura de Archivos - Cambios Realizados

### Archivos Creados

```
src/
├── shared/
│   └── hooks/
│       └── usePermissions.ts              # NUEVO - Hook de permisos RBAC
│
└── features/
    └── auth/
        └── components/
            ├── PermissionGate.tsx          # NUEVO - Gate declarativo de permisos
            └── AccessDenied.tsx            # NUEVO - Pagina de acceso restringido
```

### Archivos Modificados

```
src/
├── App.tsx                                # MODIFICADO - Sonner <Toaster /> agregado
├── app/
│   └── router.tsx                         # MODIFICADO - PermissionGate en /users
│
├── shared/
│   ├── types/
│   │   └── user.types.ts                  # MODIFICADO - Campo activo, eliminado UserStatus
│   └── hooks/
│       └── index.ts                       # MODIFICADO - Export de usePermissions
│
├── features/
│   ├── auth/
│   │   └── components/
│   │       └── PrivateRoute.tsx           # MODIFICADO - Prop requiredRoles opcional
│   └── users/
│       └── pages/
│           ├── UserPage.tsx               # REESCRITO - CRUD completo con toasts + optimistic
│           └── CreateUserSidesheet.tsx     # REESCRITO - React Hook Form + Zod
│
├── services/
│   └── endpoints/
│       └── user.endpoints.ts              # MODIFICADO - Metodos delete + create corregido
│
├── layouts/
│   └── DashboardLayout.tsx                # MODIFICADO - Sidebar filtrado por roles
│
└── styles/
    └── pages/
        └── users.css                      # MODIFICADO - Status pills, responsive cards, access denied
```

---

## Detalle de Implementacion por Archivo

### 1. `src/shared/hooks/usePermissions.ts` (NUEVO)

Hook personalizado que encapsula toda la logica de permisos RBAC.

**Caracteristicas:**
- Lee el rol actual del usuario desde `authStore`
- Define jerarquia de roles con pesos numericos para comparacion
- Expone `hasRole(...roles)` para verificacion exacta de roles
- Expone `hasMinRole(role)` para verificacion jerarquica (rol minimo)
- Expone permisos pre-calculados: `canManageUsers`, `canViewSimulations`, `canViewReports`, `canViewAudit`, `canViewMaps`

**Jerarquia de pesos:**
```
ADMIN=100, COORDINATOR=80, TECHNICIAN=60, FOUNDATION_HEAD=40, FIELD_WORKER=20
```

**Uso:**
```tsx
const { canManageUsers, hasRole, currentRole } = usePermissions()
if (canManageUsers) { /* mostrar seccion admin */ }
```

### 2. `src/features/auth/components/PermissionGate.tsx` (NUEVO)

Componente declarativo que controla la visibilidad de secciones segun roles permitidos.

**Props:**
- `allowedRoles: UserRole[]` — Roles que pueden ver el contenido
- `children: ReactNode` — Contenido protegido
- `fallback?: ReactNode` — Contenido alternativo (por defecto: `<AccessDenied />`)

**Uso en router.tsx:**
```tsx
<PermissionGate allowedRoles={[UserRole.ADMIN, UserRole.COORDINATOR]}>
  <UserPage />
</PermissionGate>
```

### 3. `src/features/auth/components/AccessDenied.tsx` (NUEVO)

Componente visual para indicar acceso restringido con:
- Icono `ShieldOff` centrado en caja con fondo de error
- Titulo "Acceso Restringido"
- Mensaje descriptivo con instrucciones
- Boton "Volver al Panel" que navega a `/dashboard`

### 4. `src/shared/types/user.types.ts` (MODIFICADO)

**Cambios:**
- Eliminado `enum UserStatus` (ya no se usa, el backend maneja booleano)
- Eliminado `status?: UserStatus` del `interface User`
- Agregado `activo?: boolean` al `interface User`

**Tipo actualizado:**
```ts
export interface User {
  id: number
  nombre_completo: string
  email: string
  rol_id: UserRole
  activo?: boolean  // NUEVO - estado activo/inactivo
}
```

### 5. `src/features/auth/components/PrivateRoute.tsx` (MODIFICADO)

**Cambios:**
- Agregado prop opcional `requiredRoles?: UserRole[]`
- Si se proporcionan roles y el usuario no tiene uno de ellos, muestra `<AccessDenied />`
- Mantiene comportamiento original: redirige a login si no autenticado, spinner durante carga

### 6. `src/layouts/DashboardLayout.tsx` (MODIFICADO)

**Cambios:**
- Importa `usePermissions` y `UserRole`
- Cada item del sidebar ahora tiene campo `roles: UserRole[]` que define que roles pueden verlo
- El sidebar filtra `menuItems` usando `currentRole` antes de renderizar
- Los items se agrupan por seccion despues del filtrado

**Ejemplo de menuItem:**
```ts
{
  path: '/users',
  icon: Users,
  label: 'Operadores',
  section: 'PRINCIPAL',
  roles: [UserRole.ADMIN, UserRole.COORDINATOR],
}
```

### 7. `src/app/router.tsx` (MODIFICADO)

**Cambios:**
- Importa `PermissionGate` y `UserRole`
- La ruta `/users` envuelve `<UserPage />` con `<PermissionGate allowedRoles={[ADMIN, COORDINATOR]}>` dentro del `<DashboardLayout>`, de modo que el sidebar permanece visible pero el contenido muestra acceso denegado

### 8. `src/App.tsx` (MODIFICADO)

**Cambios:**
- Importa `Toaster` de `sonner`
- Agrega `<Toaster position="top-right" richColors closeButton />` dentro del `<BrowserRouter>`
- Configura `fontFamily: var(--font-sans)` para los toasts

### 9. `src/features/users/pages/UserPage.tsx` (REESCRITO)

Reescritura completa con las siguientes mejoras:

**Endpoints centralizados:**
- Reemplaza `http.get/post/patch/delete` directos por `userEndpoints.getAll()`, `userEndpoints.update()`, `userEndpoints.delete()`, `userEndpoints.toggleStatus()`

**ConfirmModal unificado:**
- Un solo componente modal maneja tanto eliminacion como toggle de estado
- Usa tipo discriminado: `{ type: 'delete'; user: User } | { type: 'toggle'; user: User }`
- Icono y texto cambian segun el tipo de accion
- Variante de eliminacion: icono rojo con AlertTriangle
- Variante de toggle: icono ambar con Power

**Actualizaciones optimistas con rollback:**
```
handleSaveEdit:
  1. Guardar copia del usuario anterior
  2. Actualizar estado local inmediatamente
  3. Llamar API
  4. Si falla: restaurar copia + toast.error()
  5. Si exito: toast.success()

handleDelete:
  1. Guardar copia de la lista completa
  2. Filtrar usuario de la lista local
  3. Llamar API
  4. Si falla: restaurar lista + toast.error()
  5. Si exito: toast.success()

handleToggleStatus:
  1. Guardar copia de la lista completa
  2. Toggle del campo activo localmente
  3. Llamar API
  4. Si falla: restaurar lista + toast.error()
  5. Si exito: toast.success() con mensaje contextual
```

**Status pill:**
- Nuevo indicador visual de estado activo/inactivo
- Dot animado verde para activos, gris para inactivos
- Columna "Estado" agregada a la tabla

**Toggle de estado:**
- Boton Power en columna de acciones
- Abre ConfirmModal con mensaje contextual segun estado actual
- Llama a `PATCH /users/{id}/toggle-status`

**Stats actualizados:**
- Reemplaza "Coordinadores" por "Activos" con icono Power y color verde
- Mantiene: Total operadores, Administradores, Campo

**Vista responsiva (mobile cards):**
- Tabla visible solo en desktop (`desktop-only`)
- Cards apiladas visibles solo en movil (`mobile-only`)
- Cada card muestra: avatar, nombre, email, status pill, ID, rol tag, botones de accion
- Breakpoint: 768px

### 10. `src/features/users/pages/CreateUserSidesheet.tsx` (REESCRITO)

Reescritura completa con React Hook Form + Zod:

**Schema de validacion:**
```ts
const createUserSchema = z.object({
  nombre_completo: z.string().min(3, 'Minimo 3 caracteres'),
  email: z.string().email('Correo electronico invalido'),
  password: z.string()
    .min(8, 'Minimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir al menos una mayuscula')
    .regex(/[0-9]/, 'Debe incluir al menos un numero'),
  rol_id: z.coerce.number().min(1).max(5),
})
```

**Cambios:**
- Reemplaza `useState` para cada campo por `useForm()` con `zodResolver(createUserSchema)`
- Usa `register()` en cada input para binding automatico
- Errores inline bajo cada campo via `errors.fieldName.message`
- `isSubmitting` del formulario reemplaza `isLoading` manual
- `reset()` limpia el formulario al cerrar o al crear exitosamente
- Toast de exito/error reemplaza `console.error` silencioso
- Consume `userEndpoints.create()` en lugar de `http.post()` directamente
- Mantiene indicador de fortaleza de contrasena con `watch('password')`

### 11. `src/services/endpoints/user.endpoints.ts` (MODIFICADO)

**Cambios:**
- `create()` corregido de `POST /users` a `POST /auth/register` (endpoint real del backend)
- Agregado `delete(id)` → `DELETE /users/{id}`

### 12. `src/styles/pages/users.css` (MODIFICADO)

**Estilos agregados:**

- **Status pill**: `.status-pill`, `.status-dot`, `.status-active`, `.status-inactive` — indicador visual de estado con dot animado
- **Toggle button**: `.icon-btn.toggle:hover` — variante ambar para boton de activar/desactivar
- **Field error**: `.sheet-field-error` — texto de error inline para formularios del sidesheet
- **Access denied**: `.access-denied`, `.access-denied-icon`, `.access-denied-title`, `.access-denied-subtitle`, `.access-denied-btn` — pagina completa de acceso restringido
- **Modal confirm**: `.modal-icon-warning`, `.modal-btn-confirm` — variante ambar del modal para toggle de estado
- **Responsive (768px)**: Media query con ajustes para `.page-wrapper`, `.page-header`, `.page-title`, `.stats-row` (grid 2 columnas), `.desktop-only`/`.mobile-only`, `.user-cards`, `.user-card`, `.user-card-header`, `.user-card-body`, `.user-card-field`, `.user-card-label`, `.user-card-actions`

---

## Flujos Implementados

### Flujo de Verificacion de Permisos (RBAC)

```
Usuario autenticado accede a una ruta
   |
   v
PrivateRoute: isAuthenticated?
   |  (si no: Navigate to /login)
   v
DashboardLayout: filtra menuItems por currentRole
   |  (solo muestra opciones permitidas en sidebar)
   v
PermissionGate: hasRole(allowedRoles)?
   |  (si no: muestra <AccessDenied />)
   v
Contenido de la pagina se renderiza
```

### Flujo de Toggle de Estado (Activar/Desactivar)

```
Admin hace click en boton Power (icono)
   |
   v
Se abre ConfirmModal tipo 'toggle'
   |  (mensaje contextual segun estado actual)
   v
Usuario confirma accion
   |
   v
Optimistic update: toggle activo localmente
   |
   v
PATCH /users/{id}/toggle-status
   |
   |-- Si OK: toast.success("Nombre fue desactivado/reactivado")
   |
   |-- Si error: rollback al estado anterior + toast.error()
```

### Flujo de Eliminacion de Usuario

```
Admin hace click en boton Trash (icono)
   |
   v
Se abre ConfirmModal tipo 'delete'
   |  ("Esta accion no se puede deshacer")
   v
Usuario confirma accion
   |
   v
Optimistic update: remover usuario de la lista
   |
   v
DELETE /users/{id}
   |
   |-- Si OK: toast.success("Nombre fue eliminado del sistema")
   |
   |-- Si error: rollback a la lista anterior + toast.error()
```

### Flujo de Edicion Inline

```
Admin hace click en boton Edit (MoreVertical)
   |
   v
Fila entra en modo edicion (inputs inline)
   |  (nombre + select de rol editables)
   v
Admin hace click en Check (guardar)
   |
   v
Optimistic update: aplicar cambios localmente
   |
   v
PATCH /users/{id} con datos editados
   |
   |-- Si OK: toast.success("Operador actualizado correctamente")
   |
   |-- Si error: rollback al usuario anterior + toast.error()
```

### Flujo de Creacion de Usuario

```
Admin hace click en "Registrar Operador"
   |
   v
Se abre CreateUserSidesheet (animado con Framer Motion)
   |
   v
Usuario llena formulario
   |
   v
React Hook Form valida con Zod al submit
   |  (si invalido: errores inline bajo cada campo)
   v
POST /auth/register con datos del formulario
   |
   |-- Si OK: toast.success + reset() + onSuccess() + onClose()
   |
   |-- Si error: toast.error con detalle del backend
```

---

## Patron de Actualizaciones Optimistas

Todas las operaciones de mutacion (edit, delete, toggle) siguen el mismo patron:

```ts
// 1. Guardar estado anterior (snapshot)
const prevUsers = [...users]

// 2. Aplicar cambio inmediatamente (UI responsiva)
setUsers(nuevoEstado)

// 3. Cerrar modal si aplica
setConfirmAction(null)

// 4. Llamar API
const response = await userEndpoints.operacion(...)

// 5a. Si exito: notificar
if (response.ok) toast.success(mensaje)

// 5b. Si falla: rollback + notificar
else { setUsers(prevUsers); toast.error(mensajeError) }
```

**Ventajas:**
- La UI responde inmediatamente sin esperar al servidor
- En caso de error, el estado se restaura automaticamente
- El usuario recibe feedback visual inmediato (toast) en ambos escenarios

---

## Configuracion de Sonner (Toast Notifications)

```tsx
// App.tsx
<Toaster
  position="top-right"
  richColors
  closeButton
  toastOptions={{
    style: { fontFamily: 'var(--font-sans)' },
  }}
/>
```

- **position**: top-right — visible sin obstruir contenido principal
- **richColors**: colores semanticos automaticos (verde exito, rojo error)
- **closeButton**: permite cerrar manualmente
- **fontFamily**: consistente con el sistema de diseno

---

## Decisiones Tecnicas

### Por que `PermissionGate` dentro del layout y no en el router

```tsx
// router.tsx
<Route path="/users" element={
  <DashboardLayout>
    <PermissionGate allowedRoles={[ADMIN, COORDINATOR]}>
      <UserPage />
    </PermissionGate>
  </DashboardLayout>
}>
```

El sidebar permanece visible cuando un usuario sin permisos navega a `/users`. Ve el layout completo pero el contenido muestra "Acceso Restringido" con un boton para volver. Esto es mejor UX que una pantalla blanca o una redireccion silenciosa.

### Por que un solo ConfirmModal con tipo discriminado

En lugar de `DeleteModal` + `ToggleModal` separados, un solo componente con `action: { type: 'delete' | 'toggle', user }` reduce duplicacion. El icono, titulo, mensaje y boton de confirmacion cambian segun el tipo. Un solo `confirmAction` en el estado del padre controla la visibilidad.

### Por que `activo?: boolean` en lugar de `status?: UserStatus`

El backend devuelve un booleano `activo`, no un enum string. El tipo anterior `UserStatus` ("active"/"inactive") no coincidia con la API real. Usar `boolean` opcional (el backend puede no enviarlo para usuarios legacy) es mas fiel al contrato.

### Por que `z.coerce.number()` para `rol_id` en el schema

Los `<select>` de HTML siempre devuelven strings. Usar `z.coerce.number()` convierte automaticamente el string del select a numero antes de validar, evitando errores de tipo.

### Por que filtrar sidebar en DashboardLayout y no en el router

Cada `menuItem` tiene su propio array `roles`. El sidebar lee `currentRole` y filtra en render-time. Esto permite que agregar un nuevo item al sidebar solo requiera agregar un objeto al array — no tocar el router ni los guards.

---

## Verificacion

### Compilacion TypeScript

```bash
npx tsc --noEmit
```

**Resultado**: 0 errores nuevos en archivos modificados. Los 8 errores existentes son de archivos pre-existentes no modificados en esta acta (StatsPanel, GridViewer, LogConsole, MapView, PopulationChart).

### Checklist de Verificacion Funcional

- [ ] **RBAC Sidebar**: Login como Admin → ve 6 items. Login como Campo → ve 2 items (Panel, Cartografia)
- [ ] **PermissionGate /users**: Login como Tecnico → navegar a /users → ve "Acceso Restringido"
- [ ] **CRUD Crear**: Click "Registrar Operador" → llenar form → validacion Zod → toast exito
- [ ] **CRUD Editar**: Click editar → cambiar nombre/rol → guardar → toast exito + cambio inmediato
- [ ] **CRUD Eliminar**: Click eliminar → modal confirmacion → toast exito + usuario desaparece
- [ ] **CRUD Toggle**: Click Power → modal toggle → toast exito + pill cambia de activo a inactivo
- [ ] **Optimistic rollback**: Desconectar backend → intentar operacion → UI se restaura + toast error
- [ ] **Responsive**: Reducir ventana a <768px → tabla desaparece → cards aparecen
- [ ] **Toasts**: Verificar que aparecen en top-right con colores semanticos
- [ ] **Validacion sidesheet**: Submit vacio → errores inline bajo cada campo

---

## Dependencias Utilizadas

| Paquete | Version | Uso en esta acta |
|---------|---------|-----------------|
| `sonner` | ^1.7.4 | Toast notifications (exito, error) |
| `react-hook-form` | ^7.60.0 | Formulario de creacion de usuarios |
| `@hookform/resolvers` | ^3.10.0 | Integracion Zod + React Hook Form |
| `zod` | 3.25.76 | Schema de validacion para creacion |
| `framer-motion` | (existente) | Animaciones del sidesheet |
| `lucide-react` | (existente) | Iconos: Power, ShieldOff, etc. |

---

## Resumen de Cambios

| Metrica | Valor |
|---------|-------|
| Archivos creados | 3 |
| Archivos modificados | 9 |
| Archivos reescritos | 2 |
| Total archivos impactados | 12 |
| Lineas de CSS agregadas | ~180 |
| Dependencias nuevas | 0 (todas pre-existentes) |
| Errores TypeScript nuevos | 0 |
