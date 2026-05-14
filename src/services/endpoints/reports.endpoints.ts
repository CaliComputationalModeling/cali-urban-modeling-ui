import { http } from '../http'

export type ReportTemplateType = 'TRIMESTRAL' | 'GEOGRAFICO'
export type ReportFormat = 'PDF' | 'EXCEL'

export interface GenerateReportRequest {
  plantilla: ReportTemplateType
  fecha_inicio: string // YYYY-MM-DD
  fecha_fin: string // YYYY-MM-DD
  formato: ReportFormat
}

export interface ReportHistoryItem {
  id: string
  plantilla: ReportTemplateType
  formato: ReportFormat
  fecha_inicio: string
  fecha_fin: string
  creado_en: string
  estado: 'GENERADO' | 'PENDIENTE' | 'FALLIDO'
  archivo_nombre?: string
}

export const reportsEndpoints = {
  generate: (payload: GenerateReportRequest) => http.postBlob('/api/reportes/generar', payload),

  // si el backend no existe aún, la UI manejará el error y mostrará vacío
  history: () => http.get<ReportHistoryItem[]>('/api/reportes/historial'),
}

