# 📊 FLUJO DE EJECUCIÓN - ANTES vs DESPUÉS

## ANTES (❌ FALLABA CON 404)

```
┌─────────────────────────────────────────────────────────────┐
│ UI: ExecutionModal.tsx                                      │
│ Usuario hace clic en "Ejecutar"                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Store: executeSimulationAsync()                             │
│                                                              │
│ POST /api/simulaciones/ejecutar                             │
│ ├─ Payload: { generaciones: 20, ... }                       │
│ └─ Response: 201 Created                                    │
│    {                                                         │
│      "simulation_id": 2,    ← ⭐ AQUÍ ESTÁ                 │
│      "nombre": "sim_2026...",                               │
│      "generacion": 0,                                       │
│      "creada_en": "2026-05-18T..."                          │
│    }                                                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Búsqueda de ejecucion_id (LÓGICA ANTERIOR)                  │
│                                                              │
│ const ejecucionId = data.ejecucion_id || data.id           │
│                                  ↓                           │
│                            undefined ❌                      │
│                                  ↓                           │
│                    Intenta usar simulation_id como           │
│                    ejecucionId (INCORRECTO)                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Polling: GET /api/simulaciones/2/estado                     │
│                                                              │
│ ├─ URL: /api/simulaciones/2/estado                          │
│ ├─ Response: 404 Not Found ❌                               │
│ │  (Backend busca ID 2 en tabla simulaciones)               │
│ │  (Pero ID 2 está en tabla ejecuciones IN-MEMORY)          │
│ │                                                            │
│ └─ UI: "Error: Simulación no encontrada"                    │
└─────────────────────────────────────────────────────────────┘
```

---

## DESPUÉS (✅ FUNCIONA CORRECTAMENTE)

```
┌─────────────────────────────────────────────────────────────┐
│ UI: ExecutionModal.tsx                                      │
│ Usuario hace clic en "Ejecutar"                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Store: executeSimulationAsync()                             │
│                                                              │
│ POST /api/simulaciones/ejecutar                             │
│ ├─ Payload: { generaciones: 20, ... }                       │
│ └─ Response: 201 Created                                    │
│    {                                                         │
│      "ejecucion_id": "sim_20260518_abc123",  ← ⭐ ESPERADO │
│      "estado": "pendiente",                                 │
│      "mensaje": "Simulación encolada"                       │
│    }                                                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Búsqueda EXHAUSTIVA de ejecucion_id (LÓGICA NUEVA)          │
│                                                              │
│ const ejecucionId = data.ejecucion_id         ✅            │
│                    || data.id                 ← variante    │
│                    || data.execution_id       ← variante    │
│                    || null                                  │
│                                                              │
│ LOGGING: console.log({                                      │
│   raw: { ejecucion_id: "sim_...", ... },                    │
│   ejecucionId: "sim_...",                                   │
│   hasAsyncFlow: true                                        │
│ })                                                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Polling Loop: 300 intentos max (5 minutos)                  │
│                                                              │
│ Intento 1: GET /api/simulaciones/sim_20260518.../estado     │
│ │                                                            │
│ ├─ Response: 200 OK ✅                                      │
│ ├─ Datos: {                                                 │
│ │   "estado": "en_proceso",                                 │
│ │   "progreso": 0,                                          │
│ │   "mensaje": "Inicializando..."                           │
│ │ }                                                          │
│ │                                                            │
│ ├─ Estado normalizado: "en_proceso" → continuar             │
│ └─ UI: "Estado: en_proceso - Inicializando..."              │
│                                                              │
│ Esperar 1 segundo...                                        │
│                                                              │
│ Intento 2: GET /api/simulaciones/sim_20260518.../estado     │
│ │                                                            │
│ ├─ Response: 200 OK ✅                                      │
│ ├─ Datos: {                                                 │
│ │   "estado": "en_proceso",                                 │
│ │   "progreso": 25,                                         │
│ │   "mensaje": "Generación 5 de 20"                         │
│ │ }                                                          │
│ │                                                            │
│ ├─ Estado normalizado: "en_proceso" → continuar             │
│ └─ UI: "Estado: en_proceso - Generación 5 de 20"            │
│                                                              │
│ ... (continuar polling) ...                                 │
│                                                              │
│ Intento N: GET /api/simulaciones/sim_20260518.../estado     │
│ │                                                            │
│ ├─ Response: 200 OK ✅                                      │
│ ├─ Datos: {                                                 │
│ │   "estado": "finalizado",     ← ⭐ COMPLETADO             │
│ │   "progreso": 100,                                        │
│ │   "mensaje": "Simulación completada"                      │
│ │ }                                                          │
│ │                                                            │
│ ├─ Estado normalizado: "finalizado"                         │
│ └─ Ir a siguiente fase...                                   │
│                                                              │
│ LOGGING COMPLETO: console.log({                             │
│   ejecucionId: "sim_20260518_abc123",                       │
│   statusCode: 200,                                          │
│   statusOk: true,                                           │
│   data: { estado: "finalizado", ... }                       │
│ })                                                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Descarga de Resultados                                      │
│                                                              │
│ GET /api/simulaciones/sim_20260518.../pasos                 │
│ ├─ Response: 200 OK ✅                                      │
│ ├─ Datos: {                                                 │
│ │   "n_pasos": 20,                                          │
│ │   "pasos": [                                              │
│ │     { index: 0, matriz: [[...]], ... },                   │
│ │     { index: 1, matriz: [[...]], ... },                   │
│ │     ...                                                   │
│ │   ]                                                        │
│ │ }                                                          │
│ │                                                            │
│ └─ Almacenar en simulationStore                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ UI Actualizada                                              │
│                                                              │
│ ├─ Cerrar ExecutionModal.tsx automáticamente                │
│ ├─ Mostrar SimulationMap con resultados                     │
│ ├─ Actualizar StatsPanel con métricas                       │
│ └─ Mostrar resumen emergente                                │
│                                                              │
│ ✅ FLUJO COMPLETADO EXITOSAMENTE                            │
└─────────────────────────────────────────────────────────────┘
```

