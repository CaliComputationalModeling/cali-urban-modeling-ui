import { http } from '../http'
import type {
  Simulation,
  SimulationCreateRequest,
  SimulationRunRequest,
  SimulationRunResponse,
  SimulationProgress,
  SimulationResults,
  SimulationStatistics,
} from '@/shared/types/simulation.types'
import type { FeatureCollection, Geometry } from 'geojson'

export const simulationEndpoints = {
  // CRUD
  getAll: (limit = 10, offset = 0) =>
    http.get<{ items: Simulation[]; total: number }>(
      `/simulations?limit=${limit}&offset=${offset}`,
    ),
  getById: (id: number | string) => http.get<Simulation>(`/simulations/${id}`),
  create: (data: SimulationCreateRequest) => http.post<Simulation>('/simulations', data),
  createSpatial: (data: SimulationCreateRequest, nAgentes = 100) =>
    http.post<Simulation>(`/simulations/espacial?n_agentes=${nAgentes}`, data),
  stop: (id: number | string) => http.delete(`/simulations/${id}`),
  cancel: (id: number | string) => http.delete(`/simulations/${id}/cancelar`),

  // Ejecucion
  run: (id: number | string, data: SimulationRunRequest) =>
    http.post<SimulationRunResponse>(`/simulations/${id}/run`, data),
  runSpatial: (id: number | string, data: SimulationRunRequest) =>
    http.post<SimulationRunResponse>(`/simulations/${id}/run-espacial`, data),
  reset: (id: number | string) => http.post(`/simulations/${id}/reset`, {}),

  // Monitoreo
  getStatistics: (id: number | string) =>
    http.get<SimulationStatistics>(`/simulations/${id}/statistics`),
  getProgress: (id: number | string) =>
    http.get<SimulationProgress>(`/simulations/${id}/progreso`),
  getResults: (id: number | string) =>
    http.get<SimulationResults>(`/simulations/${id}/resultados`),
  getGeoJson: (id: number | string) =>
    http.get<FeatureCollection<Geometry>>(`/simulations/${id}/geojson`),
  getUrbanState: (id: number | string) =>
    http.get(`/simulations/${id}/estado-urbano`),
  getServerStatus: () => http.get('/simulations/estado-servidor'),
  validateInputs: (data: { escenario_id?: number; regla_id?: number }) =>
    http.post('/simulations/validar-inputs', data),
}
