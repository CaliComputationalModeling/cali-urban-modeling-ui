export interface GridConfig {
  width: number
  height: number
  valid_states?: number[]
  neighborhood_type?: 'moore' | 'von_neumann'
  boundary_mode?: 'fixed' | 'periodic' | 'toroidal'
  geospatial_bounds?: {
    lat_min: number
    lat_max: number
    lon_min: number
    lon_max: number
  }
}

export interface SimulationRule {
  rule_type: 'conway' | 'wolfram' | 'custom'
  birth?: number[]
  survival?: number[]
  wolfram_code?: number
}

export interface Cell {
  position: { x: number; y: number }
  state: number
  geo_coordinate?: {
    latitude: number
    longitude: number
  }
}

export interface SimulationParameters {
  climate?: number
  security?: number
  services?: number
  mobility?: number
  cellSize?: string
  depth?: number
  [key: string]: any
}

// Estado de simulación
export enum SimulationStatus {
  IDLE = "idle",
  LOADING = "loading",
  READY = "ready",
  RUNNING = "running",
  COMPLETED = "completed",
  ERROR = "error",
  APPROVED = "approved",
  REJECTED = "rejected",
}

// Simulación completa
export interface Simulation {
  id: string
  name: string
  version: string
  date: string
  status: SimulationStatus
  cells: Cell[]
  config: SimulationConfig
  currentIteration: number
  totalIterations: number
  parameters?: SimulationParameters
  results?: SimulationResults
}

export interface SimulationResults {
  estimatedPopulation: number
  criticalZones: number
  accuracy: number
}

// Para logging
export interface SimulationLog {
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'success'
  message: string
}

export interface BackendSimulation {
  simulation_id: string
  name: string
  description?: string
  created_at: string
  generation: number
  active: boolean
  estado?: string
}

export interface SimulationCreateRequest {
  name: string
  description?: string
  grid_config: GridConfig
  rule: SimulationRule
  initial_cells?: { x: number; y: number; state: number }[]
}

export interface SimulationRunRequest {
  generations: number
}

export interface SimulationRunResponse {
  simulation_id: string
  generation: number
  alive_cells: number
  population_density: number
  execution_time_ms: number
}

export interface SimulationProgress {
  simulation_id: string
  estado: string
  porcentaje_progreso: number
  generacion_actual: number
  max_ciclos: number
  log_reciente?: string
}

export interface BackendSimulationResults {
  simulation_id: string
  estado: string
  generaciones_ejecutadas: number
  fecha_inicio?: string
  fecha_fin?: string
  duracion_segundos?: number
}

export interface SimulationStatistics {
  simulation_id: string
  generation: number
  total_cells: number
  alive_cells: number
  dead_cells: number
  population_density: number
  estado: string
}

/**
 * Datos del formulario de creación de simulación
 * Estos datos se mapean a los parámetros que espera el backend
 */
export interface CreateSimulationFormData {
  // ────────────────────────────────────────────────
  // PARÁMETROS DIRECTOS AL BACKEND
  // ────────────────────────────────────────────────
  version_escenario_id: number
  generaciones: number
  radio_suavizado: number
  movilidad: number
  permanencia_base: number
  sensibilidad_atractivo: number

  // ────────────────────────────────────────────────
  // DISTRIBUCIÓN INICIAL POR COMUNA (Censo DANE 2019)
  // ────────────────────────────────────────────────
  poblacion_inicial_por_comuna?: Record<number, number>
  peso_capacidad?: number
  peso_atractores?: number
  p_exponente_distancia?: number

  // ────────────────────────────────────────────────
  // METADATOS (opcionales - solo para UI)
  // ────────────────────────────────────────────────
  nombre?: string
  descripcion?: string
}
