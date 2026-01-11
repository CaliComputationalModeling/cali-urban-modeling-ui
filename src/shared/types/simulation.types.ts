export interface Simulation {
  id: string
  version: string
  date: string
  status: SimulationStatus
  parameters: SimulationParameters
  results?: SimulationResults
}

export enum SimulationStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  ERROR = "error",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface SimulationParameters {
  climate: number
  security: number
  services: number
  mobility: number
  cellSize: string
  depth: number
}

export interface SimulationResults {
  estimatedPopulation: number
  criticalZones: number
  accuracy: number
}
