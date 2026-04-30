# Sistema de Simulacion de Movilidad Urbana

### Frontend - Integracion Real del Motor de Simulacion + Visualizacion Geoespacial en Tiempo Real (Acta 4)

---

## Descripcion

Esta acta documenta la integracion completa del motor de automatas celulares del backend con el frontend del sistema SIMCORE. Se implemento el loop de ejecucion en tiempo real con Zustand, la renderizacion de agentes sobre el mapa de Cali en cada generacion con escala de colores por densidad, y un panel de metricas estadisticas que se actualiza continuamente.

El sistema incluye: formulario de creacion de simulaciones con validacion Zod, panel de control con botones etiquetados y selector de velocidad segmentado (Lento/Normal/Rapido), visualizacion GeoJSON con CircleMarkers coloreados por densidad (verde→amarillo→rojo), panel de metricas con grafica de linea Recharts, indicador de estado semaforo, indicador de conexion con el backend, logica de reintento automatico (3 intentos antes de pausar), y resumen emergente al completar una simulacion.

---

## Contexto - Estado Anterior (Acta 3)

En el Acta 3, el modulo de simulacion presentaba las siguientes limitaciones:

- **Datos mock**: Los componentes existian pero usaban datos simulados localmente
- **Store basico**: El simulationStore usaba `http` directamente, sin capa de endpoints, sin retry logic
- **Timer inseguro**: El loop de simulacion usaba setTimeout recursivo sin referencia para limpieza
- **Sin formulario de creacion**: SimulationLoader creaba simulaciones con valores hardcodeados (50x50, 100 agentes)
- **Sin validacion**: No habia esquema Zod ni React Hook Form para la creacion
- **Colores por estado**: El mapa usaba 5 colores fijos por estado (transito, cambuche, comedor, etc.) en lugar de escala por densidad
- **Sin indicadores de estado**: No habia semaforo de estado, indicador de conexion, ni resumen al completar
- **Errores TypeScript**: StatsPanel declaraba `isRunning` sin usarlo
- **Sin manejo de errores de red**: Un error pausaba la simulacion inmediatamente sin reintentos

---

## Enfoque Arquitectonico de la Solucion

- **SRP (Responsabilidad Unica)**: Cada componente tiene una responsabilidad clara — SimulationMap solo renderiza, ControlPanel solo controla, StatsPanel solo muestra metricas
- **Separacion de capas**: Store (logica de negocio + timer) → Endpoints (capa HTTP) → Componentes (presentacion)
- **Timer management**: Variable de modulo `tickTimer` fuera de Zustand para limpieza determinista con `clearTimeout`
- **Estado como maquina**: `SimulationStatus` con 5 estados discretos: idle → running → paused | error | completed
- **Retry pattern**: Contador de reintentos en el store, maximo 3 antes de transicionar a estado error
- **Densidad normalizada**: Max agentes calculado por generacion, ratio normalizado 0-1 para color y radio

---

## Maquina de Estados de la Simulacion

```
          startSimulation()
  idle ─────────────────────► running
   ▲                            │ │ │
   │                            │ │ │
   │      pauseSimulation()     │ │ │
   │   ◄────────────────────────┘ │ │
   │         paused               │ │
   │                              │ │
   │      generation >= max       │ │
   │   ◄──────────────────────────┘ │
   │         completed              │
   │                                │
   │      retryCount >= 3           │
   │   ◄────────────────────────────┘
   │         error
   │
   └──── resetSimulation() (desde cualquier estado)
```

---

## Estructura de Archivos - Cambios Realizados

### Archivos Modificados

