import { apiClient } from "../apiClient"
import type { Simulation, Cell } from "@/shared/types/simulation.types"

export interface SimulationCreateRequest {
  name: string
  description?: string
  grid_config: {
    width: number
    height: number
    neighborhood_type?: "moore" | "von_neumann"
  }
  rule: {
    rule_type: "conway" | "wolfram" | "custom"
    birth?: number[]
    survival?: number[]
    wolfram_code?: number
  }
  initial_cells?: Array<{ x: number; y: number; state: number }>
}

export interface SimulationRunRequest {
  generations: number
}

export interface SimulationResponse {
  simulation_id: string
  name: string
  grid: {
    width: number
    height: number
    alive_cells: number
    generation: number
  }
  cells: Cell[]
}

export interface SimulationStatistics {
  alive_cells: number
  dead_cells: number
  generation: number
  density: number
  live_cell_clusters: number
}

export const simulationEndpoints = {
  // Listar todas las simulaciones con paginación
  getAll: (limit: number = 10, offset: number = 0) =>
    apiClient.get<{
      items: Simulation[]
      total: number
      limit: number
      offset: number
    }>("/api/simulations", {
      limit: limit.toString(),
      offset: offset.toString(),
    }),

  // Obtener una simulación específica
  getById: (id: string) => apiClient.get<SimulationResponse>(`/api/simulations/${id}`),

  // Crear una nueva simulación
  create: (simulation: SimulationCreateRequest) =>
    apiClient.post<SimulationResponse>("/api/simulations", simulation),

  // Ejecutar N generaciones de una simulación
  runStep: (id: string, generations: number = 1) =>
    apiClient.post<SimulationResponse>(`/api/simulations/${id}/run`, { generations }),

  // Exportar como GeoJSON
  exportGeoJSON: (id: string) => apiClient.get<GeoJSON.FeatureCollection>(`/api/simulations/${id}/geojson`),

  // Exportar como mapa de calor GeoJSON
  exportHeatmapGeoJSON: (id: string, aggregation: "density" | "state" = "density") =>
    apiClient.get<GeoJSON.FeatureCollection>(`/api/simulations/${id}/geojson/heatmap`, {
      aggregation,
    }),

  // Obtener estadísticas de la simulación
  getStatistics: (id: string) => apiClient.get<SimulationStatistics>(`/api/simulations/${id}/statistics`),

  // Reiniciar simulación a estado inicial
  reset: (id: string) => apiClient.post<SimulationResponse>(`/api/simulations/${id}/reset`, {}),

  // Eliminar simulación
  delete: (id: string) => apiClient.delete(`/api/simulations/${id}`),
}
