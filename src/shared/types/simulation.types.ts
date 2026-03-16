// Tipos para las celdas del grid
export interface Position {
  x: number
  y: number
}

export interface Cell {
  position: Position
  state: number // 0 = empty, 1 = occupied
}

// Configuración de la simulación
export interface GridConfig {
  width: number
  height: number
  cellSize: string // Ej: "10x10m", "20x20m"
}

export interface SimulationConfig {
  gridConfig: GridConfig
  iterations: number // depth de simulación
  parameters: SimulationParameters
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
