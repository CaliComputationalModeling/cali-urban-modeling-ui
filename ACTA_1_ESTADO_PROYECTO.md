# Sistema de Simulacion de Movilidad Urbana

### Frontend - Interfaz de Usuario (React + TypeScript)

---

## Descripcion

Este proyecto corresponde al desarrollo del frontend para un sistema de simulacion de movilidad urbana basado en automatas celulares, enfocado en el modelamiento de dinamicas de poblacion habitante de calle en Santiago de Cali, Colombia.

La interfaz permite la autenticacion de operadores, la gestion de usuarios por roles, la visualizacion geoespacial de simulaciones sobre un mapa interactivo de Cali, el control en tiempo real del motor de automatas celulares y la consulta de metricas y estadisticas urbanas.

---

## Enfoque Arquitectonico

Se implementa una **arquitectura modular por features** con separacion clara de responsabilidades:

- **Feature-based structure**: Cada dominio funcional (auth, users, simulation) tiene su propia carpeta con paginas y componentes
- **Shared layer**: Componentes UI reutilizables, tipos, hooks y constantes compartidas
- **Store centralizado**: Estado global gestionado con Zustand (simulacion y autenticacion)
- **Capa de servicios**: Cliente HTTP personalizado con endpoints tipados por modulo
- **Estilos modulares**: CSS organizado por capas (base, layout, components, pages) con variables CSS globales

---

## Estructura del Proyecto

```
src/
├── app/                        # Configuracion de la aplicacion
│   ├── providers/              # Proveedores globales (BrowserRouter)
│   └── router.tsx              # Definicion de rutas (React Router DOM)
│
├── features/                   # Modulos funcionales por dominio
│   ├── auth/
│   │   └── pages/
│   │       └── LoginPage.tsx   # Pagina de inicio de sesion
│   │
│   ├── users/
│   │   └── pages/
│   │       ├── UserPage.tsx            # CRUD de operadores con tabla
│   │       └── CreateUserSidesheet.tsx # Panel lateral para crear usuarios
│   │
│   └── simulation/
│       └── pages/
│           ├── SimulationPage.tsx   # Pagina principal de simulacion
│           ├── SimulationMap.tsx    # Mapa Leaflet con GeoJSON y POIs
│           ├── ControlPanel.tsx     # Controles de transporte (play/pause/reset)
│           ├── StatsPanel.tsx       # Metricas y graficas en tiempo real
│           └── SimulationLoader.tsx # Cargador/creador de simulaciones
│
├── shared/                     # Recursos compartidos
│   ├── ui/                     # Componentes UI reutilizables
│   │   ├── Button.tsx          # Boton con variantes (primary, secondary, danger, ghost)
│   │   ├── Card.tsx            # Tarjeta contenedora
│   │   ├── Input.tsx           # Input con label y validacion de error
│   │   ├── Modal.tsx           # Modal generico con overlay
│   │   ├── Table.tsx           # Tabla generica con columnas dinamicas
│   │   ├── GridViewer.tsx      # Visualizador de grilla 2D del automata
│   │   ├── LogConsole.tsx      # Consola de logs con niveles (info, warning, error)
│   │   ├── ProgressBar.tsx     # Barra de progreso con porcentaje
│   │   ├── MapView.tsx         # Vista de mapa Leaflet alternativa (OpenStreetMap)
│   │   └── PopulationChart.tsx # Grafica de poblacion con Recharts
│   │
│   ├── types/                  # Definiciones de tipos TypeScript
│   │   ├── user.types.ts       # User, CreateUserPayload, UserRole, UserStatus
│   │   ├── simulation.types.ts # Simulation, GridConfig, SimulationRule, etc.
│   │   └── observation.types.ts # Observation, ObservationCreate
│   │
│   ├── hooks/                  # Hooks personalizados
│   │   └── useLocalStorage.ts  # Hook para persistencia en localStorage
│   │
│   ├── constants/              # Constantes de la aplicacion
│   │   └── routes.ts           # Catalogo completo de rutas del sistema
│   │
│   └── lib/
│       └── utils.ts            # Utilidad cn() para merge de clases (clsx + tailwind-merge)
│
├── services/                   # Capa de comunicacion con el backend
│   ├── http.ts                 # Cliente HTTP generico (fetch wrapper con tipado)
│   └── endpoints/              # Endpoints organizados por modulo
│       ├── auth.endpoints.ts       # login, logout, me
│       ├── user.endpoints.ts       # getAll, getById, create, update, toggleStatus
│       ├── simulation.endpoints.ts # CRUD, run, runSpatial, reset, geojson, etc.
│       └── observation.endpoints.ts # CRUD de observaciones
│
├── store/                      # Estado global (Zustand)
│   ├── authStore.ts            # Estado de autenticacion
│   └── simulationStore.ts      # Estado de simulacion con logica de ejecucion
│
├── layouts/
│   └── DashboardLayout.tsx     # Layout principal con sidebar y header
│
├── styles/                     # Estilos CSS modulares
│   ├── index.css               # Entry point de imports CSS
│   ├── base/
│   │   ├── variables.css       # Variables CSS globales (colores, tipografia, sombras)
│   │   └── reset.css           # Reset de estilos base
│   ├── layout/
│   │   └── dashboard.css       # Estilos del layout (sidebar, header, main)
│   ├── components/
│   │   └── overlays.css        # Estilos de modales y sidesheets
│   └── pages/
│       ├── login.css           # Estilos de la pagina de login
│       ├── users.css           # Estilos de la pagina de usuarios
│       └── simulation.css      # Estilos de la pagina de simulacion
│
├── App.tsx                     # Componente raiz
├── main.tsx                    # Punto de entrada (ReactDOM.createRoot)
└── index.css                   # Configuracion base Tailwind + shadcn/ui
```

