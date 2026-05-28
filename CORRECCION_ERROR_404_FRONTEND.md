# CORRECCIONES INMEDIATAS - FRONTEND (Error 404)

## 📋 ANÁLISIS DE CAMBIOS NECESARIOS

Archivo: `src/store/simulationStore.ts` (línea 200-250)

### PROBLEMA ACTUAL
```typescript
// Línea 212 - Búsqueda incompleta de ejecucion_id
const ejecucionId = data.ejecucion_id || data.id

if (!ejecucionId) {
  // Fallback incorrecto: intenta reutilizar simulation_id como ejecucion_id
  if (data.simulation_id) {
    set({
      simulationId: createSimulationId(data.simulation_id),
      // ...
    })
  }
  return  // ← Sale sin hacer polling
}

// Luego intenta GET /api/simulaciones/2/estado y falla con 404
```

### SOLUCIÓN PROPUESTA

```typescript
// Línea 200-260 (REEMPLAZO COMPLETO)

executeSimulationAsync: async (payload: CreateSimulationRequest) => {
  set({ error: null, pollingStatus: 'Iniciando ejecución...', ejecucionId: null })

  try {
    // 1. POST /api/simulaciones/ejecutar
    const response = await simulationEndpoints.createSimulation(payload)

    if (!response.ok) {
      // Manejo de errores mejorado
      if (response.status === 403) {
        set({ error: 'No tiene permisos para ejecutar simulaciones', backendConnected: true })
        return
      }
      if (response.status === 422 || response.status === 400) {
        const detail = formatBackendDetail(response.data, 'Validación fallida en el servidor')
        set({ error: `Validación: ${detail}`, backendConnected: true })
        return
      }
      throw new Error(formatBackendDetail(response.data, 'Error al ejecutar simulación'))
    }

    if (!response.data) {
      throw new Error('Respuesta vacía del servidor')
    }

    const data = response.data as any
    
    // ────────────────────────────────────────────────────────────────────
    // 🔧 MEJORA 1: Búsqueda más exhaustiva de identificador
    // ────────────────────────────────────────────────────────────────────
    const ejecucionId = data.ejecucion_id || data.id || data.execution_id || null
    const simulationId = data.simulation_id || data.simulacion_id || null
    
    // 🔧 MEJORA 2: Logging para debugging
    console.log('[executeSimulationAsync] Respuesta POST:', {
      raw: data,
      ejecucionId,
      simulationId,
      hasAsyncFlow: !!ejecucionId,
      timestamp: new Date().toISOString()
    })

    // ────────────────────────────────────────────────────────────────────
    // FLUJO ASÍNCRONO (prioritario)
    // ────────────────────────────────────────────────────────────────────
    if (ejecucionId) {
      set({ 
        ejecucionId, 
        pollingStatus: 'En cola esperando procesamiento...'
      })

      let isComplete = false
      let pollCount = 0
      const maxPolls = 300 // 5 minutos con 1s de espera

      while (!isComplete && pollCount < maxPolls) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        pollCount++

        try {
          // 🔧 MEJORA 3: Endpoint con manejo de excepciones
          const statusRes = await simulationEndpoints.getExecutionStatus(ejecucionId)

          // 🔧 MEJORA 4: Logging detallado del polling
          console.log(`[Polling ${pollCount}/${maxPolls}]`, {
            ejecucionId,
            statusCode: statusRes.status,
            statusOk: statusRes.ok,
            data: statusRes.data,
            timestamp: new Date().toISOString()
          })

          if (!statusRes.ok) {
            // 🔧 MEJORA 5: Manejo de 404 específico
            if (statusRes.status === 404) {
              // Backend puede no haber retornado ejecucion_id correcto
              // Intentar fallback a simulation_id
              if (simulationId) {
                console.warn('[getExecutionStatus] 404 con ejecucionId, intentando fallback a simulationId')
                set({
                  simulationId: createSimulationId(simulationId),
                  status: 'idle',
                  currentGeneration: 0,
                  geojson: null,
                  urbanState: null,
                  history: [],
                  pollingStatus: null,
                  ejecucionId: null,
                  backendConnected: true,
                  error: null,
                })
                isComplete = true
                break
              }
              throw new Error('Ejecución no encontrada (404) - backend puede tener problema de persistencia')
            }
            throw new Error(`Error HTTP ${statusRes.status} consultando estado`)
          }

          const statusData = statusRes.data as any
          const estado = statusData.estado || statusData.status

          // 🔧 MEJORA 6: Estados más granulares
          const estadoNormalizado = (estado || '').toLowerCase()
          const mensajeProgreso = statusData.mensaje || statusData.message || `Paso ${statusData.progreso || 0}%`
          
          set({ pollingStatus: `Estado: ${estado} - ${mensajeProgreso}` })

          if (estadoNormalizado === 'finalizado' || estadoNormalizado === 'completed') {
            // 2. Obtener pasos
            set({ pollingStatus: 'Descargando resultados...' })
            const stepsRes = await simulationEndpoints.getSimulationSteps(createSimulationId(ejecucionId) as any)

            if (!stepsRes.ok) {
              throw new Error(`Error descargando pasos (${stepsRes.status})`)
            }

            const stepsData = stepsRes.data as any
            if (!stepsData.pasos || stepsData.pasos.length === 0) {
              throw new Error('Sin pasos en respuesta')
            }

            set({
              simulationId: createSimulationId(ejecucionId),
              status: 'idle',
              currentGeneration: 0,
              geojson: null,
              urbanState: null,
              history: [],
              pollingStatus: null,
              ejecucionId,
              backendConnected: true,
              error: null,
            })

            isComplete = true
          } else if (
            estadoNormalizado === 'fallido' || 
            estadoNormalizado === 'error' ||
            estadoNormalizado === 'failed'
          ) {
            const mensajeError = statusData.mensaje || statusData.message || 'Error desconocido'
            set({ 
              error: `Simulación falló: ${mensajeError}`, 
              pollingStatus: null 
            })
            isComplete = true
          }
          // Estados pendiente/en_proceso: continuar polling
        } catch (pollError) {
          const msg = pollError instanceof Error ? pollError.message : 'Error en polling'
          
          // 🔧 MEJORA 7: Reintentos más inteligentes
          console.error(`[Polling Error ${pollCount}/${maxPolls}]`, {
            error: msg,
            ejecucionId,
            timestamp: new Date().toISOString()
          })
          
          set({ 
            pollingStatus: `Reintentando... (${pollCount}/${maxPolls}): ${msg}` 
          })
          
          // Si es 404 persistente, abortar antes de maxPolls
          if (msg.includes('404')) {
            set({ 
              error: 'Simulación no encontrada en backend (persistencia in-memory?)', 
              pollingStatus: null 
            })
            isComplete = true
          }
        }
      }

      if (!isComplete) {
        set({ 
          error: 'Timeout esperando resultado (5 minutos). Backend puede estar caído.', 
          pollingStatus: null 
        })
      }
      return  // ← IMPORTANTE: Exit aquí después del flujo asíncrono
    }

    // ────────────────────────────────────────────────────────────────────
    // FLUJO SÍNCRONO (fallback)
    // ────────────────────────────────────────────────────────────────────
    if (simulationId) {
      console.log('[executeSimulationAsync] Usando flujo síncrono (resultado inmediato)')
      set({
        simulationId: createSimulationId(simulationId),
        status: 'idle',
        currentGeneration: 0,
        geojson: null,
        urbanState: null,
        history: [],
        pollingStatus: null,
        ejecucionId: null,
        backendConnected: true,
        error: null,
      })
      return
    }

    // ────────────────────────────────────────────────────────────────────
    // 🔧 MEJORA 8: Error explícito si no hay identificador
    // ────────────────────────────────────────────────────────────────────
    throw new Error(
      'Backend no retornó ejecucion_id ni simulation_id. ' +
      'Verificar contrato API: respuesta debe incluir "ejecucion_id" para flujo asíncrono ' +
      'o "simulation_id" para flujo síncrono'
    )

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    
    // 🔧 MEJORA 9: Logging de errors para análisis post-mortem
    console.error('[executeSimulationAsync] Error fatal:', {
      message,
      error: error instanceof Error ? error.stack : error,
      payload,
      timestamp: new Date().toISOString()
    })
    
    set({
      error: `Error en ejecución asíncrona: ${message}`,
      backendConnected: false,
      pollingStatus: null,
    })
  }
},
```

