/**
 * Contrato tipado unificado para comunicación con backend
 * Asegura que frontend y backend compartan la misma estructura
 */

// ============================================
// TIPOS PRIMITIVOS
// ============================================

export type SimulationId = string & { readonly brand: 'SimulationId' }

export const createSimulationId = (id: string): SimulationId => {
  if (!id || typeof id !== 'string') {
    throw new Error('SimulationId debe ser un string no vacío')
  }
  return id as SimulationId
}

// ============================================
// GEO CELL - Celda individual de la grilla
// ============================================

export interface GeoCell {
  x: number
  y: number
  agentes: number
  densidad: number // 0-1 normalizado
  en_transito: number
  en_comedor: number
  en_cambuche: number
  zona_consumo: number
  zona_repulsora: number
}

// ============================================
// GEOJSON RESPONSE - Estado geoespacial
// ============================================

export interface GeoJsonFeature {
  type: 'Feature'
  properties: GeoCell
  geometry: {
    type: 'Point'
    coordinates: [number, number] // [lon, lat]
  }
}

export interface GeoJsonResponse {
  type: 'FeatureCollection'
  features: GeoJsonFeature[]
  metadata: {
    generacion: number
    timestamp: string
    total_agentes: number
    max_densidad: number
  }
}

// ============================================
// URBAN STATE - Métricas agregadas por paso
// ============================================

export interface UrbanState {
  generacion: number
  total_agentes: number
  max_densidad: number
  celdas_ocupadas: number
  en_transito: number
  en_comedor: number
  en_cambuche: number
  zona_consumo: number
  zona_repulsora: number
  completada: boolean // Backend marca si generacion >= max_generaciones
}

// ============================================
// RUN STEP RESPONSE - Respuesta unificada
// Esto es LO MÍS IMPORTANTE: 1 request devuelve TODO
// ============================================

export interface RunStepResponse {
  simulation_id: SimulationId
  geojson: GeoJsonResponse
  urban_state: UrbanState
  success: boolean
  error?: string
}

// ============================================
// CREATE SIMULATION REQUEST
// ============================================

export interface CreateSimulationRequest {
  version_escenario_id: number
  generaciones: number
  radio_suavizado: number
  movilidad: number
  permanencia_base: number
  sensibilidad_atractivo: number
}

export interface CreateSimulationResponse {
  // ============================================
  // FLUJO ASÍNCRONO (prioritario - para simulaciones largas)
  // ============================================
  ejecucion_id?: string | number
  execution_id?: string | number // Variante en inglés

  // ============================================
  // FLUJO SÍNCRONO (fallback - para resultados inmediatos)
  // ============================================
  simulation_id?: string | number
  simulacion_id?: string | number // Variante en español

  // ============================================
  // METADATOS DE ESTADO
  // ============================================
  estado?: string
  status?: string // Variante en inglés
  estado_ejecucion?: string

  // ============================================
  // CAMPOS INFORMATIVOS COMUNES
  // ============================================
  nombre?: string
  name?: string
  generacion?: number
  generation?: number
  creada_en?: string
  created_at?: string

  // ============================================
  // MENSAJES Y PROGRESO
  // ============================================
  mensaje?: string
  message?: string
  progreso?: number
  progress?: number
}

// ============================================
// RULE WEIGHTS REQUEST
// ============================================

export interface RuleWeightsRequest {
  pesos: {
    atractivo_comercial: number
    proximidad_transporte: number
    seguridad: number
    densidad_actual: number
  }
}

// ============================================
// CREATE SCENARIO REQUEST
// ============================================

export interface CreateScenarioRequest {
  nombre: string
  variables_clima: {
    temperatura_promedio: number
    humedad_relativa: number
    precipitacion_mm: number
  }
  variables_seguridad: {
    indice_criminalidad: number
    cobertura_policial: number
  }
  regla_transicion_id: number
  configuracion_malla: {
    resolucion_metros: number
    ancho_celdas: number
    alto_celdas: number
  }
}

export interface CreateScenarioResponse {
  id?: number
  escenario_id?: number
  version_id?: number
  version_escenario_id?: number
  version_actual_id?: number
  version?: {
    id?: number
    version_id?: number
    version_escenario_id?: number
  }
  data?: {
    id?: number
    escenario_id?: number
    version_id?: number
    version_escenario_id?: number
    version_actual_id?: number
  }
}

// ============================================
// RESET SIMULATION REQUEST/RESPONSE
// ============================================

export interface ResetSimulationResponse {
  simulation_id: SimulationId
  generacion: number
  mensaje: string
}

// ============================================
// HISTORY POINT - Para grafica de evolucion
// ============================================

export interface HistoryPoint {
  generacion: number
  total_agentes: number
  en_transito: number
  en_comedor: number
  en_cambuche: number
  zona_consumo: number
  zona_repulsora: number
  timestamp: number
}

// ============================================
// STORE STATE - Estado completo de la simulación
// ============================================

export type SimulationStatus = 'idle' | 'running' | 'paused' | 'error' | 'completed'

export interface SimulationStoreState {
  // Identificadores
  simulationId: SimulationId | null
  
  // Control de ejecución
  status: SimulationStatus
  currentGeneration: number
  maxGenerations: number
  speed: number // intervalMs (500, 1000, 2000)
  
  // Datos actuales
  geojson: GeoJsonResponse | null
  urbanState: UrbanState | null
  
  // Histórico para gráficas
  history: HistoryPoint[]
  
  // Indicadores de error
  error: string | null
  retryCount: number
  backendConnected: boolean
}

// ============================================
// ENUM PARA VELOCIDADES
// ============================================

export const SPEED_OPTIONS = {
  SLOW: 2000,
  NORMAL: 1000,
  FAST: 500,
} as const

export type SpeedOption = typeof SPEED_OPTIONS[keyof typeof SPEED_OPTIONS]

// ============================================
// GUARD/TYPE CHECKING
// ============================================

export const isRunStepResponse = (data: unknown): data is RunStepResponse => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'simulation_id' in data &&
    'geojson' in data &&
    'urban_state' in data &&
    'success' in data
  )
}

export const isGeoJsonResponse = (data: unknown): data is GeoJsonResponse => {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>).type === 'FeatureCollection' &&
    Array.isArray((data as Record<string, unknown>).features)
  )
}

export const isUrbanState = (data: unknown): data is UrbanState => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'generacion' in data &&
    'total_agentes' in data &&
    'completada' in data
  )
}