```
src/
├── shared/
│   └── types/
│       └── simulation.types.ts            # MODIFICADO - boundary_mode toroidal, CreateSimulationFormData
│
├── services/
│   └── endpoints/
│       └── simulation.endpoints.ts        # MODIFICADO - IDs string|number, GeoJSON tipado
│
├── store/
│   └── simulationStore.ts                 # REESCRITO - Maquina de estados, retry, createSimulation
│
├── features/
│   └── simulation/
│       └── pages/
│           ├── SimulationPage.tsx          # MODIFICADO - Summary modal al completar
│           ├── SimulationLoader.tsx        # REESCRITO - Formulario RHF + Zod
│           ├── ControlPanel.tsx            # REESCRITO - Botones etiquetados, speed selector
│           ├── SimulationMap.tsx           # REESCRITO - Densidad verde→amarillo→rojo
│           └── StatsPanel.tsx             # REESCRITO - LineChart, status indicator, fix TS
│
├── App.tsx                                # (Sin cambios — Toaster ya presente de Acta 3)
│
└── styles/
    └── pages/
        └── simulation.css                 # REESCRITO - Labeled buttons, speed selector, summary, etc.
```

---

## Detalle de Implementacion por Archivo

### 1. `src/shared/types/simulation.types.ts` (MODIFICADO)

**Cambios:**
- `boundary_mode` acepta `'toroidal'` ademas de `'fixed'` y `'periodic'`
- Nuevo tipo `CreateSimulationFormData`: nombre, descripcion, filas, columnas, agentes_iniciales
- Semicolons removidos (consistencia con Prettier)

### 2. `src/services/endpoints/simulation.endpoints.ts` (MODIFICADO)

**Cambios:**
- Todos los parametros `id` cambiados de `number` a `number | string` para compatibilidad con el store que usa string
- `getGeoJson` ahora retorna `FeatureCollection<Geometry>` tipado en lugar de `any`
- Semicolons removidos

### 3. `src/store/simulationStore.ts` (REESCRITO)

Reescritura completa del store de simulacion.

**Timer management:**
```ts
// Variable de modulo — fuera de Zustand
let tickTimer: ReturnType<typeof setTimeout> | null = null

function clearTick() {
  if (tickTimer !== null) {
    clearTimeout(tickTimer)
    tickTimer = null
  }
}
```

**Estado exportado:**
```ts
export type SimulationStatus = 'idle' | 'running' | 'paused' | 'error' | 'completed'

export interface SimulationState {
  simulationId: string | null
  status: SimulationStatus
  currentGeneration: number
  maxGenerations: number
  speed: number              // intervalMs (500, 1000, 2000)
  data: FeatureCollection<Geometry> | null
  history: HistoryPoint[]    // ultimos 50 puntos
  stats: SimulationStats
  error: string | null
  retryCount: number         // 0-3
  backendConnected: boolean  // indicador de conexion
}
```

**Nuevos campos vs Acta anterior:**
- `status` reemplaza `isRunning` como maquina de estados
- `speed` reemplaza `intervalMs` (mismo proposito, mejor nombre)
- `error` y `retryCount` para logica de reintentos
- `backendConnected` para indicador visual
- `maxDensity` en stats para metrica de densidad maxima

**Acciones nuevas:**
- `createSimulation(config)`: Llama a `simulationEndpoints.createSpatial()` con la configuracion del formulario, guarda el ID en el store
- `stepSimulation()`: Ejecuta un solo paso manualmente (no permitido si running)

**Loop de ejecucion (scheduleTick):**
```
scheduleTick():
  1. clearTick() — limpiar timer previo
  2. setTimeout(async callback, speed)
  3. Dentro del callback:
     a. Verificar status === 'running'
     b. Verificar generation < maxGenerations
     c. await fetchNextStep()
     d. Si sigue running: scheduleTick() recursivo
```

**Retry logic en fetchNextStep:**
```
try:
  runSpatial → getGeoJson → getUrbanState → update store
  retryCount = 0, backendConnected = true
catch:
  retryCount++
  if retryCount >= 3:
    clearTick(), status = 'error', backendConnected = false
  else:
    error = "Reintentando... (N/3)"  (loop continua)
```

