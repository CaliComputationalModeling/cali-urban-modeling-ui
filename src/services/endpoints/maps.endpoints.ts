import { http } from '../http'

// Tipos alineados con mapa_router.py

export interface HeatmapCell {
  lat: number
  lon: number
  densidad: number
  conteo?: number
  periodo?: string
}

export interface MapaCalorResponse {
  celdas: HeatmapCell[]
  generado_en: string
}

export interface RutaMovilidad {
  origen: { lat: number; lon: number }
  destino: { lat: number; lon: number }
  intensidad: number
  etiqueta?: string
}

export interface RutasMovilidadResponse {
  rutas: RutaMovilidad[]
  confluencias?: { lat: number; lon: number; intensidad: number }[]
}

export type PredictedRoutesResponse = RutasMovilidadResponse

export interface ComparacionHeatmapRutasResponse {
  mapa_calor: MapaCalorResponse
  rutas: RutasMovilidadResponse
}

export interface HeatmapParams {
  fecha_inicio: string // ISO datetime
  fecha_fin: string
  tipo_observacion?: string
}

function defaultHeatmapParams(): HeatmapParams {
  const end = new Date()
  const start = new Date(end)
  start.setMonth(start.getMonth() - 4)
  return { fecha_inicio: start.toISOString(), fecha_fin: end.toISOString() }
}

export const mapsEndpoints = {
  // 10. Heatmap histórico de observaciones
  getHeatmap: (params: Partial<HeatmapParams> = {}) =>
    http.get<MapaCalorResponse>('/api/mapas/heatmap', {
      params: { ...defaultHeatmapParams(), ...params } as Record<string, string>,
    }),

  // 10. Rutas de movilidad desde una ejecución
  getPredictedRoutes: (ejecucionId: string | number, umbralFlujo = 0.1) =>
    http.get<RutasMovilidadResponse>(`/api/mapas/rutas/${ejecucionId}`, {
      params: { umbral_flujo: String(umbralFlujo) },
    }),

  // 11. Comparar heatmap histórico con rutas simuladas
  compareHeatmapAndRoutes: (params: {
    ejecucion_id: number
    fecha_inicio: string
    fecha_fin: string
    tipo_observacion?: string
  }) =>
    http.get<ComparacionHeatmapRutasResponse>('/api/mapas/comparar-heatmap-rutas', {
      params: Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      ),
    }),
}
