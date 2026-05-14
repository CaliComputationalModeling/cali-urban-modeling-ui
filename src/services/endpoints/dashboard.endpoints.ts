import { http } from '../http'

export interface DashboardKpis {
  personas_atendidas: number
  variacion_poblacion: number
  zonas_riesgo: number
  as_of?: string
}

export interface DrillDownPoint {
  mes: string // "2026-01" o "Ene"
  personas_atendidas: number
  variacion_poblacion: number
  zonas_riesgo: number
}

type CacheEntry<T> = { value: T; fetchedAt: number }

const KPIS_CACHE_TTL_MS = 60_000
let kpisCache: CacheEntry<DashboardKpis> | null = null

export const dashboardEndpoints = {
  getKpis: async () => {
    const now = Date.now()
    if (kpisCache && now - kpisCache.fetchedAt < KPIS_CACHE_TTL_MS) {
      return { data: kpisCache.value, ok: true, status: 200, headers: new Headers() }
    }

    const res = await http.get<DashboardKpis>('/api/dashboards/kpis')
    if (res.ok && res.data) {
      kpisCache = { value: res.data, fetchedAt: now }
    }
    return res
  },

  getDrillDown: () => http.get<DrillDownPoint[]>('/api/dashboards/drill-down'),
}

