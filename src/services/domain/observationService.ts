/**
 * Observation Service
 * 
 * Maneja observaciones de simulaciones:
 * - Crear observación
 * - Listar observaciones
 * - Obtener detalle de observación
 * - Actualizar observación
 * - Eliminar observación
 */

import { http } from '../http'

export interface ObservationDTO {
  id: string
  simulation_id: string
  user_id: number
  description: string
  severity: 'low' | 'medium' | 'high'
  status: 'open' | 'closed' | 'resolved'
  created_at: string
  updated_at: string
}

export interface CreateObservationDTO {
  simulation_id: string
  description: string
  severity: 'low' | 'medium' | 'high'
}

export interface UpdateObservationDTO {
  description?: string
  severity?: 'low' | 'medium' | 'high'
  status?: 'open' | 'closed' | 'resolved'
}

export interface PaginatedObservationsDTO {
  items: ObservationDTO[]
  total: number
  limit: number
  offset: number
}

class ObservationServiceImpl {
  private readonly API_PREFIX = '/observations'

  /**
   * Crea una nueva observación
   */
  async createObservation(data: CreateObservationDTO): Promise<ObservationDTO> {
    const response = await http.post<ObservationDTO>(this.API_PREFIX, data)
    return response.data
  }

  /**
   * Lista observaciones con paginación
   */
  async listObservations(
    simulationId?: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<PaginatedObservationsDTO> {
    const response = await http.get<PaginatedObservationsDTO>(this.API_PREFIX, {
      params: {
        ...(simulationId && { simulation_id: simulationId }),
        limit: String(limit),
        offset: String(offset),
      }
    })
    return response.data
  }

  /**
   * Obtiene una observación específica
   */
  async getObservation(observationId: string): Promise<ObservationDTO> {
    const response = await http.get<ObservationDTO>(`${this.API_PREFIX}/${observationId}`)
    return response.data
  }

  /**
   * Actualiza una observación
   */
  async updateObservation(
    observationId: string,
    data: UpdateObservationDTO
  ): Promise<ObservationDTO> {
    const response = await http.put<ObservationDTO>(
      `${this.API_PREFIX}/${observationId}`,
      data
    )
    return response.data
  }

  /**
   * Elimina una observación
   */
  async deleteObservation(observationId: string): Promise<void> {
    await http.delete(`${this.API_PREFIX}/${observationId}`)
  }

  /**
   * Obtiene observaciones de una simulación específica
   */
  async getSimulationObservations(simulationId: string): Promise<ObservationDTO[]> {
    const result = await this.listObservations(simulationId, 1000, 0)
    return result.items
  }
}

export const observationService = new ObservationServiceImpl()