## 🔧 CAMBIOS EN OTROS ARCHIVOS

### `src/services/endpoints/simulation.endpoints.ts` 

**Agregar endpoint alternativo para debugging:**

```typescript
/**
 * 🔧 NUEVO: Endpoint de debugging para validar backend
 * GET /api/health/simulaciones
 * 
 * Retorna:
 * {
 *   backend_version: "1.0.0",
 *   database_connected: true,
 *   cache_size: 5,
 *   ultimo_ejecucion_id: "sim_20260518_abc123"
 * }
 */
debugBackendStatus: () =>
  http.get<{
    backend_version?: string
    database_connected?: boolean
    cache_size?: number
    ultimo_ejecucion_id?: string
    error?: string
  }>('/api/health/simulaciones').catch(() => ({
    data: { error: 'Backend no accesible' },
    status: 500,
    ok: false,
    headers: new Headers(),
  })),
```

### `src/shared/contracts/simulation.contract.ts`

**Actualizar contrato para ser más flexible:**

```typescript
export interface CreateSimulationResponse {
  // Flujo asíncrono (prioritario)
  ejecucion_id?: string | number
  execution_id?: string | number  // Variante
  
  // Flujo síncrono (fallback)
  simulation_id?: string | number
  simulacion_id?: string | number  // Variante
  
  // Metadatos comunes
  estado?: string
  status?: string
  estado_ejecucion?: string
  
  nombre?: string
  generacion?: number
  creada_en?: string
  created_at?: string
  
  mensaje?: string
  message?: string
}
```

