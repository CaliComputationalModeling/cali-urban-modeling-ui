# Guía de Integración y Prueba: Ejecución Asíncrona de Simulaciones

## Resumen de Cambios Implementados en Frontend

### 1. Endpoints Nuevos / Actualizados

**Archivo:** `src/services/endpoints/simulation.endpoints.ts`

- ✅ `createSimulation(data)` → `POST /api/simulaciones/ejecutar`  
  Devuelve: `{ ejecucion_id?, simulation_id?, estado?, ... }`

- ✅ `getExecutionStatus(ejecucionId)` → `GET /api/simulaciones/{ejecucionId}/estado`  
  Devuelve: `{ estado: string, progreso?: number, mensaje?: string }`

- ✅ `getSimulationSteps(simulationId)` → `GET /api/simulaciones/{id}/pasos`  
  Devuelve: `{ n_pasos, pasos: [...], meta: { filas, columnas, bbox, crs } }`

### 2. Lógica de Polling en el Store

**Archivo:** `src/store/simulationStore.ts`

Nueva acción: `executeSimulationAsync(payload: CreateSimulationRequest)`

**Flujo:**
1. **POST /api/simulaciones/ejecutar** con payload
2. **Detectar modo:**
   - Si respuesta tiene `simulation_id` → flujo **síncrono**: setear simulationId y retornar
   - Si respuesta tiene `ejecucion_id` → flujo **asíncrono**: iniciar polling
3. **Polling de estado:**
   - GET /api/simulaciones/{ejecucion_id}/estado cada 1 segundo
   - Estados esperados: `"pendiente"`, `"en_proceso"`, `"finalizado"`, `"fallido"`
   - Máx. 300 intentos (5 minutos)
   - Mostrar status en UI (`pollingStatus`)
4. **Cuando estado = "finalizado":**
   - GET /api/simulaciones/{ejecucion_id}/pasos
   - Procesar pasos y setear simulationId
5. **Manejo de errores:**
   - 403 → "No tiene permisos para ejecutar simulaciones"
   - 400/422 → mostrar detalle de validación
   - 500 → "Error interno del servidor"
   - Timeout (300 intentos) → "Timeout esperando resultado (5 minutos)"

### 3. Componentes UI Actualizados

**ExecutionModal.tsx:**
- Input para `version_escenario_id` (obligatorio)
- Input para `generaciones` / pasos (1-5000)
- Muestra spinner y `pollingStatus` mientras ejecuta
- Cierra automáticamente cuando finaliza sin error
- Muestra error si API devuelve 403/422/500

**ControlPanel.tsx:**
- Barra de estado de polling (azul, con horólogo ⏳)
- Desactiva botones de transporte durante polling

---

## Validación Previa del Contrato

Antes de ejecutar pruebas, **verifica con el backend:**

### ✅ Validar Respuesta POST /api/simulaciones/ejecutar

**Envía este cURL:**
```bash
curl -X POST 'http://localhost:8000/api/simulaciones/ejecutar' \
  -H 'Content-Type: application/json' \
  -b "access_token=TOKEN_DE_PRUEBA" \
  -d '{
    "version_escenario_id": 1,
    "generaciones": 5,
    "radio_suavizado": 1,
    "movilidad": 0.25,
    "permanencia_base": 0.1,
    "sensibilidad_atractivo": 1.0
  }' -v
```

**Respuesta esperada (asíncrona - RECOMENDADA):**
```json
HTTP/1.1 201 Created

{
  "ejecucion_id": "abc-123" | 456,
  "estado": "pendiente",
  "mensaje": "Simulación encolada correctamente"
}
```

**Respuesta alternativa (síncrona - si tiempo < 2s):**
```json
HTTP/1.1 200 OK

{
  "simulation_id": 789,
  "estado": "finalizado",
  "mensaje": "Simulación completada exitosamente"
}
```

---

## Validación de Endpoints de Polling

Una vez que tengas `ejecucion_id` del POST anterior:

### 1. Obtener Estado (cada 1 segundo)
```bash
curl -X GET 'http://localhost:8000/api/simulaciones/{ejecucion_id}/estado' \
  -H 'Authorization: Bearer TOKEN' \
  -v
```

**Respuesta esperada:**
```json
{
  "estado": "en_proceso",
  "progreso": 45,
  "mensaje": "Generación 5 de 5"
}
```

Estados válidos:
- `"pendiente"` → en cola
- `"en_proceso"` → ejecutándose
- `"finalizado"` → completada
- `"fallido"` o `"error"` → error

### 2. Obtener Pasos/Resultados (cuando estado="finalizado")
```bash
curl -X GET 'http://localhost:8000/api/simulaciones/{ejecucion_id}/pasos' \
  -H 'Authorization: Bearer TOKEN' \
  -v
```