**Uso de endpoints centralizados:**
- Reemplaza `http.post/get` directos por `simulationEndpoints.runSpatial()`, `.getGeoJson()`, `.getUrbanState()`, `.reset()`

### 4. `src/features/simulation/pages/SimulationLoader.tsx` (REESCRITO)

Tres modos de UI: `connect | create | connected`

**Modo connect (default):**
- Input para ID de simulacion existente
- Boton CONECTAR + boton NUEVA
- Enter key dispara conexion

**Modo create (formulario Zod):**
- Schema de validacion:
  ```ts
  const createSimSchema = z.object({
    nombre: z.string().min(3, 'Minimo 3 caracteres'),
    descripcion: z.string().optional(),
    filas: z.coerce.number().min(10, 'Minimo 10').max(100, 'Maximo 100'),
    columnas: z.coerce.number().min(10, 'Minimo 10').max(100, 'Maximo 100'),
    agentes_iniciales: z.coerce.number().min(1, 'Minimo 1').max(5000, 'Maximo 5000'),
  })
  ```
- React Hook Form con `zodResolver`
- Campos: nombre, descripcion (opcional), filas (default 50), columnas (default 50), agentes (default 100)
- Errores inline bajo cada campo
- Boton X para volver al modo connect
- Al crear exitosamente: reset form + cambiar a modo connect

**Modo connected:**
- Muestra ID activo en input readonly
- Boton DESCONECTAR

### 5. `src/features/simulation/pages/ControlPanel.tsx` (REESCRITO)

**Botones de transporte con etiquetas:**
- `[▶ Iniciar]` / `[⏸ Pausar]` — toggle segun estado
- `[⏭ Paso]` — deshabilitado cuando running
- `[↺ Reset]` — siempre disponible
- Clase `.sim-btn-labeled` con texto e icono

**Selector de velocidad segmentado:**
```ts
const SPEED_OPTIONS = [
  { label: 'Lento', ms: 2000 },
  { label: 'Normal', ms: 1000 },
  { label: 'Rapido', ms: 500 },
]
```
- Tres botones en grupo segmentado (`.sim-speed-selector`)
- Opcion activa resaltada con color accent

**Indicador de conexion:**
- Icono Wifi (verde) / WifiOff (rojo) en la esquina derecha del panel
- Lee `backendConnected` del store

**Barra de error:**
- Visible solo cuando `status === 'error'`
- Muestra mensaje de error con icono WifiOff
- Fondo rojo tenue, borde rojo

### 6. `src/features/simulation/pages/SimulationMap.tsx` (REESCRITO)

**Escala de color por densidad:**
```ts
function getDensityColor(ratio: number): string {
  const hue = 120 * (1 - Math.min(ratio, 1))  // 120=verde → 0=rojo
  return `hsl(${hue}, 80%, 50%)`
}

function getDensityRadius(ratio: number): number {
  return 4 + Math.min(ratio, 1) * 16  // 4px a 20px
}
```

**Normalizacion por generacion:**
- `maxAgentes` se calcula con `useMemo` para cada nueva generacion
- `ratio = agentes / maxAgentes` normaliza cada celda entre 0 y 1
- Color y radio se derivan del ratio

**Tooltips mejorados:**
```
Celda [x,y]
Agentes: N
Densidad: X%
```

**Leyenda actualizada:**
- Barra de gradiente CSS (verde → amarillo → rojo)
- Labels: Baja / Media / Alta
- Reemplaza los 5 dots de estado anteriores

**Optimizacion de re-render:**
- Key dinamica: `sim-${currentGeneration}-${features.length}`
- `useMemo` para filtrar geometrias nulas y calcular maxAgentes

### 7. `src/features/simulation/pages/StatsPanel.tsx` (REESCRITO)

**Fix errores TypeScript:**
- Eliminado `isRunning` no usado (ahora usa `status`)
- Tipo del `icon` prop del Metric: `React.ComponentType<{ size?: number | string; color?: string }>` compatible con Lucide

