import { create } from 'zustand'
import { mapsEndpoints, type HeatmapCell, type PredictedRoutesResponse } from '@/services/endpoints'
import type { FeatureCollection, GeoJsonObject } from 'geojson'

const COMUNAS_GEOJSON_URL = `${import.meta.env.BASE_URL}maps/comunas_cali.geojson`

function extractErrorMessage(data: unknown): string {
  if (data && typeof data === 'object' && 'detail' in data) return String((data as { detail: unknown }).detail)
  return 'No fue posible cargar los datos de cartografía'
}

interface MapsState {
  heatmap: HeatmapCell[]
  predicted: PredictedRoutesResponse | null
  selectedExecutionId: string
  isLoadingHeatmap: boolean
  isLoadingRoutes: boolean
  isLoadingComunas: boolean
  error: string | null
  showComunasLayer: boolean
  comunasGeoJson: GeoJsonObject | null

  setSelectedExecutionId: (id: string) => void
  fetchHeatmap: () => Promise<void>
  fetchPredictedRoutes: () => Promise<void>
  toggleComunasLayer: () => void
  fetchComunasGeoJson: () => Promise<void>
  clearError: () => void
  reset: () => void
}

function isPolygonFeatureCollection(data: GeoJsonObject): data is FeatureCollection {
  if (data.type !== 'FeatureCollection') return false
  const collection = data as FeatureCollection
  return collection.features.some((feature) => {
    const geometryType = feature.geometry?.type
    return geometryType === 'Polygon' || geometryType === 'MultiPolygon'
  })
}

function assertComunasGeoJson(data: GeoJsonObject, source: string): GeoJsonObject {
  if (!isPolygonFeatureCollection(data)) {
    throw new Error(`${source} no contiene polígonos de comunas. Debe ser un FeatureCollection con Polygon o MultiPolygon.`)
  }
  return data
}

async function fetchLocalComunasGeoJson(): Promise<GeoJsonObject> {
  const response = await fetch(COMUNAS_GEOJSON_URL, {
    headers: { Accept: 'application/geo+json, application/json' },
  })

  if (!response.ok) {
    throw new Error(`Archivo local no disponible: ${response.statusText}`)
  }

  const text = await response.text()
  const trimmed = text.trimStart()
  if (trimmed.startsWith('<')) {
    throw new Error('Vite devolvió HTML en lugar de GeoJSON para la capa local de comunas')
  }

  return assertComunasGeoJson(JSON.parse(text) as GeoJsonObject, 'public/maps/comunas_cali.geojson')
}

const INITIAL_STATE: Pick<
  MapsState,
  | 'heatmap'
  | 'predicted'
  | 'selectedExecutionId'
  | 'isLoadingHeatmap'
  | 'isLoadingRoutes'
  | 'isLoadingComunas'
  | 'error'
  | 'showComunasLayer'
  | 'comunasGeoJson'
> = {
  heatmap: [],
  predicted: null,
  selectedExecutionId: '',
  isLoadingHeatmap: false,
  isLoadingRoutes: false,
  isLoadingComunas: false,
  error: null,
  showComunasLayer: false,
  comunasGeoJson: null,
}

export const useMapsStore = create<MapsState>((set, get) => ({
  ...INITIAL_STATE,

  setSelectedExecutionId: (id) => set({ selectedExecutionId: id }),

  fetchHeatmap: async () => {
    set({ isLoadingHeatmap: true, error: null })
    const res = await mapsEndpoints.getHeatmap()
    if (res.ok && res.data && Array.isArray(res.data.celdas)) {
      set({ heatmap: res.data.celdas, isLoadingHeatmap: false })
    } else {
      set({ isLoadingHeatmap: false, error: extractErrorMessage(res.data) })
    }
  },

  fetchPredictedRoutes: async () => {
    const ejecucionId = get().selectedExecutionId.trim()
    if (!ejecucionId) {
      set({ error: 'Ingresa un ID de ejecución para cargar rutas predichas.' })
      return
    }

    set({ isLoadingRoutes: true, error: null })
    const res = await mapsEndpoints.getPredictedRoutes(ejecucionId)
    if (res.ok && res.data) {
      set({ predicted: res.data, isLoadingRoutes: false })
    } else {
      set({ isLoadingRoutes: false, error: extractErrorMessage(res.data) })
    }
  },

  toggleComunasLayer: () => {
    const nextValue = !get().showComunasLayer
    set({ showComunasLayer: nextValue })
    if (nextValue) void get().fetchComunasGeoJson()
  },

  fetchComunasGeoJson: async () => {
    if (get().comunasGeoJson || get().isLoadingComunas) return

    set({ isLoadingComunas: true, error: null })
    try {
      const data = await fetchLocalComunasGeoJson().catch(async (localError: unknown) => {
        const backendRes = await mapsEndpoints.getComunasGeoJson()
        if (backendRes.ok && backendRes.data) {
          return assertComunasGeoJson(backendRes.data, '/api/mapas/comunas')
        }
        const localMessage = localError instanceof Error ? localError.message : 'No se pudo leer el archivo local'
        throw new Error(`${localMessage}. Fallback backend falló: ${extractErrorMessage(backendRes.data)}`)
      })
      set({ comunasGeoJson: data, isLoadingComunas: false })
    } catch (error) {
      set({
        isLoadingComunas: false,
        error: error instanceof Error ? error.message : 'No se pudo cargar la capa de comunas',
      })
    }
  },

  clearError: () => set({ error: null }),
  reset: () => set({ ...INITIAL_STATE }),
}))

