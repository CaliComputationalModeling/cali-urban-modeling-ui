import { http } from '../http'
import type { EscenarioProyeccion } from '@/shared/domain/moduloDemografico'

export interface ProyeccionDemograficaResponse {
  anio: number
  escenario: EscenarioProyeccion
  total: number
  es_anio_censo: boolean
  por_comuna: Record<number, number>
  supuesto_distribucion: string
  advertencia: string | null
}

export interface SerieDemograficaResponse {
  rango: { anio_min: number; anio_max: number }
  serie: Array<{ anio: number; total: number; es_anio_censo: boolean }>
  advertencia: string
}

export interface CalibracionDemograficaResponse {
  observaciones: Array<{ anio: number; total: number }>
  modelos: Record<string, unknown>
  escenarios_2024: Record<EscenarioProyeccion, number>
  supuestos: Record<string, unknown>
  advertencia_incertidumbre: string
  supuesto_distribucion_comuna: string
  justificacion_escenario_alto: string
}

export const demografiaEndpoints = {
  getCalibracion: () =>
    http.get<CalibracionDemograficaResponse>('/api/demografia/calibracion'),

  getProyeccion: (anio: number, escenario: EscenarioProyeccion = 'medio') =>
    http.get<ProyeccionDemograficaResponse>('/api/demografia/proyeccion', {
      params: { anio: String(anio), escenario },
    }),

  getSerie: (escenario: EscenarioProyeccion = 'medio') =>
    http.get<SerieDemograficaResponse>('/api/demografia/serie', {
      params: { escenario },
    }),
}