---

## Flujo de la Arquitectura

```
Usuario (Navegador)
   |
   v
Router (React Router DOM)
   |
   v
DashboardLayout (Sidebar + Header)
   |
   v
Feature Page (LoginPage / UserPage / SimulationPage)
   |
   v
Store (Zustand) <--> Services (HttpClient)
   |                        |
   v                        v
UI Components          Backend API (FastAPI)
   |                        |
   v                        v
Leaflet / Recharts     PostgreSQL + PostGIS
```

---

## Modulo Implementado: Autenticacion (Auth)

Se implemento el flujo completo de autenticacion, incluyendo:

### Pagina de Login

- Formulario con email y contrasena
- Toggle de visibilidad de contrasena (Eye/EyeOff)
- Estado de carga con spinner animado
- Manejo de errores con alerta visual
- Redireccion automatica a `/dashboard` tras login exitoso
- Almacenamiento de `user_role` y `user_id` en localStorage
- Comunicacion con endpoint `POST /auth/login`

### Store de Autenticacion

- Estado global con Zustand (`authStore.ts`)
- Interfaz `AuthState` con `user`, `isAuthenticated`, `login()`, `logout()`
- Mock de autenticacion disponible para desarrollo

### Endpoints de Auth

- `POST /auth/login` - Inicio de sesion
- `POST /auth/logout` - Cierre de sesion
- `GET /auth/me` - Datos del usuario actual

---

## Modulo Implementado: Gestion de Usuarios (Users)

Se implemento completamente el flujo para la gestion de operadores, incluyendo:

### Pagina de Usuarios (UserPage)

- **Tabla de operadores** con columnas: ID, Operador (avatar + nombre), Correo, Nivel de Acceso, Acciones
- **Tarjetas de estadisticas**: Total operadores, Administradores, Coordinadores, Campo
- **Edicion inline**: Al hacer clic en editar, la fila se convierte en inputs editables (nombre y rol)
- **Eliminacion con confirmacion**: Modal de confirmacion antes de eliminar un operador
- **Estados de carga**: Spinner animado mientras se cargan los datos
- **Estado vacio**: Mensaje ilustrado cuando no hay operadores registrados
- **Manejo de errores**: Alerta cuando no se tienen permisos de administrador

### Panel Lateral de Creacion (CreateUserSidesheet)

- Sidesheet animado con Framer Motion (slide desde la derecha)
- Formulario completo: Nombre, Email, Contrasena, Nivel de Autorizacion
- **Indicador de fuerza de contrasena** con 4 niveles (Debil, Regular, Buena, Fuerte)
- Toggle de visibilidad de contrasena
- Selector de 5 roles del sistema
- Comunicacion con endpoint `POST /auth/register`

### Sistema de Roles

Se definen 5 niveles de acceso:

