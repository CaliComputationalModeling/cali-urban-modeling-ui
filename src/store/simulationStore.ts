<<<<<<< HEAD
import { create } from 'zustand'
import { observationEndpoints, simulationEndpoints } from '@/services/endpoints'
import {
  type SimulationId,
  type SimulationStatus,
  type HistoryPoint,
  type GeoJsonResponse,
  type UrbanState,
  type ExecutionInitResponse,
  type ExecutionStatusResponse,
  type SimulationLayerMode,
  createSimulationId,
  SPEED_OPTIONS,
  type CreateSimulationRequest,
} from '@/shared/contracts/simulation.contract'
import type { Observation } from '@/shared/types/observation.types'
import type { CreateSimulationFormData } from '@/shared/types/simulation.types'
import type {
  AtractorFisicoResponse,
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
const LAT_MIN = 3.3, LAT_MAX = 3.6, LON_MIN = -76.6, LON_MAX = -76.45

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
      const lat = LAT_MIN + ((i + 0.5) / rows) * (LAT_MAX - LAT_MIN)
      const lon = LON_MIN + ((j + 0.5) / cols) * (LON_MAX - LON_MIN)
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
  const distribution = calculateDistributionMetrics(paso)
  return { generacion: paso.tiempo, total_agentes: paso.total_poblacion, max_densidad, celdas_ocupadas, ...distribution, completada: isLast }
}

// ─── Timer ────────────────────────────────────────────────────────────────────
let tickTimer: ReturnType<typeof setTimeout> | null = null
function clearTick() { if (tickTimer !== null) { clearTimeout(tickTimer); tickTimer = null } }

let pollingTimer: ReturnType<typeof setInterval> | null = null
function clearPolling() { if (pollingTimer !== null) { clearInterval(pollingTimer); pollingTimer = null } }

function isExecutionInit(data: unknown): data is ExecutionInitResponse {
  return Boolean(data && typeof data === 'object' && 'ejecucion_id' in data)
}

type DistributionMetrics = Pick<UrbanState, 'en_transito' | 'en_comedor' | 'en_cambuche' | 'zona_consumo' | 'zona_repulsora'>
type DistributionCategory = Exclude<keyof DistributionMetrics, 'en_transito'>

const EMPTY_DISTRIBUTION: DistributionMetrics = {
  en_transito: 0,
  en_comedor: 0,
  en_cambuche: 0,
  zona_consumo: 0,
  zona_repulsora: 0,
}

let metricObservations: Observation[] = []
let metricAttractors: AtractorFisicoResponse[] = []
let metricSourcesPromise: Promise<void> | null = null

function resetMetricSources() {
  metricObservations = []
  metricAttractors = []
  metricSourcesPromise = null
}

function normalizeKey(value: unknown): string {
  return typeof value === 'string'
    ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
    : ''
}

async function ensureMetricSources(): Promise<void> {
  if (!metricSourcesPromise) {
    metricSourcesPromise = Promise.all([
      observationEndpoints.getAll(),
      simulationEndpoints.listPhysicalAttractors(),
    ])
      .then(([observationsRes, attractorsRes]) => {
        metricObservations = observationsRes.ok && Array.isArray(observationsRes.data)
          ? observationsRes.data.filter((observation) => observation.estado === 'Activo')
          : []
        metricAttractors = attractorsRes.ok && Array.isArray(attractorsRes.data)
          ? attractorsRes.data.filter((attractor) => attractor.activo !== false)
          : []
      })
      .catch(() => {
        metricObservations = []
        metricAttractors = []
      })
  }

  await metricSourcesPromise
}

function createInfluenceMatrix(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(0))
}

function coordinatesToCell(lat: number, lon: number, rows: number, cols: number): [number, number] | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || rows <= 0 || cols <= 0) return null
  if (lat < LAT_MIN || lat > LAT_MAX || lon < LON_MIN || lon > LON_MAX) return null

  const latStep = (LAT_MAX - LAT_MIN) / rows
  const lonStep = (LON_MAX - LON_MIN) / cols
  if (latStep <= 0 || lonStep <= 0) return null

  const i = Math.max(0, Math.min(rows - 1, Math.floor((lat - LAT_MIN) / latStep)))
  const j = Math.max(0, Math.min(cols - 1, Math.floor((lon - LON_MIN) / lonStep)))
  return [i, j]
}

