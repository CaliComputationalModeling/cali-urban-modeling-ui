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

export interface HeatmapParams {
  fecha_inicio: string
  fecha_fin: string
  tipo_observacion?: string
}

function getDefaultHeatmapParams(): HeatmapParams {
  const end = new Date()
  const start = new Date(end)
  start.setMonth(start.getMonth() - 4)

  return {
    fecha_inicio: start.toISOString(),
    fecha_fin: end.toISOString(),
  }
}

export const mapsEndpoints = {
  getHeatmap: (params: Partial<HeatmapParams> = {}) =>
    http.get<HeatmapCell[]>('/api/mapas/heatmap', {
      params: {
        ...getDefaultHeatmapParams(),
        ...params,
      },
    }),
  getPredictedRoutes: (ejecucionId: string) =>
    http.get<PredictedRoutesResponse>(`/api/mapas/rutas/${encodeURIComponent(ejecucionId)}`),
}
