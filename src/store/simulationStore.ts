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