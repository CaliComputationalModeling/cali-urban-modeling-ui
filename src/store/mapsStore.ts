import { create } from 'zustand'
import { mapsEndpoints, type HeatmapCell, type PredictedRoutesResponse } from '@/services/endpoints'

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
  error: string | null

  setSelectedExecutionId: (id: string) => void
  fetchHeatmap: () => Promise<void>
  fetchPredictedRoutes: () => Promise<void>
  clearError: () => void
  reset: () => void
}

const INITIAL_STATE: Pick<
  MapsState,
  | 'heatmap'
  | 'predicted'
  | 'selectedExecutionId'
  | 'isLoadingHeatmap'
  | 'isLoadingRoutes'
  | 'error'
> = {
  heatmap: [],
  predicted: null,
  selectedExecutionId: '',
  isLoadingHeatmap: false,
  isLoadingRoutes: false,
  error: null,
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

  clearError: () => set({ error: null }),
  reset: () => set({ ...INITIAL_STATE }),
}))

