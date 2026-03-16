/**
 * Simulation Service
 * 
 * Encapsula toda la lógica de integración con endpoints de simulación
 * Sigue Single Responsibility Principle - solo se encarga de simulaciones
 * Type-safe con DTOs del backend
 */

import { getHttpClient } from '@/services/http/index'
import type {
  SimulationCreateRequestDTO,
  SimulationResponseDTO,
  SimulationRunRequestDTO,
  SimulationRunResponseDTO,
  SimulationStatisticsDTO,
  PaginatedSimulationsDTO,
} from '@/shared/types/api.dtos'

class SimulationServiceImpl {
  private readonly API_PREFIX = '/api/simulations'

  /**
   * Crea una nueva simulación
   * @param request - Configuración de la simulación
   * @returns Simulación creada con ID único
   */
  async createSimulation(request: SimulationCreateRequestDTO): Promise<SimulationResponseDTO> {
    const client = getHttpClient()
    const response = await client.post<SimulationResponseDTO>(
      this.API_PREFIX,
      request
    )
    return response.data
  }

  /**
   * Obtiene una simulación específica por ID
   * @param simulationId - ID de la simulación
   * @returns Datos de la simulación
   */
  async getSimulation(simulationId: string): Promise<SimulationResponseDTO> {
    const client = getHttpClient()
    const response = await client.get<SimulationResponseDTO>(
      `${this.API_PREFIX}/${simulationId}`
    )
    return response.data
  }

  /**
   * Lista todas las simulaciones con paginación
   * @param limit - Máximo de resultados por página
   * @param offset - Número de resultados a saltar
   * @returns Lista paginada de simulaciones
   */
  async listSimulations(limit: number = 10, offset: number = 0): Promise<PaginatedSimulationsDTO> {
    const client = getHttpClient()
    const response = await client.get<PaginatedSimulationsDTO>(
      this.API_PREFIX,
      {
        params: { limit: String(limit), offset: String(offset) }
      }
    )
    return response.data
  }

  /**
   * Ejecuta uno o más pasos (generaciones) de la simulación
   * @param simulationId - ID de la simulación
   * @param request - Parámetros de ejecución (número de generaciones)
   * @returns Estadísticas después de la ejecución
   */
  async runSimulationStep(
    simulationId: string,
    request: SimulationRunRequestDTO
  ): Promise<SimulationRunResponseDTO> {
    const client = getHttpClient()
    const response = await client.post<SimulationRunResponseDTO>(
      `${this.API_PREFIX}/${simulationId}/run`,
      request
    )
    return response.data
  }

  /**
   * Obtiene estadísticas detalladas de una simulación
   * @param simulationId - ID de la simulación
   * @returns Estadísticas completas
   */
  async getStatistics(simulationId: string): Promise<SimulationStatisticsDTO> {
    const client = getHttpClient()
    const response = await client.get<SimulationStatisticsDTO>(
      `${this.API_PREFIX}/${simulationId}/statistics`
    )
    return response.data
  }

  /**
   * Exporta simulación como GeoJSON
   * @param simulationId - ID de la simulación
   * @returns GeoJSON FeatureCollection
   */
  async exportAsGeoJSON(simulationId: string): Promise<GeoJSON.FeatureCollection> {
    const client = getHttpClient()
    const response = await client.get<GeoJSON.FeatureCollection>(
      `${this.API_PREFIX}/${simulationId}/geojson`
    )
    return response.data
  }

  /**
   * Exporta simulación como heatmap GeoJSON
   * @param simulationId - ID de la simulación
   * @returns GeoJSON con datos de heatmap
   */
  async exportAsHeatmapGeoJSON(simulationId: string): Promise<GeoJSON.FeatureCollection> {
    const client = getHttpClient()
    const response = await client.get<GeoJSON.FeatureCollection>(
      `${this.API_PREFIX}/${simulationId}/heatmap-geojson`
    )
    return response.data
  }

  /**
   * Resetea la simulación a su estado inicial
   * @param simulationId - ID de la simulación
   * @returns Simulación con estado reseteado
   */
  async resetSimulation(simulationId: string): Promise<SimulationResponseDTO> {
    const client = getHttpClient()
    const response = await client.post<SimulationResponseDTO>(
      `${this.API_PREFIX}/${simulationId}/reset`
    )
    return response.data
  }

  /**
   * Elimina una simulación
   * @param simulationId - ID de la simulación
   */
  async deleteSimulation(simulationId: string): Promise<void> {
    const client = getHttpClient()
    await client.delete(`${this.API_PREFIX}/${simulationId}`)
  }
}

// Singleton instance
export const simulationService = new SimulationServiceImpl()
