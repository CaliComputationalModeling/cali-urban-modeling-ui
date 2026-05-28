import { create } from 'zustand'
import { simulationEndpoints } from '@/services/endpoints'
import {
  type SimulationId,
  type SimulationStatus,
  type HistoryPoint,
  type GeoJsonResponse,
  type UrbanState,
  createSimulationId,
  SPEED_OPTIONS,
  type CreateSimulationRequest,
  type CreateSimulationResponse,
  type RunStepResponse,
} from '@/shared/contracts/simulation.contract'
import type { CreateSimulationFormData } from '@/shared/types/simulation.types'

function formatBackendDetail(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object' || !('detail' in data)) return fallback

  const detail = (data as { detail: unknown }).detail
  if (typeof detail === 'string') return detail
  if (!Array.isArray(detail)) return JSON.stringify(detail)

  return detail
    .map((item) => {
      if (!item || typeof item !== 'object') return String(item)
      const error = item as { loc?: unknown[]; msg?: unknown; type?: unknown }
      const loc = Array.isArray(error.loc) ? error.loc.join('.') : 'body'
      return `${loc}: ${String(error.msg ?? error.type ?? 'validacion invalida')}`
    })
    .join(' | ')
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

let tickTimer: ReturnType<typeof setTimeout> | null = null

function clearTick() {
  if (tickTimer !== null) {
    clearTimeout(tickTimer)
    tickTimer = null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STORE STATE
// ─────────────────────────────────────────────────────────────────────────────

export interface SimulationStoreState {
  simulationId: SimulationId | null
  status: SimulationStatus
  currentGeneration: number
  maxGenerations: number
  speed: number
  geojson: GeoJsonResponse | null
  urbanState: UrbanState | null
  history: HistoryPoint[]
  error: string | null
  retryCount: number
  backendConnected: boolean
  pollingStatus: string | null
  ejecucionId: string | null

  createSimulation: (config: CreateSimulationFormData) => Promise<void>
  executeSimulationAsync: (payload: CreateSimulationRequest) => Promise<void>
  setSimulationId: (id: SimulationId) => void
  disconnect: () => void
  startSimulation: () => void
  pauseSimulation: () => void
  stepSimulation: () => Promise<void>
  resetSimulation: () => Promise<void>
  setSpeed: (ms: number) => void
  setMaxGenerations: (max: number) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_STATE = {
  simulationId: null,
  status: 'idle' as SimulationStatus,
  currentGeneration: 0,
  maxGenerations: 100,
  speed: SPEED_OPTIONS.NORMAL,
  geojson: null,
  urbanState: null,
  history: [],
  error: null,
  retryCount: 0,
  backendConnected: true,
  pollingStatus: null,
  ejecucionId: null,
}

// ─────────────────────────────────────────────────────────────────────────────
// ZUSTAND STORE
// ─────────────────────────────────────────────────────────────────────────────

export const useSimulationStore = create<SimulationStoreState>((set, get) => {
  function scheduleTick() {
    clearTick()
    tickTimer = setTimeout(async () => {
      const state = get()

      if (state.status !== 'running') return

      if (state.currentGeneration >= state.maxGenerations) {
        clearTick()
        set({ status: 'completed' })
        return
      }

      await get().stepSimulation()

      if (get().status === 'running') {
        scheduleTick()
      }
    }, get().speed)
  }

  return {
    ...INITIAL_STATE,

    // ─────────────────────────────────────────────────────────────────────────
    // ACCIÓN: Crear nueva simulación
    // ─────────────────────────────────────────────────────────────────────────

    createSimulation: async (config: CreateSimulationFormData) => {
      set({ error: null })

      try {
        // ✅ Mapear directamente los parámetros del formulario al request del backend
        // Los valores ya vienen validados por Zod desde el formulario
        const request: CreateSimulationRequest = {
          version_escenario_id: config.version_escenario_id,
          generaciones: config.generaciones,
          radio_suavizado: config.radio_suavizado,
          movilidad: config.movilidad,
          permanencia_base: config.permanencia_base,
          sensibilidad_atractivo: config.sensibilidad_atractivo,
        }

        console.log('[createSimulation] Enviando payload:', request)

        const response = await simulationEndpoints.createSimulation(request)

        // ✅ Condiciones separadas para narrowing correcto
        if (!response.ok) {
          if (response.status === 403) {
            set({ error: 'No tiene permisos para crear simulaciones', backendConnected: true })
            return
          }
          if (response.status === 400 || response.status === 422) {
            const detail = formatBackendDetail(response.data, 'Error de validación')
            console.error('[createSimulation] Error 400/422:', detail, response.data)
            set({ error: `Error de validación: ${detail}`, backendConnected: true })
            return
          }
          throw new Error((response.data as any)?.error || 'No se pudo crear la simulación')
        }
        if (!response.data) {
          throw new Error('No se pudo crear la simulación')
        }

        const data: CreateSimulationResponse = response.data
        const simId = data.simulation_id || data.simulacion_id

        if (!simId) {
          console.error('[createSimulation] Respuesta sin ID:', data)
          throw new Error('Backend no retornó simulation_id ni simulacion_id')
        }

        console.log('[createSimulation] Simulación creada exitosamente:', simId)

        set({
          simulationId: createSimulationId(String(simId)),
          status: 'idle',
          currentGeneration: 0,
          geojson: null,
          urbanState: null,
          history: [],
          error: null,
          retryCount: 0,
          backendConnected: true,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido'
        console.error('[createSimulation] Error:', message, error)
        set({
          error: `Error al crear simulación: ${message}`,
          backendConnected: false,
        })
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ACCIÓN: Ejecutar simulación de forma asíncrona (con polling)
    // ─────────────────────────────────────────────────────────────────────────

    executeSimulationAsync: async (payload: CreateSimulationRequest) => {
      set({ error: null, pollingStatus: 'Iniciando ejecución...', ejecucionId: null })

      try {
        // 1. POST /api/simulaciones/ejecutar
        const response = await simulationEndpoints.createSimulation(payload)

        if (!response.ok) {
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

        // 🔧 MEJORA 1: Búsqueda más exhaustiva de identificador asíncrono
        const ejecucionId = data.ejecucion_id || data.id || data.execution_id || null
        const simulationId = data.simulation_id || data.simulacion_id || null

        // 🔧 MEJORA 2: Logging para debugging
        console.log('[executeSimulationAsync] Respuesta POST:', {
          raw: data,
          ejecucionId,
          simulationId,
          hasAsyncFlow: !!ejecucionId,
          timestamp: new Date().toISOString(),
        })

        // ─────────────────────────────────────────────────────────────────────────
        // FLUJO ASÍNCRONO (prioritario)
        // ─────────────────────────────────────────────────────────────────────────
        if (ejecucionId) {
          set({
            ejecucionId,
            pollingStatus: 'En cola esperando procesamiento...',
          })

          let isComplete = false
          let pollCount = 0
          const maxPolls = 300 // 5 minutos con 1s de espera

          while (!isComplete && pollCount < maxPolls) {
            await new Promise((resolve) => setTimeout(resolve, 1000))
            pollCount++

            try {
              const statusRes = await simulationEndpoints.getExecutionStatus(ejecucionId)

              // 🔧 MEJORA 4: Logging detallado del polling
              console.log(`[Polling ${pollCount}/${maxPolls}]`, {
                ejecucionId,
                statusCode: statusRes.status,
                statusOk: statusRes.ok,
                data: statusRes.data,
                timestamp: new Date().toISOString(),
              })

              if (!statusRes.ok) {
                // 🔧 MEJORA 5: Manejo de 404 específico
                if (statusRes.status === 404) {
                  // Backend puede no haber retornado ejecucion_id correcto
                  // Intentar fallback a simulation_id
                  if (simulationId) {
                    console.warn('[getExecutionStatus] 404 con ejecucionId, intentando fallback a simulationId', {
                      ejecucionId,
                      simulationId,
                    })
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

              // 🔧 MEJORA 6: Estados más granulares y normalizados
              const estadoNormalizado = (estado || '').toLowerCase()
              const mensajeProgreso = statusData.mensaje || statusData.message || `Progreso: ${statusData.progreso || 0}%`

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
                  pollingStatus: null,
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
                timestamp: new Date().toISOString(),
              })

              set({
                pollingStatus: `Reintentando... (${pollCount}/${maxPolls}): ${msg}`,
              })

              // Si es 404 persistente, abortar antes de maxPolls
              if (msg.includes('404')) {
                set({
                  error: 'Simulación no encontrada en backend (persistencia in-memory?)',
                  pollingStatus: null,
                })
                isComplete = true
              }
            }
          }

          if (!isComplete) {
            set({
              error: 'Timeout esperando resultado (5 minutos). Backend puede estar caído.',
              pollingStatus: null,
            })
          }
          return // ← IMPORTANTE: Exit aquí después del flujo asíncrono
        }

        // ─────────────────────────────────────────────────────────────────────────
        // FLUJO SÍNCRONO (fallback)
        // ─────────────────────────────────────────────────────────────────────────
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

        // ─────────────────────────────────────────────────────────────────────────
        // 🔧 MEJORA 8: Error explícito si no hay identificador
        // ─────────────────────────────────────────────────────────────────────────
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
          timestamp: new Date().toISOString(),
        })

        set({
          error: `Error en ejecución asíncrona: ${message}`,
          backendConnected: false,
          pollingStatus: null,
        })
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ACCIÓN: Conectar a simulación existente
    // ─────────────────────────────────────────────────────────────────────────

    setSimulationId: (id: SimulationId) => {
      set({
        simulationId: id,
        status: 'idle',
        currentGeneration: 0,
        geojson: null,
        urbanState: null,
        history: [],
        error: null,
        retryCount: 0,
        backendConnected: true,
      })
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ACCIÓN: Desconectar simulación
    // ─────────────────────────────────────────────────────────────────────────

    disconnect: () => {
      clearTick()
      set({
        simulationId: null,
        status: 'idle',
        currentGeneration: 0,
        geojson: null,
        urbanState: null,
        history: [],
        error: null,
        retryCount: 0,
      })
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ACCIÓN: Iniciar simulación
    // ─────────────────────────────────────────────────────────────────────────

    startSimulation: () => {
      const { simulationId, status } = get()
      if (!simulationId || status === 'running') return

      set({ status: 'running', error: null, retryCount: 0, backendConnected: true })
      scheduleTick()
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ACCIÓN: Pausar simulación
    // ─────────────────────────────────────────────────────────────────────────

    pauseSimulation: () => {
      clearTick()
      if (get().status === 'running') {
        set({ status: 'paused' })
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ACCIÓN: Ejecutar 1 paso (manual o dentro del loop)
    // ─────────────────────────────────────────────────────────────────────────

    stepSimulation: async () => {
      const { simulationId, status } = get()

      if (!simulationId || status === 'running' || status === 'completed') return

      set({ error: null })

      try {
        const response = await simulationEndpoints.runStep(simulationId, 1)

        // ✅ Condiciones separadas para narrowing correcto
        if (!response.ok) {
          if (response.status === 403) {
            set({ status: 'idle', error: 'No tiene permisos para ejecutar simulaciones', backendConnected: true })
            return
          }
          throw new Error(response.data?.error || 'Error al ejecutar paso')
        }
        if (!response.data) {
          throw new Error('Error al ejecutar paso')
        }

        const data: RunStepResponse = response.data

        if (!data.success) {
          throw new Error(data.error || 'Fallo en ejecución del paso')
        }

        const geojson: GeoJsonResponse = data.geojson
        const urbanState: UrbanState = data.urban_state

        const newHistoryPoint: HistoryPoint = {
          generacion: urbanState.generacion,
          total_agentes: urbanState.total_agentes,
          en_transito: urbanState.en_transito,
          en_comedor: urbanState.en_comedor,
          en_cambuche: urbanState.en_cambuche,
          zona_consumo: urbanState.zona_consumo,
          zona_repulsora: urbanState.zona_repulsora,
          timestamp: Date.now(),
        }

        set((state) => ({
          geojson,
          urbanState,
          currentGeneration: urbanState.generacion,
          retryCount: 0,
          backendConnected: true,
          error: null,
          history: [...state.history, newHistoryPoint].slice(-50),
          status: urbanState.completada ? 'completed' : state.status,
        }))

        if (urbanState.completada && get().status === 'completed') {
          clearTick()
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido'
        const newRetryCount = get().retryCount + 1

        if (newRetryCount >= 3) {
          clearTick()
          set({
            status: 'error',
            error: `Error de conexión tras ${newRetryCount} reintentos. Simulación pausada.`,
            retryCount: newRetryCount,
            backendConnected: false,
          })
        } else {
          set({
            retryCount: newRetryCount,
            error: `Reintentando... (${newRetryCount}/3): ${message}`,
          })
        }
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ACCIÓN: Resetear simulación
    // ─────────────────────────────────────────────────────────────────────────

    resetSimulation: async () => {
      clearTick()
      const { simulationId } = get()

      if (!simulationId) {
        set({
          status: 'idle',
          currentGeneration: 0,
          geojson: null,
          urbanState: null,
          history: [],
          error: null,
        })
        return
      }

      try {
        const response = await simulationEndpoints.resetSimulation(simulationId)

        if (response.ok) {
          set({
            status: 'idle',
            currentGeneration: 0,
            geojson: null,
            urbanState: null,
            history: [],
            error: null,
            retryCount: 0,
            backendConnected: true,
          })
        } else {
          set({ error: 'No se pudo resetear la simulación' })
        }
      } catch (error) {
        set({
          error: 'Error al resetear: ' + (error instanceof Error ? error.message : 'Desconocido'),
        })
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ACCIÓN: Cambiar velocidad
    // ─────────────────────────────────────────────────────────────────────────

    setSpeed: (ms: number) => {
      set({ speed: ms })
      if (get().status === 'running') {
        scheduleTick()
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ACCIÓN: Establecer máximo de generaciones
    // ─────────────────────────────────────────────────────────────────────────

    setMaxGenerations: (max: number) => {
      set({ maxGenerations: Math.max(1, max) })
    },
  }
})
