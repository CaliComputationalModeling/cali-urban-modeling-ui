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
// Timer variable a nivel de módulo para limpieza determinista
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
  // Identificadores
  simulationId: SimulationId | null

  // Control de ejecución
  status: SimulationStatus
  currentGeneration: number
  maxGenerations: number
  speed: number // intervalMs (500, 1000, 2000)

  // Datos actuales (desde endpoint unificado)
  geojson: GeoJsonResponse | null
  urbanState: UrbanState | null

  // Histórico para gráficas
  history: HistoryPoint[]

  // Indicadores de estado
  error: string | null
  retryCount: number
  backendConnected: boolean

  // Acciones
  createSimulation: (config: CreateSimulationFormData) => Promise<void>
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
}

// ─────────────────────────────────────────────────────────────────────────────
// ZUSTAND STORE
// ─────────────────────────────────────────────────────────────────────────────

export const useSimulationStore = create<SimulationStoreState>((set, get) => {
  /**
   * Programa el siguiente tick del loop de simulación
   * Usa setTimeout recursivo para evitar acumulación de requestos
   */
  function scheduleTick() {
    clearTick()
    tickTimer = setTimeout(async () => {
      const state = get()

      // Solo ejecutar si status === 'running'
      if (state.status !== 'running') return

      // Verificar si hemos alcanzado el máximo de generaciones
      if (state.currentGeneration >= state.maxGenerations) {
        clearTick()
        set({ status: 'completed' })
        return
      }

      // Ejecutar paso
      await get().stepSimulation()

      // Programar siguiente tick si aún estamos corriendo
      if (get().status === 'running') {
        scheduleTick()
      }
    }, get().speed)
  }

  return {
    // ESTADO INICIAL
    ...INITIAL_STATE,

    // ─────────────────────────────────────────────────────────────────────────
    // ACCIÓN: Crear nueva simulación
    // POST /api/simulations/espacial → Crea simulación con configuración
    // ─────────────────────────────────────────────────────────────────────────

    createSimulation: async (config: CreateSimulationFormData) => {
      set({ error: null })

      try {
        const request: CreateSimulationRequest = {
          nombre: config.nombre,
          descripcion: config.descripcion,
          grid_config: {
            filas: config.filas,
            columnas: config.columnas,
            boundary_mode: 'toroidal',
            neighborhood_type: 'moore',
            geospatial_bounds: {
              lat_min: 3.38,
              lat_max: 3.5,
              lon_min: -76.56,
              lon_max: -76.46,
            },
          },
          agentes_iniciales: config.agentes_iniciales,
          max_generaciones: 1000,
        }

        const response = await simulationEndpoints.createSimulation(request)

        if (!response.ok || !response.data) {
          throw new Error(response.data?.error || 'No se pudo crear la simulación')
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
    // POST /api/simulations/{id}/run-espacial
    // RESPUESTA UNIFICADA: { geojson, urban_state, success, error }
    // ─────────────────────────────────────────────────────────────────────────

    stepSimulation: async () => {
      const { simulationId, status } = get()

      // Evitar ejecuciones mientras está corriendo automáticamente
      if (!simulationId || status === 'running' || status === 'completed') return

      set({ error: null })

      try {
        // ✨ ENDPOINT UNIFICADO: 1 request que devuelve TODO
        const response = await simulationEndpoints.runStep(simulationId, 1)

        if (!response.ok || !response.data) {
          throw new Error(response.data?.error || 'Error al ejecutar paso')
        }

        const data: RunStepResponse = response.data

        if (!data.success) {
          throw new Error(data.error || 'Fallo en ejecución del paso')
        }

        // Extraer datos de respuesta unificada
        const geojson: GeoJsonResponse = data.geojson
        const urbanState: UrbanState = data.urban_state

        // Construir punto de histórico para gráfica
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

        // Actualizar store
        set((state) => ({
          geojson,
          urbanState,
          currentGeneration: urbanState.generacion,
          retryCount: 0,
          backendConnected: true,
          error: null,
          history: [...state.history, newHistoryPoint].slice(-50), // Mantener últimos 50

          // Si backend dice completada, transicionar
          status: urbanState.completada ? 'completed' : state.status,
        }))

        // Si completada y estamos corriendo, parar loop
        if (urbanState.completada && get().status === 'completed') {
          clearTick()
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido'
        const newRetryCount = get().retryCount + 1

        // Si alcanzamos 3 reintentos, marcar como error
        if (newRetryCount >= 3) {
          clearTick()
          set({
            status: 'error',
            error: `Error de conexión tras ${newRetryCount} reintentos. Simulación pausada.`,
            retryCount: newRetryCount,
            backendConnected: false,
          })
        } else {
          // Mostrar mensaje de reintento y dejar que loop continúe
          set({
            retryCount: newRetryCount,
            error: `Reintentando... (${newRetryCount}/3): ${message}`,
          })
        }
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ACCIÓN: Resetear simulación
    // POST /api/simulations/{id}/reset
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
        set({ error: 'Error al resetear: ' + (error instanceof Error ? error.message : 'Desconocido') })
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ACCIÓN: Cambiar velocidad
    // ─────────────────────────────────────────────────────────────────────────

    setSpeed: (ms: number) => {
      set({ speed: ms })
      // Si está corriendo, reprogramar el timer con la nueva velocidad
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