**Indicador de estado (semaforo):**
```ts
const STATUS_CONFIG = {
  idle:      { label: 'Detenida',       color: '#64748b' },  // gris
  running:   { label: 'Simulando...',   color: '#22c55e' },  // verde
  paused:    { label: 'En pausa',       color: '#d4af37' },  // amarillo
  error:     { label: 'Error',          color: '#ef4444' },  // rojo
  completed: { label: 'Completada',     color: '#00d9ff' },  // cyan
}
```
- Dot coloreado + label en la parte superior del panel

**Tarjetas de metricas:**
- Total Agentes (icono Users, color accent)
- Densidad Maxima (icono TrendingUp, color rojo)
- Celdas Ocupadas + Generacion (en fila de dos)

**Grafica de linea (LineChart):**
- Reemplaza AreaChart por LineChart de Recharts
- Linea principal: `totalAgentes` (cyan, grosor 2)
- Lineas secundarias: `enTransito` y `enComedor` (punteadas, grosor 1)
- Custom tooltip con fondo oscuro

**Distribucion urbana:**
- 5 filas con icono, label, valor absoluto y porcentaje
- En transito, En comedor, En cambuche, Zona consumo, Zona repulsora

### 8. `src/features/simulation/pages/SimulationPage.tsx` (MODIFICADO)

**Resumen emergente al completar:**
- `useEffect` detecta `status === 'completed'` y muestra overlay
- Modal con:
  - Icono CheckCircle2 en caja cyan
  - Titulo "Simulacion Completada"
  - Subtitulo con numero de generaciones
  - Grid 2x2 de metricas finales: Generaciones, Total Agentes, Densidad Max, Celdas Ocupadas
  - Boton "Cerrar"
- Click en overlay cierra el modal
- Estado `showSummary` local al componente

### 9. `src/styles/pages/simulation.css` (REESCRITO)

**Estilos nuevos/actualizados:**

| Seccion | Clases | Descripcion |
|---------|--------|-------------|
| Labeled buttons | `.sim-btn-labeled`, `.sim-btn-labeled.play-pause` | Botones de transporte con icono + texto |
| Speed selector | `.sim-speed-section`, `.sim-speed-selector`, `.sim-speed-option` | Control segmentado Lento/Normal/Rapido |
| Connection | `.sim-connection`, `.sim-connection-icon` | Indicador Wifi verde/rojo |
| Error bar | `.sim-error-bar` | Barra de error debajo del panel de control |
| Status indicator | `.sim-status-indicator`, `.sim-status-dot`, `.sim-status-label` | Semaforo de estado en StatsPanel |
| Metric row | `.sim-metric-row`, `.sim-metric-half` | Dos metricas lado a lado |
| Metric sub | `.sim-metric-sub` | Subtexto de metrica |
| Density legend | `.sim-legend-title`, `.sim-legend-gradient`, `.sim-legend-bar`, `.sim-legend-labels` | Barra gradiente verde→rojo |
| Create form | `.sim-loader-form`, `.sim-create-form`, `.sim-form-*` | Formulario de creacion en loader |
| Summary overlay | `.sim-summary-overlay`, `.sim-summary-card`, `.sim-summary-*` | Modal de resumen al completar |

---

## Flujos Implementados

### Flujo de Creacion de Simulacion

```
Usuario hace click en "NUEVA"
   |
   v
SimulationLoader entra en modo 'create'
   |  (formulario con nombre, grid, agentes)
   v
React Hook Form valida con Zod al submit
   |  (si invalido: errores inline)
   v
store.createSimulation(config)
   |
   v
POST /simulations/espacial?n_agentes=N
   |  con grid_config: filas x columnas, moore, toroidal, bounds Cali
   v
Respuesta OK → guardar simulation_id en store
   |
   v
SimulationLoader transiciona a modo 'connected'
```

### Flujo de Loop en Tiempo Real