function addRadialInfluence(matrix: number[][], centerI: number, centerJ: number, radius: number, weight = 1) {
  const rows = matrix.length
  const cols = rows > 0 ? matrix[0].length : 0
  const safeRadius = Math.max(0, Math.round(radius))
  const safeWeight = Math.max(0, weight)

  for (let i = Math.max(0, centerI - safeRadius); i < Math.min(rows, centerI + safeRadius + 1); i++) {
    for (let j = Math.max(0, centerJ - safeRadius); j < Math.min(cols, centerJ + safeRadius + 1); j++) {
      const distance = Math.sqrt((i - centerI) ** 2 + (j - centerJ) ** 2)
      if (distance > safeRadius) continue
      const sigma = Math.max(safeRadius, 1)
      const decay = safeRadius === 0 ? 1 : Math.exp(-(distance ** 2) / (2 * sigma ** 2))
      matrix[i][j] += safeWeight * decay
    }
  }
}

function getObservationRadius(observation: Observation): number {
  const radius = observation.factores_detectados?.radio_influencia
    ?? observation.factores_detectados?.radio
    ?? observation.factores_detectados?.radius

  const parsedRadius = typeof radius === 'number' ? radius : Number(radius)
  return Number.isFinite(parsedRadius)
    ? Math.max(0, Math.min(10, Math.round(parsedRadius)))
    : 2
}

function getObservationCategory(observation: Observation): DistributionCategory | null {
  const tipo = normalizeKey(observation.factores_detectados?.tipo_poi ?? observation.factores_detectados?.tipo)
  if (tipo.includes('comedor')) return 'en_comedor'
  if (tipo.includes('cambuche') || tipo.includes('albergue') || tipo.includes('refugio')) return 'en_cambuche'
  if (tipo.includes('consumo')) return 'zona_consumo'

  const tags = new Set((observation.tags ?? []).map(normalizeKey))
  if (tags.has('alimentacion')) return 'en_comedor'
  if (tags.has('refugio imprevisto')) return 'en_cambuche'
  if (tags.has('drogas')) return 'zona_consumo'
  if (tags.has('riesgo')) return 'zona_repulsora'

  const factores = Object.keys(observation.factores_detectados ?? {}).map(normalizeKey)
  if (factores.includes('riesgo') || factores.includes('seguridad_mala')) return 'zona_repulsora'

  return null
}

function toIntegerDistribution(totalPopulation: number, raw: DistributionMetrics): DistributionMetrics {
  const total = Math.max(0, Math.round(totalPopulation))
  const rawTotal = Object.values(raw).reduce((sum, value) => sum + Math.max(0, value), 0)
  if (rawTotal <= 0) return { ...EMPTY_DISTRIBUTION, en_transito: total }

  const entries = (Object.entries(raw) as Array<[keyof DistributionMetrics, number]>).map(([key, value]) => {
    const scaledValue = (Math.max(0, value) / rawTotal) * total
    return {
    key,
      floor: Math.max(0, Math.floor(scaledValue)),
      fraction: Math.max(0, scaledValue - Math.floor(scaledValue)),
    }
  })

  let assigned = entries.reduce((sum, entry) => sum + entry.floor, 0)
  const distribution = { ...EMPTY_DISTRIBUTION }

  if (assigned < total) {
    const sorted = [...entries].sort((a, b) => b.fraction - a.fraction)
    let missing = total - assigned
    while (missing > 0) {
      const entry = sorted[(total - assigned - missing) % sorted.length]
      entry.floor += 1
      missing -= 1
    }
  } else if (assigned > total) {
    const sorted = [...entries].sort((a, b) => a.fraction - b.fraction)
    let overflow = assigned - total
    for (const entry of sorted) {
      if (overflow <= 0) break
      if (entry.floor === 0) continue
      entry.floor -= 1
      overflow -= 1
    }
  }

  for (const entry of entries) distribution[entry.key] = entry.floor
  assigned = Object.values(distribution).reduce((sum, value) => sum + value, 0)

  if (assigned < total) distribution.en_transito += total - assigned
  if (assigned > total) distribution.en_transito = Math.max(0, distribution.en_transito - (assigned - total))

  return distribution
}