| ID | Rol                   |
|----|----------------------|
| 1  | Administrador        |
| 2  | Coordinador Tecnico  |
| 3  | Equipo Tecnico       |
| 4  | Jefe de Fundacion    |
| 5  | Trabajador de Campo  |

### Tipos TypeScript

- `User`: id, nombre_completo, email, rol_id, status
- `CreateUserPayload`: email, password, nombre_completo, rol_id
- `UserRole` (enum): ADMIN, COORDINATOR, TECHNICIAN, FOUNDATION_HEAD, FIELD_WORKER
- `UserStatus` (enum): ACTIVE, INACTIVE

### Endpoints de Users

- `GET /users/` - Listar todos los usuarios
- `GET /users/{id}` - Obtener usuario por ID
- `POST /users/` - Crear usuario
- `PATCH /users/{id}` - Actualizar usuario
- `PATCH /users/{id}/toggle-status` - Toggle de estado activo/inactivo
- `DELETE /users/{id}` - Eliminar usuario

---

## Modulo Implementado: Simulacion (Simulation)

Se implemento el modulo mas complejo del sistema, incluyendo visualizacion geoespacial, control de ejecucion y metricas en tiempo real.

### Pagina de Simulacion (SimulationPage)

Pagina compuesta por 4 subcomponentes organizados en un layout de grid:

#### 1. SimulationLoader - Cargador de Escenarios

- **Conectar** a una simulacion existente por ID
- **Crear nueva** simulacion espacial con parametros predefinidos:
  - Grid 50x50 celdas
  - Vecindario tipo Moore
  - Modo de frontera toroidal
  - Bounds geoespaciales de Cali (lat: 3.38-3.50, lon: -76.56 a -76.46)
  - 100 agentes iniciales
- Estado visual de conexion (conectado/desconectado)
- Boton de desconexion

#### 2. SimulationMap - Mapa Interactivo con Leaflet

- **Mapa base**: CartoDB Dark Matter (tema oscuro)
- **Centro**: Santiago de Cali [3.4372, -76.5225]
- **Capa GeoJSON**: Renderizado de agentes como CircleMarkers con colores por estado:

| Estado | Color   | Significado    |
|--------|---------|----------------|
| 1      | #00d9ff | En transito    |
| 2      | #d4af37 | En cambuche    |
| 3      | #22c55e | En comedor     |
| 4      | #f97316 | Zona consumo   |
| 5      | #ef4444 | Zona repulsora |

- **Marcadores de POIs** (Puntos de Interes) cargados desde el backend:
  - Comedor social, Cambuche, Zona de consumo, Zona de patrullaje, Parque publico, Hospital/CAI
- **Tooltips interactivos**: Muestran estado, cantidad de agentes, tipo de POI y coordenadas
- **Badge de generacion**: Indicador animado de generacion actual
- **Leyenda de colores**: Panel con la codificacion de estados

#### 3. ControlPanel - Controles de Ejecucion

- **Botones de transporte**:
  - Play/Pause: Iniciar o pausar la simulacion automatica
  - Step: Avanzar una generacion manualmente
  - Reset: Reiniciar la simulacion (llama al endpoint de reset)
- **Slider de velocidad**: Control de intervalo entre generaciones (100ms - 2000ms)
- **Limite de generaciones**: Input numerico para definir maximo de ciclos
- **Contador de generacion**: Display con formato de 5 digitos (00000)

#### 4. StatsPanel - Metricas en Tiempo Real

- **Poblacion Activa**: Total de agentes y celdas ocupadas
- **Densidad Promedio**: Porcentaje de ocupacion de la grilla
- **Distribucion Urbana**: Desglose por estado con porcentajes:
  - En transito, En comedor, En cambuche, Zona consumo, Zona repulsora
- **Grafica de Historial de Comportamiento**:
  - AreaChart con Recharts
  - Series: Transito, Comedor, Cambuche
  - Gradientes personalizados
  - Tooltip customizado con estilos dark
  - Ultimas 50 generaciones
- **Tiempo de ejecucion**: Reloj del proceso actual

### Store de Simulacion (Zustand)

Estado global completo para la gestion de la simulacion:

