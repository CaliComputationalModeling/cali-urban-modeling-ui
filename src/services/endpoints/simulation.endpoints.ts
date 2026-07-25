import { http } from '../http'
import type {
  CreateSimulationRequest,
  ExecutionInitResponse,
  ExecutionStatusResponse,
  SimulationId,
} from '@/shared/contracts/simulation.contract'

// ─── Tipos alineados con el backend (escenario_router.py) ─────────────────────

export interface CreateRuleRequest {
  nombre_regla: string
  formula: string
  pesos: Record<string, number>
  friccion_transito?: number
  descripcion?: string
}

export interface ReglaTransicionResponse {
  id: number
  nombre_regla: string
  formula: string
  pesos: Record<string, number>
  friccion_transito: number
  descripcion?: string
  fecha_creacion?: string
}

export interface AtractorFisicoResponse {
  id: number
  tipo: string
  lat: number
  lon: number
  intensidad: number
  radio_influencia: number
  descripcion?: string
  activo: boolean
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
  configuracion_malla: {
    resolucion_metros?: number
    tamano_celda?: number
    ancho_celdas?: number
    ancho?: number
    alto_celdas?: number
    alto?: number
    densidad_inicial?: number[][]
    [key: string]: unknown
  }
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

export interface EscenarioResponse {
  id: number | null
  nombre: string
  creado_por?: number | null
  activo: boolean
  fecha_creacion?: string
}

// Lo que devuelve POST /api/simulaciones/ejecutar → EjecucionSimulacionDTO
export interface PasoSimulacionDTO {
  tiempo: number
  densidad: number[][]
  atractivo: number[][]
  total_poblacion: number
  poblacion_por_comuna?: Record<number, number>
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

export type SimulationExecutionStatus = 'en_proceso' | 'finalizado' | 'fallido'

export interface SimulationExecutionSummary {
  id: number
  version_escenario_id: number
  estado: SimulationExecutionStatus
  tiempo_actual: number
  fecha_inicio?: string
  fecha_fin?: string
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

  listPhysicalAttractors: () =>
    http.get<AtractorFisicoResponse[]>('/api/atractores-fisicos'),

  // 2. Actualizar pesos de una regla
  updateRuleWeights: (ruleId: number, data: UpdatePesosRequest) =>
    http.put<ReglaTransicionResponse>(`/api/reglas/${ruleId}/pesos`, data),

  // 3. Crear escenario → devuelve VersionEscenarioResponse
  createScenario: (data: CreateScenarioRequest) =>
    http.post<VersionEscenarioResponse>('/api/escenarios', data),

  listScenarios: () =>
    http.get<EscenarioResponse[]>('/api/escenarios'),

  listScenarioVersions: () =>
    http.get<VersionEscenarioResponse[]>('/api/escenarios/versiones'),

  // 4. Listar versiones de un escenario
  getScenarioVersions: (scenarioId: number) =>
    http.get<VersionEscenarioResponse[]>(`/api/escenarios/${scenarioId}/versiones`),

  // 5. Obtener una versión puntual
  getScenarioVersion: (versionId: number) =>
    http.get<VersionEscenarioResponse>(`/api/versiones-escenario/${versionId}`),

  // 6. Ejecutar simulación → devuelve EjecucionSimulacionResponse (síncrono, incluye pasos)
  createSimulation: (data: CreateSimulationRequest) =>
    http.post<EjecucionSimulacionResponse | ExecutionInitResponse>('/api/simulaciones/ejecutar', data),

  // 6.1. Estado de ejecución asíncrona
  getSimulationStatus: (ejecucionId: SimulationId | number | string) =>
    http.get<ExecutionStatusResponse>(`/api/simulaciones/${ejecucionId}/estado`),

  listSimulations: (params: { estado?: SimulationExecutionStatus; limit?: number; offset?: number } = {}) =>
    http.get<SimulationExecutionSummary[]>('/api/simulaciones', {
      params: Object.fromEntries(
        Object.entries(params)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)])
      ),
    }),

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