```
Usuario hace click en [▶ Iniciar]
   |
   v
store.startSimulation()
   |  status = 'running', retryCount = 0
   v
scheduleTick() → setTimeout(callback, speed)
   |
   v
callback ejecuta:
   |
   ├── Verificar status === 'running'
   ├── Verificar generation < maxGenerations
   |
   v
store.fetchNextStep()
   |
   ├── POST /simulations/{id}/run-espacial {generations: 1}
   ├── GET /simulations/{id}/geojson → data para mapa
   ├── GET /simulations/{id}/estado-urbano → stats
   |
   v
Actualizar store: data, stats, history, generation
   |
   ├── Si OK: retryCount = 0, scheduleTick()
   ├── Si error + retryCount < 3: retryCount++, scheduleTick()
   └── Si error + retryCount >= 3: status = 'error', clearTick()
```

### Flujo de Renderizado del Mapa

```
store.data actualizado (nueva generacion)
   |
   v
SimulationMap re-renderiza (key dinamica)
   |
   v
useMemo: filtrar null geometries, calcular maxAgentes
   |
   v
GeoJSON pointToLayer:
   |  ratio = agentes / maxAgentes
   |  color = hsl(120*(1-ratio), 80%, 50%)
   |  radius = 4 + ratio * 16
   v
CircleMarkers con tooltip: "Celda [x,y] · Agentes: N · Densidad: X%"
```

### Flujo de Reintento Automatico

```
fetchNextStep() lanza excepcion
   |
   v
retryCount++ (1, 2, 3)
   |
   ├── retryCount < 3:
   │     error = "Reintentando... (N/3)"
   │     loop continua normalmente
   │
   └── retryCount >= 3:
         status = 'error'
         backendConnected = false
         clearTick()
         error = "Error de conexion... pausada tras 3 reintentos"
```

### Flujo de Completacion

```
generation >= maxGenerations (durante loop)
   |
   v
clearTick(), status = 'completed'
   |
   v
SimulationPage detecta status === 'completed'
   |
   v
Muestra overlay con metricas finales
   |  (Generaciones, Total Agentes, Densidad Max, Celdas)
   v
Usuario cierra overlay → continua en estado completed
```

---

## Decisiones Tecnicas

### Por que setTimeout recursivo y no setInterval

`setInterval` puede causar solapamiento: si un `fetchNextStep` tarda mas que el intervalo, se acumulan llamadas. Con `setTimeout` recursivo, el siguiente tick solo se programa despues de que el actual termine. Esto garantiza que nunca haya dos fetches concurrentes.

### Por que variable de modulo para el timer

Zustand no permite almacenar valores no serializables (como `TimerID`) en el estado. Una variable de modulo (`let tickTimer`) es accesible desde las acciones del store y permite `clearTimeout` determinista desde `disconnect()`, `resetSimulation()`, o `pauseSimulation()`.

### Por que escala HSL para densidad

HSL permite interpolar linealmente: `hue = 120*(1-ratio)` produce verde (120) → amarillo (60) → rojo (0) naturalmente. Es mas intuitivo que calcular RGB manualmente y produce transiciones suaves.

### Por que normalizar densidad por generacion

El maximo de agentes cambia entre generaciones. Normalizar contra el max actual (`useMemo`) asegura que la escala de colores siempre use el rango completo verde→rojo, independientemente del tamano absoluto de la simulacion.

### Por que z.coerce.number() en el schema

Los inputs HTML `type="number"` devuelven strings. `z.coerce.number()` convierte automaticamente antes de validar. Sin esto, `z.number().min(10)` fallaria porque recibe "50" (string) en lugar de 50 (number).

### Por que 3 reintentos antes de pausar

Un fallo de red puede ser transitorio (timeout, congestion). Pausar inmediatamente es mala UX. Tres reintentos con feedback visual ("Reintentando... 1/3") balancea resiliencia contra falsas esperanzas.

### Por que PermissionGate no se aplico a simulacion