**Respuesta esperada:**
```json
{
  "ejecucion_id": 123,
  "n_pasos": 5,
  "pasos": [
    {
      "index": 0,
      "matriz": [
        [0.1, 0.2, 0.0],
        [0.5, 0.3, 0.1],
        [0.0, 0.2, 0.4]
      ],
      "atractivo": [[0.8, 0.5, 0.2], [...], [...]]
    },
    {
      "index": 1,
      "matriz": [[...], [...], [...]]
    }
  ],
  "meta": {
    "filas": 3,
    "columnas": 3,
    "bbox": [-76.60, 3.30, -76.45, 3.60],
    "crs": "EPSG:4326"
  }
}
```

---

## Pruebas desde el Frontend

### Test 1: Flujo Asíncrono Completo
1. Abre http://localhost:5173
2. Click en "Ejecutar Simulación"
3. Ingresa `version_escenario_id = 1`, `generaciones = 5`
4. Click "Ejecutar"
5. **Observar:**
   - Spinner con "En cola esperando procesamiento..." → "Estado: en_proceso" → "Estado: finalizado"
   - Barra azul en ControlPanel mostrando progreso
   - Modal cierra automáticamente cuando finaliza
   - Mapa actualiza con resultados

### Test 2: Validación de Errores
1. Click en "Ejecutar Simulación"
2. Ingresa `generaciones = 10000` (si máx es 5000)
3. Click "Ejecutar"
4. **Observar:** Error 422 con mensaje "generaciones excede máximo"

### Test 3: Falta de Permisos
1. Usar JWT con `role_id` ≠ 2 y ≠ 3
2. Click en "Ejecutar Simulación"
3. Click "Ejecutar"
4. **Observar:** Error 403 "No tiene permisos para ejecutar simulaciones"

---

## Estructura de Tipos (para backend)

**Request Body (`CreateSimulationRequest`):**
```typescript
{
  version_escenario_id: number      // int, requerido
  generaciones: number              // int, requerido (1-5000)
  radio_suavizado: number           // int, optional (0-5, default 1)
  movilidad: number                 // float, requerido (0.0-1.0)
  permanencia_base: number          // float, requerido (0.0-1.0)
  sensibilidad_atractivo: number    // float, requerido (0.0-10.0)
}
```

**Response (Asíncrona):**
```typescript
{
  ejecucion_id: string | number
  estado: "pendiente" | "en_proceso" | "finalizado" | "fallido"
  mensaje: string
}
```

**Response Status (Polling):**
```typescript
{
  estado: "pendiente" | "en_proceso" | "finalizado" | "fallido"
  progreso?: number                 // 0-100 (opcional)
  mensaje?: string
}
```

**Response Pasos:**
```typescript
{
  ejecucion_id: string | number
  n_pasos: number
  pasos: {
    index: number
    matriz: List[List[float]]       // Densidad [filas][columnas]
    atractivo?: List[List[float]]   // Atractivo opcional
  }[]
  meta: {
    filas: number
    columnas: number
    bbox: [minLon, minLat, maxLon, maxLat]  // EPSG:4326
    crs: "EPSG:4326"
  }
}
```

---

## Resolución de Problemas

### ❌ Error: "400 Bad Request"
- Revisa que el payload tenga TODOS los campos requeridos
- Valida tipos: `version_escenario_id` es int, `movilidad` es float, etc.
- Backend debe devolver `{ "detail": "campo faltante o tipo inválido", "code": "...", "errors": {...} }`

### ❌ Error: "422 Unprocessable Entity"
- Indica fallo de validación Pydantic (rango, tipo, restricción)
- Ejemplo: `movilidad = 1.5` (> 1.0) → error
- Backend devuelve detalle de qué campo falla

### ❌ Error: "403 Forbidden"
- Usuario NO tiene role de Coordinador (2) o Jefe (3)
- Verificar que el JWT en cookie `access_token` tenga `role_id: 2` o `3`

### ❌ Polling timeout (5 minutos)
- Backend está muy lento o no responde a GET /estado
- Aumentar timeout en `simulationStore.ts` línea ~195: cambiar `maxPolls: 300` a 600

### ❌ No se cargan los pasos en el mapa
- Verificar que GET /api/simulaciones/{id}/pasos devuelva array `pasos` con al menos 1 elemento
- Frontend convierte matrices a GeoJSON automáticamente (ver `matrixToGeoJson` en `utils.ts`)

---

## Próximos Pasos (No Implementados Aún)

- [ ] RBAC: Deshabilitar botones si `role_id` ≠ 2,3
- [ ] Rutas/flows: GET /api/mapas/rutas/{ejecucion_id} → polilines con arrowheads
- [ ] Comparación de simulaciones: GET /api/simulaciones/comparar
- [ ] Reportes: POST /api/reportes/generar → descarga PDF/XLS
- [ ] Caché: notificaciones cuando datos se actualizan en BD

---

**Fecha de Creación:** 14 Maio 2026  
**Versión Frontend:** 1.0-async  
**Estado:** Listo para testing con backend
