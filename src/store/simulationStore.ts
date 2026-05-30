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
} from '@/shared/contracts/simulation.contract'
import type { CreateSimulationFormData } from '@/shared/types/simulation.types'
import type {
  EjecucionSimulacionResponse,
  PasoSimulacionDTO,
} from '@/services/endpoints/simulation.endpoints'

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

// ─── Convierte PasoSimulacionDTO → GeoJsonResponse ────────────────────────────
const LAT_MIN = 3.3, LAT_MAX = 3.55, LON_MIN = -76.6, LON_MAX = -76.45

function pasoToGeoJson(paso: PasoSimulacionDTO): GeoJsonResponse {
  const rows = paso.densidad.length
  const cols = rows > 0 ? paso.densidad[0].length : 0
  const features = []
  let maxDensidad = 0

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const densidad = paso.densidad[i][j] ?? 0
      if (densidad <= 0) continue
      if (densidad > maxDensidad) maxDensidad = densidad
      const lat = LAT_MIN + (i / rows) * (LAT_MAX - LAT_MIN)
      const lon = LON_MIN + (j / cols) * (LON_MAX - LON_MIN)
      features.push({
        type: 'Feature' as const,
        properties: { x: j, y: i, agentes: Math.round(densidad * 100), densidad, en_transito: 0, en_comedor: 0, en_cambuche: 0, zona_consumo: 0, zona_repulsora: 0 },
        geometry: { type: 'Point' as const, coordinates: [lon, lat] as [number, number] },
      })
    }
  }

  return {
    type: 'FeatureCollection',
    features,
    metadata: { generacion: paso.tiempo, timestamp: new Date().toISOString(), total_agentes: paso.total_poblacion, max_densidad: maxDensidad },
  }
}

function pasoToUrbanState(paso: PasoSimulacionDTO, isLast: boolean): UrbanState {
  const rows = paso.densidad.length
  const cols = rows > 0 ? paso.densidad[0].length : 0
  let celdas_ocupadas = 0, max_densidad = 0
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++) {
      const d = paso.densidad[i]?.[j] ?? 0
      if (d > 0) celdas_ocupadas++
      if (d > max_densidad) max_densidad = d
    }
  return { generacion: paso.tiempo, total_agentes: paso.total_poblacion, max_densidad, celdas_ocupadas, en_transito: 0, en_comedor: 0, en_cambuche: 0, zona_consumo: 0, zona_repulsora: 0, completada: isLast }
}

// ─── Timer ────────────────────────────────────────────────────────────────────
let tickTimer: ReturnType<typeof setTimeout> | null = null
function clearTick() { if (tickTimer !== null) { clearTimeout(tickTimer); tickTimer = null } }

// ─── Store types ──────────────────────────────────────────────────────────────
export interface SimulationStoreState {
  simulationId: SimulationId | null
  ejecucionId: string | null
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
  loadedPasos: PasoSimulacionDTO[]   // ← pasos cargados del backend

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

const INITIAL_STATE = {
  simulationId: null,
  ejecucionId: null,
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
  loadedPasos: [],
}

// ─── Índice del paso actual (fuera del store para evitar re-renders) ───────────
let currentPasoIndex = 0

// ─── Helper: carga pasos y los guarda en el store ─────────────────────────────
async function loadPasosIntoStore(
  ejecucionId: string,
  set: (partial: Partial<SimulationStoreState>) => void
) {
  const res = await simulationEndpoints.getSimulationSteps(ejecucionId as SimulationId)
  if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
    currentPasoIndex = 0
    set({ loadedPasos: res.data as PasoSimulacionDTO[], maxGenerations: (res.data as PasoSimulacionDTO[]).length })
  }
}