- **Estado**: simulationId, isRunning, currentGeneration, maxGenerations, data (GeoJSON), history, intervalMs, stats
- **Acciones**:
  - `setSimulationId(id)` - Establecer ID de simulacion
  - `startSimulation()` - Iniciar loop automatico con setTimeout recursivo
  - `pauseSimulation()` - Pausar ejecucion
  - `resetSimulation()` - Reiniciar estado y llamar endpoint de reset
  - `fetchNextStep()` - Avanzar una generacion (3 llamadas API secuenciales):
    1. `POST /simulations/{id}/run-espacial` - Ejecutar 1 generacion
    2. `GET /simulations/{id}/geojson` - Obtener datos geoespaciales
    3. `GET /simulations/{id}/estado-urbano` - Obtener estadisticas urbanas
  - `disconnect()` - Desconectar de la simulacion actual

### Tipos TypeScript de Simulacion

- `GridConfig`: width, height, neighborhood_type (moore/von_neumann), boundary_mode, geospatial_bounds
- `SimulationRule`: rule_type (conway/wolfram/custom), birth, survival, wolfram_code
- `Simulation`: simulation_id, name, description, created_at, generation, active, estado
- `SimulationCreateRequest`: name, description, grid_config, rule, initial_cells
- `SimulationRunRequest/Response`: generations, alive_cells, population_density, execution_time_ms
- `SimulationProgress`: estado, porcentaje_progreso, generacion_actual, max_ciclos
- `SimulationResults`: generaciones_ejecutadas, fecha_inicio, fecha_fin, duracion_segundos
- `SimulationStatistics`: total_cells, alive_cells, dead_cells, population_density

### Endpoints de Simulacion

- `GET /simulations` - Listar simulaciones (con paginacion)
- `GET /simulations/{id}` - Obtener simulacion por ID
- `POST /simulations` - Crear simulacion estandar
- `POST /simulations/espacial?n_agentes=N` - Crear simulacion espacial
- `DELETE /simulations/{id}` - Detener simulacion
- `DELETE /simulations/{id}/cancelar` - Cancelar simulacion
- `POST /simulations/{id}/run` - Ejecutar N generaciones
- `POST /simulations/{id}/run-espacial` - Ejecutar N generaciones (modelo espacial)
- `POST /simulations/{id}/reset` - Reiniciar simulacion
- `GET /simulations/{id}/statistics` - Estadisticas generales
- `GET /simulations/{id}/progreso` - Progreso de ejecucion
- `GET /simulations/{id}/resultados` - Resultados finales
- `GET /simulations/{id}/geojson` - Datos GeoJSON para mapa
- `GET /simulations/{id}/estado-urbano` - Estado urbano con metricas
- `GET /simulations/estado-servidor` - Estado del servidor
- `POST /simulations/validar-inputs` - Validar inputs de simulacion

---

## Modulo Definido: Observaciones (Observations)

Se definieron los tipos y endpoints pero la interfaz visual aun no esta implementada.

### Tipos TypeScript

- `Observation`: id, usuario_id, descripcion, numero_personas, estado_animo, factores_detectados, fecha_observacion, fecha_registro, latitud, longitud
- `ObservationCreate`: fecha_observacion, latitud, longitud, numero_personas, descripcion, estado_animo, factores_detectados

### Endpoints de Observaciones

- `GET /observations` - Listar observaciones (con paginacion)
- `GET /observations/{id}` - Obtener observacion por ID
- `POST /observations` - Crear observacion
- `PATCH /observations/{id}` - Actualizar observacion
- `DELETE /observations/{id}` - Eliminar observacion
- `GET /observations/pois` - Obtener puntos de interes (usado por SimulationMap)

---

## Componentes UI Compartidos

Se desarrollo una libreria de componentes reutilizables:

| Componente      | Descripcion                                                        |
|----------------|--------------------------------------------------------------------|
| `Button`       | Boton con 4 variantes (primary, secondary, danger, ghost) y 3 tamanos |
| `Card`         | Contenedor con titulo opcional y estilos de tarjeta                |
| `Input`        | Campo de entrada con label, error y ref forwarding                 |
| `Modal`        | Dialogo modal con overlay, titulo, contenido y footer              |
| `Table`        | Tabla generica con columnas dinamicas y click en fila              |
| `GridViewer`   | Visualizador de grilla 2D del automata celular (canvas HTML)       |
| `LogConsole`   | Consola estilo terminal con logs por nivel (info, warning, error)  |
| `ProgressBar`  | Barra de progreso con porcentaje y estado animado                  |
| `MapView`      | Vista alternativa de mapa Leaflet con OpenStreetMap                |
| `PopulationChart` | Grafica AreaChart de poblacion con Recharts                     |