function calculateDistributionMetrics(paso: PasoSimulacionDTO): DistributionMetrics {
  const rows = paso.densidad.length
  const cols = rows > 0 ? paso.densidad[0]?.length ?? 0 : 0
  const totalPopulation = Number(paso.total_poblacion ?? 0)

  if (rows === 0 || cols === 0) {
    return { ...EMPTY_DISTRIBUTION, en_transito: Math.max(0, Math.round(totalPopulation)) }
  }

  const categoryLayers: Record<DistributionCategory, number[][]> = {
    en_comedor: createInfluenceMatrix(rows, cols),
    en_cambuche: createInfluenceMatrix(rows, cols),
    zona_consumo: createInfluenceMatrix(rows, cols),
    zona_repulsora: createInfluenceMatrix(rows, cols),
  }

  for (const observation of metricObservations) {
    const category = getObservationCategory(observation)
    if (!category) continue

    const cell = coordinatesToCell(observation.latitud, observation.longitud, rows, cols)
    if (!cell) continue

    addRadialInfluence(categoryLayers[category], cell[0], cell[1], getObservationRadius(observation))
  }

  for (const attractor of metricAttractors) {
    const cell = coordinatesToCell(attractor.lat, attractor.lon, rows, cols)
    if (!cell) continue

    addRadialInfluence(
      categoryLayers.zona_repulsora,
      cell[0],
      cell[1],
      attractor.radio_influencia,
      attractor.intensidad,
    )
  }

  const rawDistribution = { ...EMPTY_DISTRIBUTION }

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const density = Number(paso.densidad[i]?.[j] ?? 0)
      if (density <= 0) continue

      let bestCategory: DistributionCategory | null = null
      let bestScore = 0

      for (const category of Object.keys(categoryLayers) as DistributionCategory[]) {
        const score = categoryLayers[category][i][j]
        if (score > bestScore) {
          bestScore = score
          bestCategory = category
        }
      }

      if (bestCategory === null) {
        rawDistribution.en_transito += density
        continue
      }

      rawDistribution[bestCategory] += density
    }
  }

  return toIntegerDistribution(totalPopulation, rawDistribution)
}

function isCompletedStatus(status: string): boolean {
  const normalized = status.toLowerCase()
  return normalized === 'finalizado' || normalized === 'completed' || normalized === 'completado'
}

