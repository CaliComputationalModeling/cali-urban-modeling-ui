import { http } from '../http'
import type {
  SimulationId,
  CreateSimulationRequest,
  CreateSimulationResponse,
  RunStepResponse,
  ResetSimulationResponse,
  RuleWeightsRequest,
  CreateScenarioRequest,
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
    http.post<CreateSimulationResponse>('/api/simulaciones/ejecutar', data),

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

  // Actualizar pesos de una regla de transición
  // PUT /api/reglas/{id}/pesos  body: { frio:number, comida:number, seguridad:number }
  updateRuleWeights: (ruleId: number, weights: RuleWeightsRequest) =>
    http.put(`/api/reglas/${encodeURIComponent(String(ruleId))}/pesos`, weights),

  // Crear escenario
  // POST /api/escenarios/  body: { nombre, clima: { temperatura, lluvia }, seguridad, malla: { filas, columnas } }
  createScenario: (payload: CreateScenarioRequest) => http.post('/api/escenarios/', payload),

  // Obtener pasos/matrices de una simulación
  // GET /api/simulaciones/{id}/pasos
  getSimulationSteps: (simulationId: SimulationId) => http.get(`/api/simulaciones/${encodeURIComponent(String(simulationId))}/pasos`),

  // Comparar simulaciones
  // GET /api/simulaciones/comparar?ids=id1,id2
  compareSimulations: (ids: string[]) => http.get(`/api/simulaciones/comparar?ids=${ids.map(encodeURIComponent).join(',')}`),

  // Obtener estado de ejecución para polling
  // GET /api/simulaciones/{ejecucion_id}/estado
  getExecutionStatus: (ejecucionId: string | number) =>
    http.get<{ estado: string; progreso?: number; mensaje?: string }>(`/api/simulaciones/${encodeURIComponent(String(ejecucionId))}/estado`),
}