---

## Capa de Servicios (HttpClient)

Se implemento un cliente HTTP personalizado basado en `fetch` con las siguientes caracteristicas:

- **Tipado generico**: Todas las respuestas estan tipadas con `HttpResponse<T>`
- **Metodos soportados**: GET, POST, PATCH, DELETE
- **Headers automaticos**: `Content-Type: application/json`
- **Credentials**: `include` (para cookies de sesion)
- **Query params**: Soporte para parametros de URL
- **Manejo de errores**: Captura de errores de red con respuesta unificada
- **Base URL configurable**: Apunta a `http://localhost:3000`

---

## Layout y Navegacion

### DashboardLayout

Layout principal con dos areas:

#### Sidebar (Menu Lateral)

- Logo "SIMCORE" con indicador visual
- Navegacion organizada por secciones:
  - **PRINCIPAL**: Panel Control, Operadores
  - **OPERACIONES**: Simulaciones, Cartografia
  - **ANALISIS**: Reportes, Auditoria
- Indicador de item activo por ruta
- Boton de cerrar sesion con llamada a `POST /auth/logout`

#### Header Superior

- Indicador de estado del sistema ("SISTEMA ACTIVO" con dot animado)
- Perfil del usuario: Terminal_01, rol segun localStorage, avatar con iniciales

### Sistema de Rutas

Rutas implementadas:

| Ruta           | Componente        | Layout    |
|----------------|-------------------|-----------|
| `/login`       | LoginPage         | Ninguno   |
| `/dashboard`   | Resumen del Sistema | Dashboard |
| `/users`       | UserPage          | Dashboard |
| `/simulation`  | SimulationPage    | Dashboard |
| `*`            | Redirect a login  | -         |

Rutas planificadas (definidas en constantes pero sin implementar):

- `/observation/new`, `/heatmap`, `/predictive-routes`, `/my-observations`
- `/data-load`, `/variables-config`, `/rules-editor`, `/execution`
- `/validation`, `/geographic-audit`, `/calibration`, `/simulation-history`
- `/executive-dashboard`, `/map-viewer`, `/scenario-comparator`
- `/reports`, `/approval`

---

## Tecnologias Utilizadas

### Core

- **React 18** - Libreria de UI con hooks y strict mode
- **TypeScript 5.5** - Tipado estatico con configuracion strict
- **Vite 5** - Build tool y dev server con HMR

### Estado y Ruteo

- **Zustand 4** - Estado global ligero y sin boilerplate
- **React Router DOM 6** - Navegacion SPA con rutas protegidas

### UI y Estilos

- **Tailwind CSS 4** - Utility-first CSS framework
- **shadcn/ui (New York)** - Componentes base con Radix UI
- **Radix UI** - Primitivas de UI accesibles (dialog, dropdown, tabs, tooltip, etc.)
- **Lucide React** - Libreria de iconos
- **Framer Motion** - Animaciones (sidesheet, transiciones)
- **class-variance-authority + clsx + tailwind-merge** - Utilidades de clases CSS

### Visualizacion

- **Leaflet + React Leaflet** - Mapas interactivos con GeoJSON
- **Recharts** - Graficas (AreaChart con gradientes)
- **CartoDB Dark Matter** - Tile layer de mapa oscuro

### Formularios y Validacion

- **React Hook Form** - Gestion de formularios
- **Zod** - Esquemas de validacion
- **@hookform/resolvers** - Integracion Zod + React Hook Form

### Otros

- **date-fns** - Utilidades de fechas
- **Sonner** - Notificaciones toast
- **react-resizable-panels** - Paneles redimensionables
- **cmdk** - Command palette
- **vaul** - Drawer/sheet components
- **embla-carousel-react** - Carrusel

---

## Ejecucion del Proyecto

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Crear archivo `.env.local` con:

```
VITE_API_URL=http://localhost:3000
```

### 3. Ejecutar servidor de desarrollo

```bash
npm run dev
```

### 4. Compilar para produccion

```bash
npm run build
```

---

## Acceso

- Aplicacion:
    ```
    http://localhost:5173
    ```

- Backend API (requerido):
    ```
    http://localhost:3000
    ```

---

## Consideraciones Tecnicas