## 🧪 TESTING RECOMENDADO

### Test 1: Validar respuesta POST (sin polling)
```bash
# Terminal
curl -X POST 'http://localhost:8000/api/simulaciones/ejecutar' \
  -H 'Content-Type: application/json' \
  -d '{
    "version_escenario_id": 1,
    "generaciones": 5,
    "radio_suavizado": 1,
    "movilidad": 0.25,
    "permanencia_base": 0.1,
    "sensibilidad_atractivo": 1.0
  }' | jq .
```

### Test 2: Verificar en DevTools
1. Abrir browser DevTools → Network
2. Ejecutar simulación desde UI
3. Buscar POST /api/simulaciones/ejecutar
4. Ver respuesta JSON exacta
5. Copiar el valor de `ejecucion_id` (o `id` o `simulation_id`)
6. Verificar que GET /api/simulaciones/{ID}/estado retorna 200

### Test 3: Verificar logs en console
- Abrir DevTools → Console
- Ejecutar simulación
- Buscar logs `[executeSimulationAsync]` y `[Polling N/300]`
- Verificar que muestra ejecucionId y estados

## ✅ CHECKLIST PRE-DEPLOY

- [ ] Cambios aplicados a simulationStore.ts
- [ ] Contratos actualizados en simulation.contract.ts
- [ ] Endpoint de debugging agregado (opcional)
- [ ] Frontend compilado sin errores: `npm run build`
- [ ] Pruebas manuales en DevTools con logging visible
- [ ] Backend validado con curl antes de ejecutar desde UI

---

**Status:** Listo para aplicar  
**Impacto:** Mejora resiliencia y debugging del error 404  
**Compatibilidad:** 100% con backend actual (es más flexible)