function isFailedStatus(status: string): boolean {
  const normalized = status.toLowerCase()
  return normalized === 'fallido' || normalized === 'failed' || normalized === 'error'
}

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
  simulationProgress: ExecutionStatusResponse | null
  visualLayer: SimulationLayerMode
  showAgentsLayer: boolean
  showAttractorsLayer: boolean
  loadedPasos: PasoSimulacionDTO[]   // ← pasos cargados del backend

  createSimulation: (config: CreateSimulationFormData) => Promise<void>
  executeSimulationAsync: (payload: CreateSimulationRequest) => Promise<void>
  startAsyncSimulation: (payload: CreateSimulationRequest) => Promise<void>
  setSimulationId: (id: SimulationId) => void
  disconnect: () => void
  startSimulation: () => void
  pauseSimulation: () => void
  stepSimulation: () => Promise<void>
  resetSimulation: () => Promise<void>
  setSpeed: (ms: number) => void
  setMaxGenerations: (max: number) => void
  setVisualLayer: (layer: SimulationLayerMode) => void
  toggleAgentsLayer: () => void
  toggleAttractorsLayer: () => void
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
  simulationProgress: null,
  visualLayer: 'density' as SimulationLayerMode,
  showAgentsLayer: true,
  showAttractorsLayer: true,
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
      await get().startAsyncSimulation({
        version_escenario_id: config.version_escenario_id,
        generaciones: config.generaciones,
        radio_suavizado: config.radio_suavizado,
        movilidad: config.movilidad,
        permanencia_base: config.permanencia_base,
        sensibilidad_atractivo: config.sensibilidad_atractivo,
      })
    },

    // ── executeSimulationAsync: mismo flujo, usado por ExecutionModal ──────────
    executeSimulationAsync: async (payload: CreateSimulationRequest) => {
      await get().startAsyncSimulation(payload)
    },

    startAsyncSimulation: async (payload: CreateSimulationRequest) => {
      clearTick()
      clearPolling()
      resetMetricSources()
      currentPasoIndex = 0
      set({
        error: null,
        pollingStatus: 'Iniciando simulación...',
        simulationProgress: null,
        ejecucionId: null,
        simulationId: null,
        status: 'idle',
        currentGeneration: 0,
        geojson: null,
        urbanState: null,
        history: [],
        loadedPasos: [],
      })

      try {
        const res = await simulationEndpoints.createSimulation(payload)

        if (!res.ok) {
          if (res.status === 403) { set({ error: 'Sin permisos', pollingStatus: null, backendConnected: true }); return }
          if (res.status === 422 || res.status === 400) { set({ error: formatBackendDetail(res.data, 'Error de validación'), pollingStatus: null, backendConnected: true }); return }
          throw new Error(formatBackendDetail(res.data, 'Error al iniciar simulación'))
        }
        if (!res.data) throw new Error('Respuesta vacía del servidor')

        if (isExecutionInit(res.data)) {
          const executionId = String(res.data.ejecucion_id)
          set({
            simulationId: createSimulationId(executionId),
            ejecucionId: executionId,
            status: 'idle',
            pollingStatus: res.data.mensaje ?? 'Simulación en ejecución...',
            simulationProgress: {
              ejecucion_id: executionId,
              estado: res.data.estado ?? 'pendiente',
              progreso: res.data.progreso ?? 0,
              mensaje: res.data.mensaje,
            },
            retryCount: 0,
            backendConnected: true,
          })

          pollingTimer = setInterval(() => {
            void (async () => {
              const statusRes = await simulationEndpoints.getSimulationStatus(executionId)
              if (!statusRes.ok || !statusRes.data) {
                set({ backendConnected: false, pollingStatus: 'Esperando respuesta del backend...' })
                return
              }

              const progress = statusRes.data
              set({
                backendConnected: true,
                simulationProgress: progress,
                pollingStatus: progress.mensaje ?? `Progreso ${Math.round(progress.progreso)}%`,
              })

              if (isFailedStatus(progress.estado)) {
                clearPolling()
                set({ status: 'error', error: progress.mensaje ?? 'La simulación falló', pollingStatus: null })
                return
              }

              if (isCompletedStatus(progress.estado)) {
                clearPolling()
                set({ pollingStatus: 'Cargando pasos de simulación...' })
                await loadPasosIntoStore(executionId, set)
                set({ pollingStatus: null, simulationProgress: { ...progress, progreso: 100 }, status: 'idle' })
              }
            })()
          }, 1000)

          return
        }

        const ejecucion = res.data as EjecucionSimulacionResponse
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
          simulationProgress: null,
        })
      } catch (err) {
        set({ error: `Error: ${err instanceof Error ? err.message : 'Desconocido'}`, pollingStatus: null, backendConnected: false, status: 'error' })
      }
    },

    // ── setSimulationId: conectar a ejecución existente y cargar sus pasos ─────
    setSimulationId: (id: SimulationId) => {
      clearPolling()
      resetMetricSources()
      currentPasoIndex = 0
      set({ simulationId: id, ejecucionId: String(id), status: 'idle', currentGeneration: 0, geojson: null, urbanState: null, history: [], loadedPasos: [], error: null, retryCount: 0, backendConnected: true, pollingStatus: 'Cargando pasos de simulación...', simulationProgress: null })
      loadPasosIntoStore(String(id), set).catch(() => null)
        .finally(() => set({ pollingStatus: null }))
    },

    disconnect: () => {
      clearTick()
      clearPolling()
      resetMetricSources()
      currentPasoIndex = 0
      set({ ...INITIAL_STATE })
    },

    startSimulation: () => {
      const { simulationId, status, loadedPasos } = get()
      if (!simulationId || status === 'running') return
      if (loadedPasos.length === 0) { set({ error: 'No hay pasos cargados. Ejecuta una simulación primero.' }); return }
      set({ status: 'running', error: null, retryCount: 0, backendConnected: true })
      void get().stepSimulation().then(() => {
        if (get().status === 'running') scheduleTick()
      })
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
      await ensureMetricSources()
      const geojson = pasoToGeoJson(paso)
      const urbanState = pasoToUrbanState(paso, isLast)

      const newPoint: HistoryPoint = {
        generacion: paso.tiempo,
        total_agentes: paso.total_poblacion,
        en_transito: urbanState.en_transito,
        en_comedor: urbanState.en_comedor,
        en_cambuche: urbanState.en_cambuche,
        zona_consumo: urbanState.zona_consumo,
        zona_repulsora: urbanState.zona_repulsora,
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
      set({ status: 'idle', currentGeneration: 0, geojson: null, urbanState: null, history: [], error: null, retryCount: 0, simulationProgress: null })
    },

    setSpeed: (ms: number) => {
      set({ speed: ms })
      if (get().status === 'running') scheduleTick()
    },

    setMaxGenerations: (max: number) => {
      set({ maxGenerations: Math.max(1, max) })
    },

    setVisualLayer: (layer: SimulationLayerMode) => {
      set({ visualLayer: layer })
    },

    toggleAgentsLayer: () => {
      set((state) => ({ showAgentsLayer: !state.showAgentsLayer }))
    },

    toggleAttractorsLayer: () => {
      set((state) => ({ showAttractorsLayer: !state.showAttractorsLayer }))
    },
  }
})
=======
/**
 * Simulation Store - Zustand
 * 
 * Maneja el estado global de simulaciones:
 * - Simulación actual
 * - Lista de simulaciones
 * - Estado de ejecución
 * - Logs y errores
 * - Sincronización con API
 * 
 * Type-safe con DTOs de API
 */

