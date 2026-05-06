import { http } from '../http'
import type {
  SimulationId,
  CreateSimulationRequest,
  CreateSimulationResponse,
  RunStepResponse,
  ResetSimulationResponse,
} from '@/shared/contracts/simulation.contract'

/**
 * ENDPOINTS DE SIMULACIÓN - REFACTORIZADO PARA CONTRATO UNIFICADO
 *
 * Principios:
 * - 1 request por tick: runStep devuelve geojson + urban_state juntos
 * - Tipado fuerte con contratos
 * - IDs siempre como string (SimulationId)
 * - Sin any
 */

export const simulationEndpoints = {
  /**
   * Crear nueva simulación espacial
   * POST /api/simulaciones/ejecutar
   *
   * Cuerpo esperado: CreateSimulationRequest
   * Respuesta: CreateSimulationResponse (con simulation_id)
   */
  createSimulation: (data: CreateSimulationRequest) =>
    http.post<CreateSimulationResponse>('/simulaciones/ejecutar', data),

  /**
   * Ejecutar 1 paso de simulación - ENDPOINT UNIFICADO
   * POST /api/simulations/{id}/run-espacial
   *
   * Devuelve en 1 request:
   * - geojson completo (GeoFeatures con propiedades de celda)
   * - urban_state (métricas agregadas)
   * - metadata (generación, timestamp, etc.)
   * - flag completada (backend indica si terminó)
   *
   * Cuerpo: { generations: 1 }
   */
  runStep: (simulationId: SimulationId, generations: number = 1) =>
    http.post<RunStepResponse>(
      `/simulations/${simulationId}/run-espacial`,
      { generations },
    ),

  /**
   * Resetear simulación
   * POST /api/simulations/{id}/reset
   *
   * Respuesta: estado inicial (generación 0)
   */
  resetSimulation: (simulationId: SimulationId) =>
    http.post<ResetSimulationResponse>(`/simulations/${simulationId}/reset`, {}),
}
