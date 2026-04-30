import { create } from 'zustand'
import { simulationEndpoints } from '@/services/endpoints'
import type { FeatureCollection, Geometry } from 'geojson'
import type { CreateSimulationFormData } from '@/shared/types/simulation.types'

// ─── Timer Management ────────────────────────────────────────────────────────

let tickTimer: ReturnType<typeof setTimeout> | null = null

function clearTick() {
  if (tickTimer !== null) {
    clearTimeout(tickTimer)
    tickTimer = null
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SimulationStats {
  totalAgentes: number
  livingCells: number
  density: number
  maxDensity: number
  executionTime: string
  enTransito: number
  enCambuche: number
  enComedor: number
  enZonaConsumo: number
  enZonaRepulsora: number
}

export interface HistoryPoint {
  name: string
  totalAgentes: number
  enTransito: number
  enComedor: number
  enCambuche: number
}

export type SimulationStatus = 'idle' | 'running' | 'paused' | 'error' | 'completed'

export interface SimulationState {
  simulationId: string | null
  status: SimulationStatus
  currentGeneration: number
  maxGenerations: number
  speed: number
  data: FeatureCollection<Geometry> | null
  history: HistoryPoint[]
  stats: SimulationStats
  error: string | null
  retryCount: number
  backendConnected: boolean

  createSimulation: (config: CreateSimulationFormData) => Promise<void>
  setSimulationId: (id: string) => void
  disconnect: () => void
  startSimulation: () => void
  pauseSimulation: () => void
  stepSimulation: () => Promise<void>
  resetSimulation: () => Promise<void>
  setSpeed: (ms: number) => void
  setMaxGenerations: (max: number) => void
  fetchNextStep: () => Promise<void>
}

// ─── Initial State ────────────────────────────────────────────────────────────

const INITIAL_STATS: SimulationStats = {
  totalAgentes: 0,
  livingCells: 0,
  density: 0,
  maxDensity: 0,
  executionTime: '00:00:00',
  enTransito: 0,
  enCambuche: 0,
  enComedor: 0,
  enZonaConsumo: 0,
  enZonaRepulsora: 0,
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSimulationStore = create<SimulationState>((set, get) => {
  function scheduleTick() {
    clearTick()
    tickTimer = setTimeout(async () => {
      const state = get()
      if (state.status !== 'running') return

      if (state.currentGeneration >= state.maxGenerations) {
        set({ status: 'completed' })
        return
      }

      await state.fetchNextStep()

      // Schedule next tick only if still running after fetch
      if (get().status === 'running') {
        scheduleTick()
      }
    }, get().speed)
  }

  return {
    simulationId: null,
    status: 'idle',
    currentGeneration: 0,
    maxGenerations: 100,
    speed: 1000,
    data: null,
    history: [],
    stats: INITIAL_STATS,
    error: null,
    retryCount: 0,
    backendConnected: true,

    createSimulation: async (config) => {
      set({ error: null })
      try {
        const res = await simulationEndpoints.createSpatial(
          {
            name: config.nombre,
            description: config.descripcion,
            grid_config: {
              width: config.columnas,
              height: config.filas,
              neighborhood_type: 'moore',
              boundary_mode: 'toroidal',
              geospatial_bounds: {
                lat_min: 3.38,
                lat_max: 3.5,
                lon_min: -76.56,
                lon_max: -76.46,
              },
            },
            rule: { rule_type: 'conway', birth: [3], survival: [2, 3] },
          },
          config.agentes_iniciales,
        )

        if (res.ok && res.data?.simulation_id) {
          set({
            simulationId: String(res.data.simulation_id),
            status: 'idle',
            currentGeneration: 0,
            data: null,
            history: [],
            stats: INITIAL_STATS,
            error: null,
            retryCount: 0,
            backendConnected: true,
          })
        } else {
          set({ error: 'No se pudo crear la simulacion' })
        }
      } catch {
        set({ error: 'Error de conexion con el backend', backendConnected: false })
      }
    },

    setSimulationId: (id) =>
      set({
        simulationId: id,
        status: 'idle',
        currentGeneration: 0,
        data: null,
        history: [],
        stats: INITIAL_STATS,
        error: null,
        retryCount: 0,
      }),

    disconnect: () => {
      clearTick()
      set({
        simulationId: null,
        status: 'idle',
        currentGeneration: 0,
        data: null,
        history: [],
        stats: INITIAL_STATS,
        error: null,
        retryCount: 0,
      })
    },

    startSimulation: () => {
      const { simulationId, status } = get()
      if (!simulationId || status === 'running') return
      set({ status: 'running', error: null, retryCount: 0 })
      scheduleTick()
    },

    pauseSimulation: () => {
      clearTick()
      if (get().status === 'running') {
        set({ status: 'paused' })
      }
    },

    stepSimulation: async () => {
      const { simulationId, status } = get()
      if (!simulationId || status === 'running') return
      set({ error: null })
      await get().fetchNextStep()
    },

    resetSimulation: async () => {
      clearTick()
      const { simulationId } = get()
      if (simulationId) {
        await simulationEndpoints.reset(simulationId).catch(() => null)
      }
      set({
        status: 'idle',
        currentGeneration: 0,
        data: null,
        history: [],
        stats: INITIAL_STATS,
        error: null,
        retryCount: 0,
      })
    },

    setSpeed: (ms) => set({ speed: ms }),
    setMaxGenerations: (max) => set({ maxGenerations: max }),

    fetchNextStep: async () => {
      const { simulationId, currentGeneration } = get()
      if (!simulationId) return

      try {
        // 1. Execute one spatial step
        await simulationEndpoints.runSpatial(simulationId, { generations: 1 })

        // 2. Get GeoJSON for map
        const geoRes = await simulationEndpoints.getGeoJson(simulationId)

        // 3. Get urban stats
        const urbanRes = await simulationEndpoints.getUrbanState(simulationId)

        if (!geoRes.ok || !geoRes.data) {
          throw new Error('No se pudo obtener datos GeoJSON')
        }

        const geojson = geoRes.data
        const meta = (geojson as unknown as { properties?: Record<string, unknown> }).properties ?? {}
        const urbanData = urbanRes.data as Record<string, unknown> | undefined
        const urban = (urbanData?.urban_stats as Record<string, number>) ?? {}
        const gridMeta = (urbanData?.grid as Record<string, number>) ?? {}

        const activeCells =
          (meta.alive_cells as number) ?? gridMeta.alive_cells ?? geojson.features.length
        const density = (meta.density as number) ?? gridMeta.population_density ?? 0
        const generation =
          (meta.generation as number) ?? gridMeta.generation ?? currentGeneration + 1
        const totalAgentes = urban.total_agentes ?? activeCells

        // Compute max density from features
        let maxAgentes = 0
        for (const f of geojson.features) {
          const a = (f.properties?.agentes as number) ?? 0
          if (a > maxAgentes) maxAgentes = a
        }

        const newPoint: HistoryPoint = {
          name: `G${generation}`,
          totalAgentes,
          enTransito: urban.en_transito ?? 0,
          enComedor: urban.en_comedor ?? 0,
          enCambuche: urban.en_cambuche ?? 0,
        }

        set((state) => ({
          data: geojson,
          currentGeneration: generation,
          retryCount: 0,
          backendConnected: true,
          error: null,
          stats: {
            livingCells: activeCells,
            density,
            maxDensity: maxAgentes,
            executionTime: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
            enTransito: urban.en_transito ?? 0,
            enCambuche: urban.en_cambuche ?? 0,
            enComedor: urban.en_comedor ?? 0,
            enZonaConsumo: urban.en_zona_consumo ?? 0,
            enZonaRepulsora: urban.en_zona_repulsora ?? 0,
            totalAgentes,
          },
          history: [...state.history, newPoint].slice(-50),
        }))

        // Check max generations
        if (generation >= get().maxGenerations && get().status === 'running') {
          clearTick()
          set({ status: 'completed' })
        }
      } catch (error) {
        console.error('Error en fetchNextStep:', error)
        const retryCount = get().retryCount + 1

        if (retryCount >= 3) {
          clearTick()
          set({
            status: 'error',
            error: 'Error de conexion con el backend. Simulacion pausada tras 3 reintentos.',
            retryCount,
            backendConnected: false,
          })
        } else {
          set({ retryCount, error: `Reintentando... (${retryCount}/3)` })
        }
      }
    },
  }
})