import { create } from 'zustand'
import { simulationService } from '@/services/domain'
import type {
  SimulationResponseDTO,
  SimulationCreateRequestDTO,
  SimulationRunRequestDTO,
} from '@/shared/types/api.dtos'

export interface SimulationLog {
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'success'
  message: string
}

export interface SimulationState {
  // Estado
  currentSimulation: SimulationResponseDTO | null
  simulations: SimulationResponseDTO[]
  isRunning: boolean
  isLoading: boolean
  error: string | null
  logs: SimulationLog[]
  totalCount: number
  currentIteration: number
  totalIterations: number
  progress: number
  
  // Acciones
  loadSimulation: (id: string) => Promise<void>
  loadSimulations: (limit?: number, offset?: number) => Promise<void>
  createSimulation: (request: SimulationCreateRequestDTO) => Promise<SimulationResponseDTO>
  runSimulation: (generations: number) => Promise<void>
  runStep: (generations?: number) => Promise<void>
  resetSimulation: () => Promise<void>
  deleteSimulation: (id: string) => Promise<void>
  setCurrentSimulation: (simulation: SimulationResponseDTO | null) => void
  clearError: () => void
  clearLogs: () => void
  addLog: (message: string, level?: SimulationLog['level']) => void
  updateProgress: (current: number, total: number) => void
  fetchCells: () => Promise<void>
  startSimulation: () => void
  stopSimulation: () => void
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  // Estado inicial
  currentSimulation: null,
  simulations: [],
  isRunning: false,
  isLoading: false,
  error: null,
  logs: [],
  totalCount: 0,
  currentIteration: 0,
  totalIterations: 0,
  progress: 0,