### Separacion de responsabilidades

- Los **tipos de dominio** estan separados de la logica de UI
- La **capa de servicios** no depende de ningun componente visual
- Los **stores** gestionan estado de forma independiente al framework de UI
- Los **endpoints** estan organizados por modulo y tipados

---

### Cliente HTTP personalizado

En lugar de usar axios o similar, se implemento un wrapper propio sobre `fetch`:

```
services/http.ts
```

Esto permite:

- Control total sobre headers, credentials y manejo de errores
- Tipado generico en todas las respuestas
- Independencia de librerias externas para HTTP

---

### Estado global con Zustand

Se utiliza Zustand en lugar de Redux/Context por:

- Minima cantidad de boilerplate
- Subscripciones selectivas (re-renders optimizados)
- Logica asincrona directa dentro del store (sin middlewares)
- Ideal para el loop de simulacion con setTimeout recursivo

---

### Visualizacion geoespacial

El mapa de simulacion utiliza:

- **React Leaflet** para integracion declarativa con React
- **GeoJSON layer** para renderizar agentes dinamicamente
- **CircleMarkers** con radio proporcional a cantidad de agentes
- **POI markers** con iconos emoji y efectos glow
- **Key dinamic** para forzar re-render de GeoJSON por generacion

---

### Sistema de estilos

Se combina:

- **Tailwind CSS** para componentes compartidos (Button, Card, etc.)
- **CSS puro modular** para layouts complejos (login, dashboard, simulation)
- **Variables CSS** globales para consistencia de colores, tipografia y sombras
- **Fuentes**: Inter (sans), Playfair Display (display), JetBrains Mono (mono)

---

## Estado Actual

- [x] Arquitectura modular por features implementada
- [x] Sistema de autenticacion funcional (login/logout)
- [x] CRUD completo de usuarios/operadores con edicion inline
- [x] Sistema de roles con 5 niveles de acceso
- [x] Modulo de simulacion con visualizacion geoespacial
- [x] Mapa interactivo de Cali con Leaflet + GeoJSON
- [x] Panel de control de simulacion (play/pause/reset/step)
- [x] Metricas en tiempo real con graficas de Recharts
- [x] Cargador/creador de simulaciones espaciales
- [x] Layout Dashboard con sidebar navegable
- [x] Cliente HTTP personalizado con tipado completo
- [x] Store de simulacion con loop automatico
- [x] Libreria de componentes UI compartidos (10 componentes)
- [x] Tipos TypeScript para User, Simulation, Observation
- [x] Endpoints tipados para 4 modulos (auth, users, simulations, observations)
- [x] Estilos CSS modulares con variables globales
- [x] Configuracion de shadcn/ui (New York style)

---

## Proximos Pasos

- Implementacion de rutas protegidas con validacion de token/sesion
- Control de acceso por roles (RBAC) en el frontend
- Modulo visual de Observaciones (formulario georeferenciado)
- Pagina de Cartografia con mapa de calor (heatmap)
- Pagina de Reportes con exportacion de datos
- Pagina de Auditoria con logs del sistema
- Dashboard ejecutivo con metricas agregadas
- Comparador de escenarios de simulacion
- Editor visual de reglas del automata celular
- Configuracion de variables del modelo
- Validacion y calibracion de resultados
- Historial de simulaciones ejecutadas
- Notificaciones en tiempo real con WebSocket
- Responsive design para dispositivos moviles

---

## Justificacion del Diseno

Se eligio esta arquitectura porque:

- **Feature-based**: Permite escalar modulos de forma independiente sin afectar otros dominios
- **Zustand sobre Redux**: Simplicidad y rendimiento para un sistema con actualizaciones frecuentes (loop de simulacion)
- **Leaflet sobre Mapbox/Google Maps**: Open source, sin API keys, ideal para datos geoespaciales con GeoJSON
- **CSS modular sobre CSS-in-JS**: Mejor rendimiento en animaciones y layouts complejos
- **HttpClient propio sobre Axios**: Control total, menor tamano de bundle, tipado nativo con TypeScript
- **Recharts**: Integracion nativa con React, ideal para graficas en tiempo real con datos cambiantes

---

## Autor

Proyecto desarrollado como parte de trabajo de grado en Ingenieria de Sistemas - Universidad Autonoma de Occidente, Cali, Colombia.
