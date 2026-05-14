import { http } from '../http'

export interface HeatmapCell {
  lat: number
  lon: number
  densidad: number
  // opcional: metadata agregada por celda
  conteo?: number
  periodo?: string
}

export interface PredictedRoute {
  id?: string
  origen: { lat: number; lon: number }
  destino: { lat: number; lon: number }
  intensidad: number
  etiqueta?: string
}

export interface ConfluencePoint {
  lat: number
  lon: number
  intensidad: number
  etiqueta?: string
}

export interface PredictedRoutesResponse {
  rutas: PredictedRoute[]
  confluencias?: ConfluencePoint[]
}

export const mapsEndpoints = {
  getHeatmap: () => http.get<HeatmapCell[]>('/api/mapas/heatmap'),
  getPredictedRoutes: (ejecucionId: string) =>
    http.get<PredictedRoutesResponse>(`/api/mapas/rutas/${encodeURIComponent(ejecucionId)}`),
}