  // Acciones
  loadSimulation: async (id) => {
    set({ isLoading: true, error: null })

    try {
      const simulation = await simulationService.getSimulation(id)
      set({ currentSimulation: simulation, isLoading: false })
      get().addLog(`Simulación cargada: ${simulation.name}`, 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error loading simulation'
      set({ error: message, isLoading: false })
      get().addLog(message, 'error')
      throw err
    }
  },

  loadSimulations: async (limit = 10, offset = 0) => {
    set({ isLoading: true, error: null })

    try {
      const result = await simulationService.listSimulations(limit, offset)
      set({
        simulations: result.items,
        totalCount: result.total,
        isLoading: false,
      })
      get().addLog(`${result.items.length} simulaciones cargadas`, 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error loading simulations'
      set({ error: message, isLoading: false })
      get().addLog(message, 'error')
      throw err
    }
  },

  createSimulation: async (request) => {
    set({ isLoading: true, error: null })

    try {
      const simulation = await simulationService.createSimulation(request)
      set((state) => ({
        simulations: [simulation, ...state.simulations],
        currentSimulation: simulation,
        isLoading: false,
      }))
      get().addLog(`Simulación creada: ${simulation.name}`, 'success')
      return simulation
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creating simulation'
      set({ error: message, isLoading: false })
      get().addLog(message, 'error')
      throw err
    }
  },

  runSimulation: async (generations) => {
    const current = get().currentSimulation
    if (!current) {
      throw new Error('No simulation selected')
    }

    set({ isRunning: true, error: null })

    try {
      const request: SimulationRunRequestDTO = { generations }
      const result = await simulationService.runSimulationStep(current.simulation_id, request)

      // Actualizar simulación actual con nuevos datos
      set((state) => ({
        currentSimulation: state.currentSimulation
          ? { ...state.currentSimulation, generation: result.generation }
          : null,
        isRunning: false,
      }))

      get().addLog(
        `Simulación ejecutada: Gen ${result.generation}, Células vivas: ${result.alive_cells}`,
        'success'
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error running simulation'
      set({ error: message, isRunning: false })
      get().addLog(message, 'error')
      throw err
    }
  },

  resetSimulation: async () => {
    const current = get().currentSimulation
    if (!current) {
      throw new Error('No simulation selected')
    }

    set({ isLoading: true, error: null })

    try {
      const simulation = await simulationService.resetSimulation(current.simulation_id)
      set({ currentSimulation: simulation, isLoading: false })
      get().addLog('Simulación reseteada', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error resetting simulation'
      set({ error: message, isLoading: false })
      get().addLog(message, 'error')
      throw err
    }
  },

  deleteSimulation: async (id) => {
    set({ isLoading: true, error: null })

    try {
      await simulationService.deleteSimulation(id)
      set((state) => ({
        simulations: state.simulations.filter((s) => s.simulation_id !== id),
        currentSimulation: state.currentSimulation?.simulation_id === id ? null : state.currentSimulation,
        isLoading: false,
      }))
      get().addLog('Simulación eliminada', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error deleting simulation'
      set({ error: message, isLoading: false })
      get().addLog(message, 'error')
      throw err
    }
  },

  setCurrentSimulation: (simulation) => set({ currentSimulation: simulation }),

  clearError: () => set({ error: null }),

  clearLogs: () => set({ logs: [] }),

  addLog: (message, level = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    const log: SimulationLog = { timestamp, level, message }
    set((state) => ({
      logs: [...state.logs, log].slice(-100),
    }))
  },

  updateProgress: (current, total) => {
    const progress = total > 0 ? (current / total) * 100 : 0
    set({ currentIteration: current, totalIterations: total, progress })
  },

  fetchCells: async () => {
    const current = get().currentSimulation
    if (!current) {
      throw new Error('No simulation selected')
    }

    set({ isLoading: true, error: null })

    try {
      const simulation = await simulationService.getSimulation(current.simulation_id)
      set({ currentSimulation: simulation, isLoading: false })
      get().addLog('Células cargadas', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching cells'
      set({ error: message, isLoading: false })
      get().addLog(message, 'error')
      throw err
    }
  },

  runStep: async (generations = 1) => {
    const current = get().currentSimulation
    if (!current) {
      throw new Error('No simulation selected')
    }

    set({ isRunning: true, error: null })

    try {
      const request: SimulationRunRequestDTO = { generations }
      const result = await simulationService.runSimulationStep(current.simulation_id, request)

      set((state) => ({
        currentSimulation: state.currentSimulation
          ? {
              ...state.currentSimulation,
              generation: result.generation,
              cells: result.cells,
            }
          : null,
        isRunning: false,
        currentIteration: result.generation,
      }))

      get().addLog(
        `Paso ejecutado: Gen ${result.generation}, Células vivas: ${result.alive_cells}`,
        'success'
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error executing step'
      set({ error: message, isRunning: false })
      get().addLog(message, 'error')
      throw err
    }
  },

  startSimulation: () => {
    set({ isRunning: true })
    get().addLog('Simulación iniciada', 'success')
  },

  stopSimulation: () => {
    set({ isRunning: false })
    get().addLog('Simulación detenida', 'info')
  },
}))

>>>>>>> 44fa15ef18c7ea319939bfa768140030a1bfe210
