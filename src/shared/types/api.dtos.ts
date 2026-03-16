/**
 * DTOs para respuestas de la API
 * 
 * Estos tipos mapean exactamente con los DTOs del backend Python
 * Aseguran type-safety en todo el frontend
 * Sigue el patrón DTO para desacoplar API del dominio
 */

/**
 * ==================== ENUMS ====================
 */

export enum RuleFormat {
  CONWAY = 'conway',
  WOLFRAM = 'wolfram',
  CUSTOM = 'custom',
}

export enum NeighborhoodType {
  MOORE = 'moore',
  VON_NEUMANN = 'von_neumann',
  EXTENDED_MOORE = 'extended_moore',
}

export enum BoundaryMode {
  FIXED = 'fixed',
  PERIODIC = 'periodic',
  REFLECT = 'reflect',
}

export enum SimulationStatusEnum {
  IDLE = 'idle',
  LOADING = 'loading',
  READY = 'ready',
  RUNNING = 'running',
  COMPLETED = 'completed',
  ERROR = 'error',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/**
 * ==================== REQUEST DTOs ====================
 */

/**
 * Request para crear una regla
 */
export interface RuleRequestDTO {
  rule_type: RuleFormat
  birth?: number[]
  survival?: number[]
  wolfram_code?: number
  lookup_table?: Record<string, number>
}

/**
 * Request para crear una célula
 */
export interface CellCreateDTO {
  x: number
  y: number
  state: number
}

/**
 * Request para configuración de grilla
 */
export interface GridConfigDTO {
  width: number
  height: number
  neighborhood_type: NeighborhoodType
  boundary_mode: BoundaryMode
  cell_size?: string
  geospatial_bounds?: GeospatialBoundsDTO
}

/**
 * Request para crear simulación
 */
export interface SimulationCreateRequestDTO {
  name: string
  description?: string
  grid_config: GridConfigDTO
  rule: RuleRequestDTO
  initial_cells?: CellCreateDTO[]
}

/**
 * Request para ejecutar paso de simulación
 */
export interface SimulationRunRequestDTO {
  generations: number
}

/**
 * ==================== RESPONSE DTOs ====================
 */

/**
 * Posición en la grilla
 */
export interface PositionDTO {
  x: number
  y: number
}

/**
 * Coordenada geográfica
 */
export interface GeoCoordinateDTO {
  latitude: number
  longitude: number
}

/**
 * Bounding box geoespacial
 */
export interface GeospatialBoundsDTO {
  lat_min: number
  lat_max: number
  lon_min: number
  lon_max: number
}

/**
 * Información de una célula
 */
export interface CellDTO {
  position: PositionDTO
  state: number
  alive: boolean
  neighbors_count?: number
  geospatial_position?: GeoCoordinateDTO
}

/**
 * Información de una grilla/grid
 */
export interface GridDTO {
  id: string
  width: number
  height: number
  cell_size: string
  total_cells: number
  alive_cells: number
  cells: CellDTO[]
  neighborhood_type: NeighborhoodType
  boundary_mode: BoundaryMode
  geospatial_bounds?: GeospatialBoundsDTO
  created_at: string
  updated_at: string
}

/**
 * Información de una regla
 */
export interface RuleDTO {
  id: string
  rule_type: RuleFormat
  description: string
  birth?: number[]
  survival?: number[]
  wolfram_code?: number
  created_at: string
}

/**
 * Respuesta de simulación creada
 */
export interface SimulationResponseDTO {
  simulation_id: string
  name: string
  description?: string
  status: SimulationStatusEnum
  grid: GridDTO
  rule: RuleDTO
  generation: number
  cells?: CellDTO[] // Acceso directo a células para compatibilidad
  created_at: string
  updated_at: string
}

/**
 * Respuesta de ejecución de simulación
 */
export interface SimulationRunResponseDTO {
  simulation_id: string
  generation: number
  alive_cells: number
  total_cells: number
  alive_percentage: number
  execution_time_ms: number
  cells?: CellDTO[]
  completed: boolean
}

/**
 * Estadísticas de simulación
 */
export interface SimulationStatisticsDTO {
  simulation_id: string
  total_generations: number
  generations_executed: number
  initial_live_cells: number
  current_live_cells: number
  alive_percentage: number
  max_alive_cells: number
  min_alive_cells: number
  stable: boolean
  oscillating: boolean
  growth_rate: number
}

/**
 * Lista paginada de simulaciones
 */
export interface PaginatedSimulationsDTO {
  items: SimulationResponseDTO[]
  total: number
  limit: number
  offset: number
}

/**
 * Respuesta de Error API
 */
export interface ApiErrorResponseDTO {
  detail: string
  status: number
  timestamp: string
  path?: string
  request_id?: string
}