export const useSimulationStore = create<SimulationStoreState>((set, get) => {
  function scheduleTick() {
    clearTick()
    tickTimer = setTimeout(async () => {
      const state = get()
      if (state.status !== 'running') return
      await get().stepSimulation()
      if (get().status === 'running') scheduleTick()
    }, get().speed)
  }

  return {
    ...INITIAL_STATE,

    // ── createSimulation: ejecuta y carga pasos ────────────────────────────────
    createSimulation: async (config: CreateSimulationFormData) => {
      set({ error: null, pollingStatus: 'Ejecutando simulación...' })
      try {
        const res = await simulationEndpoints.createSimulation({
          version_escenario_id: config.version_escenario_id,
          generaciones: config.generaciones,
          radio_suavizado: config.radio_suavizado,
          movilidad: config.movilidad,
          permanencia_base: config.permanencia_base,
          sensibilidad_atractivo: config.sensibilidad_atractivo,
        })

        if (!res.ok) {
          set({ error: res.status === 403 ? 'Sin permisos' : formatBackendDetail(res.data, 'Error al crear simulación'), pollingStatus: null, backendConnected: true })
          return
        }
        if (!res.data) { set({ error: 'Respuesta vacía', pollingStatus: null }); return }

        const ejecucion = res.data as EjecucionSimulacionResponse
        currentPasoIndex = 0

        set({
          simulationId: createSimulationId(String(ejecucion.id)),
          ejecucionId: String(ejecucion.id),
          loadedPasos: ejecucion.pasos,
          maxGenerations: ejecucion.pasos.length,
          status: 'idle',
          currentGeneration: 0,
          geojson: null,
          urbanState: null,
          history: [],
          error: null,
          retryCount: 0,
          backendConnected: true,
          pollingStatus: null,
        })
      } catch (err) {
        set({ error: `Error: ${err instanceof Error ? err.message : 'Desconocido'}`, pollingStatus: null, backendConnected: false })
      }
    },

    // ── executeSimulationAsync: mismo flujo, usado por ExecutionModal ──────────
    executeSimulationAsync: async (payload: CreateSimulationRequest) => {
      set({ error: null, pollingStatus: 'Ejecutando simulación...', ejecucionId: null })
      try {
        const res = await simulationEndpoints.createSimulation(payload)

        if (!res.ok) {
          if (res.status === 403) { set({ error: 'Sin permisos', pollingStatus: null, backendConnected: true }); return }
          if (res.status === 422 || res.status === 400) { set({ error: formatBackendDetail(res.data, 'Error de validación'), pollingStatus: null, backendConnected: true }); return }
          throw new Error(formatBackendDetail(res.data, 'Error al ejecutar simulación'))
        }
        if (!res.data) throw new Error('Respuesta vacía del servidor')

        const ejecucion = res.data as EjecucionSimulacionResponse
        currentPasoIndex = 0

        set({
          simulationId: createSimulationId(String(ejecucion.id)),
          ejecucionId: String(ejecucion.id),
          loadedPasos: ejecucion.pasos,
          maxGenerations: ejecucion.pasos.length,
          status: 'idle',
          currentGeneration: 0,
          geojson: null,
          urbanState: null,
          history: [],
          error: null,
          retryCount: 0,
          backendConnected: true,
          pollingStatus: null,
        })
      } catch (err) {
        set({ error: `Error: ${err instanceof Error ? err.message : 'Desconocido'}`, pollingStatus: null, backendConnected: false })
      }
    },

    // ── setSimulationId: conectar a ejecución existente y cargar sus pasos ─────
    setSimulationId: (id: SimulationId) => {
      currentPasoIndex = 0
      set({ simulationId: id, ejecucionId: String(id), status: 'idle', currentGeneration: 0, geojson: null, urbanState: null, history: [], loadedPasos: [], error: null, retryCount: 0, backendConnected: true })
      loadPasosIntoStore(String(id), set).catch(() => null)
    },

    disconnect: () => {
      clearTick()
      currentPasoIndex = 0
      set({ ...INITIAL_STATE })
    },

    startSimulation: () => {
      const { simulationId, status, loadedPasos } = get()
      if (!simulationId || status === 'running') return
      if (loadedPasos.length === 0) { set({ error: 'No hay pasos cargados. Ejecuta una simulación primero.' }); return }
      set({ status: 'running', error: null, retryCount: 0, backendConnected: true })
      scheduleTick()
    },

    pauseSimulation: () => {
      clearTick()
      if (get().status === 'running') set({ status: 'paused' })
    },

    // ── stepSimulation: avanza 1 paso en loadedPasos ──────────────────────────
    stepSimulation: async () => {
      const { loadedPasos, status } = get()
      if (status === 'completed') return

      if (loadedPasos.length === 0) { set({ error: 'Sin pasos disponibles.' }); return }
      if (currentPasoIndex >= loadedPasos.length) { set({ status: 'completed' }); clearTick(); return }

      const paso = loadedPasos[currentPasoIndex]
      const isLast = currentPasoIndex === loadedPasos.length - 1
      const geojson = pasoToGeoJson(paso)
      const urbanState = pasoToUrbanState(paso, isLast)

      const newPoint: HistoryPoint = {
        generacion: paso.tiempo,
        total_agentes: paso.total_poblacion,
        en_transito: 0, en_comedor: 0, en_cambuche: 0, zona_consumo: 0, zona_repulsora: 0,
        timestamp: Date.now(),
      }

      currentPasoIndex++

      set((state) => ({
        geojson,
        urbanState,
        currentGeneration: paso.tiempo,
        history: [...state.history, newPoint].slice(-50),
        status: isLast ? 'completed' : state.status,
        retryCount: 0,
        backendConnected: true,
        error: null,
      }))

      if (isLast) clearTick()
    },

    resetSimulation: async () => {
      clearTick()
      currentPasoIndex = 0
      set({ status: 'idle', currentGeneration: 0, geojson: null, urbanState: null, history: [], error: null, retryCount: 0 })
    },

    setSpeed: (ms: number) => {
      set({ speed: ms })
      if (get().status === 'running') scheduleTick()
    },

    setMaxGenerations: (max: number) => {
      set({ maxGenerations: Math.max(1, max) })
    },
  }
})