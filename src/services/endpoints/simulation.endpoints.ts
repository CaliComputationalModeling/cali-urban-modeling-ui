import { http } from '../http'
import type { SimulationId } from '@/shared/contracts/simulation.contract'

// ─── Tipos alineados con el backend (escenario_router.py) ─────────────────────

export interface CreateRuleRequest {
  nombre_regla: string
  formula: string
  pesos: Record<string, number>
  descripcion?: string
}

export interface ReglaTransicionResponse {
  id: number
  nombre_regla: string
  formula: string
  pesos: Record<string, number>
  descripcion?: string
  fecha_creacion?: string
}

export interface UpdatePesosRequest {
  pesos: Record<string, number>
}

export interface CreateScenarioRequest {
  nombre: string
  variables_clima: Record<string, number>
  variables_seguridad: Record<string, number>
  regla_transicion_id: number
  configuracion_malla: Record<string, unknown>
}

// Lo que devuelve POST /api/escenarios → VersionEscenarioResponseDTO
export interface VersionEscenarioResponse {
  id: number
  escenario_id: number
  numero_version: number
  variables_clima: Record<string, number>
  variables_seguridad: Record<string, number>
  regla_transicion_id: number
  configuracion_malla: Record<string, unknown>
  estado: string
  fecha_creacion?: string
}

// Lo que devuelve POST /api/simulaciones/ejecutar → EjecucionSimulacionDTO
export interface PasoSimulacionDTO {
  tiempo: number
  densidad: number[][]
  atractivo: number[][]
  total_poblacion: number
}

export interface EjecucionSimulacionResponse {
  id: number
  version_escenario_id: number
  estado: string
  tiempo_actual: number
  ejecutado_por?: number
  fecha_inicio?: string
  fecha_fin?: string
  pasos: PasoSimulacionDTO[]
}

// Lo que devuelve GET /api/simulaciones/{id}/zonas-criticas → ZonasCriticasResponse
export interface CeldaCritica {
  i: number
  j: number
  densidad: number
  lat?: number
  lon?: number
}

export interface ZonasCriticasResponse {
  ejecucion_id: number
  umbral_percentil: number
  total_zonas: number
  zonas: CeldaCritica[]
}

// Lo que devuelve POST /api/validacion/comparar → ValidacionResponse
export interface ValidacionRequest {
  ejecucion_id: number
  fecha_inicio: string // ISO
  fecha_fin: string    // ISO
}

export interface ValidacionResponse {
  ejecucion_id: number
  rmse: number
  r2: number
  desviacion_estandar: number
  ventana_inicio: string
  ventana_fin: string
  total_observaciones: number
  generado_en: string
  datos_adicionales?: Record<string, unknown>
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

export const simulationEndpoints = {
  // 1. Crear regla de transición
  createRule: (data: CreateRuleRequest) =>
    http.post<ReglaTransicionResponse>('/api/reglas', data),

  // Listar reglas (útil para el selector)
  listRules: () =>
    http.get<ReglaTransicionResponse[]>('/api/reglas'),

  // 2. Actualizar pesos de una regla
  updateRuleWeights: (ruleId: number, data: UpdatePesosRequest) =>
    http.put<ReglaTransicionResponse>(`/api/reglas/${ruleId}/pesos`, data),

  // 3. Crear escenario → devuelve VersionEscenarioResponse
  createScenario: (data: CreateScenarioRequest) =>
    http.post<VersionEscenarioResponse>('/api/escenarios', data),

  // 4. Listar versiones de un escenario
  getScenarioVersions: (scenarioId: number) =>
    http.get<VersionEscenarioResponse[]>(`/api/escenarios/${scenarioId}/versiones`),

  // 5. Obtener una versión puntual
  getScenarioVersion: (versionId: number) =>
    http.get<VersionEscenarioResponse>(`/api/versiones-escenario/${versionId}`),

  // 6. Ejecutar simulación → devuelve EjecucionSimulacionResponse (síncrono, incluye pasos)
  createSimulation: (data: {
    version_escenario_id: number
    generaciones: number
    radio_suavizado: number
    movilidad: number
    permanencia_base: number
    sensibilidad_atractivo: number
  }) => http.post<EjecucionSimulacionResponse>('/api/simulaciones/ejecutar', data),

  // 7. Obtener pasos de una ejecución
  getSimulationSteps: (ejecucionId: SimulationId | number) =>
    http.get<PasoSimulacionDTO[]>(`/api/simulaciones/${ejecucionId}/pasos`),

  // 8. Zonas críticas (requiere estado === "finalizado")
  getCriticalZones: (ejecucionId: number, percentil = 90) =>
    http.get<ZonasCriticasResponse>(
      `/api/simulaciones/${ejecucionId}/zonas-criticas`,
      { params: { percentil: String(percentil) } },
    ),

  // 9. Validar simulación contra observaciones reales
  validateSimulation: (data: ValidacionRequest) =>
    http.post<ValidacionResponse>('/api/validacion/comparar', data),

  // 12. Comparar dos ejecuciones
  compareSimulations: (id1: number, id2: number) =>
    http.get(`/api/simulaciones/comparar?ids=${id1},${id2}`),
}