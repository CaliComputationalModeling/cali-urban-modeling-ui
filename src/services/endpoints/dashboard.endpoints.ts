import { http } from '../http'

export interface DashboardKpis {
  personas_atendidas: number
  variacion_poblacion: number
  zonas_riesgo: number
  as_of?: string
}

interface BackendKpiValue {
  valor: number
  umbral_critico?: number | null
  bandera_roja?: boolean
  unidad?: string
}

interface BackendDashboardKpis {
  personas_unicas_atendidas: BackendKpiValue
  variacion_poblacion_simulada: BackendKpiValue
  zonas_mayor_incidencia: unknown[]
  generado_en: string
}

interface BackendDrillDown {
  puntos: Array<{ periodo: string; valor: number; etiqueta?: string | null }>
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

    const res = await http.get<BackendDashboardKpis>('/api/dashboards/kpis')
    if (res.ok && res.data) {
      const mapped: DashboardKpis = {
        personas_atendidas: Number(res.data.personas_unicas_atendidas?.valor ?? 0),
        variacion_poblacion: Number(res.data.variacion_poblacion_simulada?.valor ?? 0),
        zonas_riesgo: Array.isArray(res.data.zonas_mayor_incidencia) ? res.data.zonas_mayor_incidencia.length : 0,
        as_of: res.data.generado_en,
      }
      kpisCache = { value: mapped, fetchedAt: now }
      return { ...res, data: mapped }
    }
    return { ...res, data: null as unknown as DashboardKpis }
  },

  getDrillDown: async () => {
    const res = await http.get<BackendDrillDown>('/api/dashboards/drill-down', {
      params: { kpi: 'personas_unicas' },
    })
    if (!res.ok || !res.data) return { ...res, data: [] as DrillDownPoint[] }
    return {
      ...res,
      data: res.data.puntos.map((p) => ({
        mes: p.etiqueta ?? p.periodo,
        personas_atendidas: Number(p.valor ?? 0),
        variacion_poblacion: 0,
        zonas_riesgo: 0,
      })),
    }
  },
}

