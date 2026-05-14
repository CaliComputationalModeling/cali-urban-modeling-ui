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
        const radio = Math.max(1, Math.floor((config.filas + config.columnas) / 50))
        const movilidad = Math.min(1, Math.max(0, config.agentes_iniciales / 1000))

        const request: CreateSimulationRequest = {
          version_escenario_id: 1,
          generaciones: get().maxGenerations,
          radio_suavizado: radio,
          movilidad,
          permanencia_base: 0.1,
          sensibilidad_atractivo: 1.0,
        }

        const response = await simulationEndpoints.createSimulation(request)

        // ✅ Condiciones separadas para narrowing correcto
        if (!response.ok) {
          if (response.status === 403) {
            set({ error: 'No tiene permisos para crear simulaciones', backendConnected: true })
            return
          }
          throw new Error((response.data as any)?.error || 'No se pudo crear la simulación')
        }
        if (!response.data) {
          throw new Error('No se pudo crear la simulación')
        }

        const data: CreateSimulationResponse = response.data

        set({
          simulationId: createSimulationId(data.simulation_id),
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
            const detail = (response.data as any)?.detail || 'Validación fallida en el servidor'
            set({ error: `Validación: ${detail}`, backendConnected: true })
            return
          }
          throw new Error((response.data as any)?.detail || 'Error al ejecutar simulación')
        }

        if (!response.data) {
          throw new Error('Respuesta vacía del servidor')
        }

        const data = response.data as any
        const ejecucionId = data.ejecucion_id || data.id

        if (!ejecucionId) {
          // Flujo síncrono: backend devolvió simulation_id directamente
          if (data.simulation_id) {
            set({
              simulationId: createSimulationId(data.simulation_id),
              status: 'idle',
              currentGeneration: 0,
              geojson: null,
              urbanState: null,
              history: [],
              pollingStatus: null,
              ejecucionId: null,
              backendConnected: true,
            })
          }
          return
        }

        // Flujo asíncrono: hacer polling
        set({ ejecucionId, pollingStatus: 'En cola esperando procesamiento...' })

        let isComplete = false
        let pollCount = 0
        const maxPolls = 300 // 5 minutos con 1s de espera

        while (!isComplete && pollCount < maxPolls) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          pollCount++

          try {
            const statusRes = await simulationEndpoints.getExecutionStatus(ejecucionId)

            if (!statusRes.ok) {
              throw new Error('Error consultando estado')
            }

            const statusData = statusRes.data as any
            const estado = statusData.estado

            set({ pollingStatus: `Estado: ${estado}` })

            if (estado === 'finalizado') {
              // 2. Obtener pasos
              set({ pollingStatus: 'Descargando resultados...' })
              const stepsRes = await simulationEndpoints.getSimulationSteps(createSimulationId(ejecucionId) as any)

              if (!stepsRes.ok) {
                throw new Error('Error descargando pasos')
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
            } else if (estado === 'fallido' || estado === 'error') {
              set({ error: `Simulación falló: ${statusData.mensaje || 'Error desconocido'}`, pollingStatus: null })
              isComplete = true
            }
          } catch (pollError) {
            const msg = pollError instanceof Error ? pollError.message : 'Error en polling'
            set({ pollingStatus: `Reintentando... (${pollCount}/${maxPolls}): ${msg}` })
          }
        }

        if (!isComplete) {
          set({ error: 'Timeout esperando resultado (5 minutos)', pollingStatus: null })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido'
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