Segun la jerarquia de roles definida en Acta 3, simulaciones son accesibles para Admin, Coordinator y Technician. El sidebar ya filtra la opcion. Una PermissionGate adicional en la ruta no se agrego en esta acta pero puede anadirse facilmente en el router.

---

## Verificacion

### Compilacion TypeScript

```bash
npx tsc --noEmit
```

**Resultado**: 0 errores nuevos en archivos modificados. Los 7 errores existentes son de archivos pre-existentes no modificados (GridViewer, LogConsole, MapView, PopulationChart en `src/shared/ui/`).

### Checklist de Verificacion Funcional

- [ ] **Crear simulacion**: Click NUEVA → llenar formulario → validacion Zod → POST /simulations/espacial → ID guardado en store
- [ ] **Conectar existente**: Ingresar ID → click CONECTAR → loader muestra "ESCENARIO ACTIVO"
- [ ] **Play**: Click Iniciar → loop ejecuta runSpatial cada N ms → mapa se actualiza
- [ ] **Pause**: Click Pausar → loop se detiene → mapa conserva ultimo estado
- [ ] **Step**: Click Paso → ejecuta exactamente 1 generacion → mapa actualiza
- [ ] **Reset**: Click Reset → POST /simulations/{id}/reset → mapa y stats se limpian
- [ ] **Velocidad**: Click Lento/Normal/Rapido → intervalo cambia (2000/1000/500ms)
- [ ] **Densidad mapa**: Celdas con muchos agentes se ven rojas, pocas agentes verdes
- [ ] **Tooltip**: Hover sobre celda → "Celda [x,y] · Agentes: N · Densidad: X%"
- [ ] **Leyenda**: Barra gradiente verde→rojo visible en esquina inferior derecha
- [ ] **Metricas**: Total Agentes, Densidad Max, Celdas, Generacion se actualizan en tiempo real
- [ ] **Grafica**: LineChart muestra evolucion de agentes por generacion
- [ ] **Semaforo**: Dot cambia de color segun estado (gris/verde/amarillo/rojo/cyan)
- [ ] **Conexion**: Icono Wifi verde cuando backend responde, rojo cuando falla
- [ ] **Retry**: Desconectar backend → reintenta 3 veces → pausa con error visible
- [ ] **Completacion**: Alcanzar max generaciones → overlay resumen con metricas finales
- [ ] **Cleanup**: Navegar fuera de la pagina → timer se limpia (sin memory leaks)
- [ ] **Validacion**: Submit formulario vacio → errores Zod inline

---

## Dependencias Utilizadas

| Paquete | Version | Uso en esta acta |
|---------|---------|-----------------|
| `zustand` | ^4.x | Store de simulacion con maquina de estados |
| `react-leaflet` | (existente) | Mapa interactivo con GeoJSON |
| `leaflet` | (existente) | CircleMarkers, tooltips, POI markers |
| `recharts` | (existente) | LineChart de evolucion de agentes |
| `react-hook-form` | ^7.60.0 | Formulario de creacion de simulacion |
| `@hookform/resolvers` | ^3.10.0 | Integracion Zod + React Hook Form |
| `zod` | 3.25.76 | Schema de validacion para creacion |
| `lucide-react` | (existente) | Iconos: Wifi, WifiOff, Play, Pause, etc. |
| `geojson` | (tipos) | Tipado de FeatureCollection<Geometry> |

---

## Resumen de Cambios

| Metrica | Valor |
|---------|-------|
| Archivos creados | 0 |
| Archivos modificados | 2 (types, endpoints) |
| Archivos reescritos | 6 (store, loader, control, map, stats, css) |
| Archivos con cambios menores | 1 (SimulationPage) |
| Total archivos impactados | 9 |
| Lineas de CSS | ~560 (reescritura completa) |
| Dependencias nuevas | 0 (todas pre-existentes) |
| Errores TypeScript nuevos | 0 |