---

## COMPARACIÓN DE LÓGICA

### BÚSQUEDA DE ejecucion_id

| Caso | ANTES | DESPUÉS | Resultado |
|------|-------|---------|-----------|
| Backend retorna `ejecucion_id` | ❌ Falla | ✅ Funciona | Detecta correctamente |
| Backend retorna `id` | ❌ Falla | ✅ Funciona | Detecta como fallback |
| Backend retorna `execution_id` | ❌ Falla | ✅ Funciona | Detecta como variante |
| Backend retorna solo `simulation_id` | Flujo síncrono incorrecto | ✅ Funciona | Usa simulation_id |
| Backend retorna nada | ❌ Error silencioso | ✅ Error explícito | "Backend no retornó..." |

### MANEJO DE ERRORES

| Escenario | ANTES | DESPUÉS |
|-----------|-------|---------|
| GET retorna 404 | ❌ Reintenta 300 veces (5 min) | ✅ Detiene rápido + fallback |
| GET retorna 500 | ❌ "Error consultando estado" | ✅ "Error HTTP 500" + reintenta |
| Timeout (5 min) | Mensaje genérico | "Backend puede estar caído" |
| Respuesta vacía | Falla silenciosa | "Respuesta vacía del servidor" |

---

## LOGGING DE DEBUGGING

### Qué verás en Console cuando funcione:

```javascript
// 1. POST enviado
[executeSimulationAsync] Respuesta POST: {
  raw: {
    ejecucion_id: "sim_20260518_abc123",
    estado: "pendiente",
    mensaje: "Simulación encolada correctamente"
  },
  ejecucionId: "sim_20260518_abc123",
  simulationId: null,
  hasAsyncFlow: true,
  timestamp: "2026-05-18T14:30:00.000Z"
}

// 2. Polling inicio
[Polling 1/300] {
  ejecucionId: "sim_20260518_abc123",
  statusCode: 200,
  statusOk: true,
  data: { estado: "en_proceso", progreso: 0, mensaje: "Inicializando..." },
  timestamp: "2026-05-18T14:30:01.000Z"
}

// 3. Polling progresa
[Polling 5/300] {
  ejecucionId: "sim_20260518_abc123",
  statusCode: 200,
  statusOk: true,
  data: { estado: "en_proceso", progreso: 25, mensaje: "Generación 5 de 20" },
  timestamp: "2026-05-18T14:30:05.000Z"
}

// 4. Polling completa
[Polling 25/300] {
  ejecucionId: "sim_20260518_abc123",
  statusCode: 200,
  statusOk: true,
  data: { estado: "finalizado", progreso: 100, mensaje: "Completada" },
  timestamp: "2026-05-18T14:30:25.000Z"
}
```

### Qué verás si falla:

```javascript
// 1. Backend retorna solo simulation_id
[executeSimulationAsync] Respuesta POST: {
  ejecucionId: null,
  simulationId: 2,
  hasAsyncFlow: false
}

// ↓ Fallback a flujo síncrono
[executeSimulationAsync] Usando flujo síncrono (resultado inmediato)

// 2. Backend retorna estructura inesperada
[executeSimulationAsync] Error fatal: {
  message: "Backend no retornó ejecucion_id ni simulation_id",
  error: "Error: Backend no retornó..."
}

// 3. GET retorna 404 persistente
[Polling Error 1/300] {
  error: "Ejecución no encontrada (404)",
  timestamp: "2026-05-18T14:30:01.000Z"
}
// ↓ Intenta fallback
[getExecutionStatus] 404 con ejecucionId, intentando fallback a simulationId
```

---

## 🎯 CHECKLIST DE VERIFICACIÓN

Usa este checklist mientras debugueas:

```javascript
// Abrir Console (F12) y ejecutar esto:

console.group('🔍 DEBUG: Verificación de Configuración');

// 1. ¿Backend está accesible?
console.log('1. Ping a backend:');
fetch('http://localhost:8000/api/health/simulaciones')
  .then(r => r.json())
  .then(d => console.log('   ✅ Backend respondió:', d))
  .catch(e => console.log('   ❌ Backend no accesible:', e.message));

// 2. ¿Qué versión de API?
console.log('2. Versión de API:', api_version || 'desconocida');

// 3. ¿Token de autenticación?
const token = localStorage.getItem('auth_token');
console.log('3. Token:', token ? '✅ Presente' : '❌ Falta');

// 4. Base URL
console.log('4. Base URL:', 'http://localhost:8000');

console.groupEnd();

// Luego ejecutar simulación y ver logs...
```

---

**Diagrama preparado para:** SIMCORE Proyecto de Grado  
**Última actualización:** 2026-05-18  
**Versión:** 2.0 (con correcciones)
