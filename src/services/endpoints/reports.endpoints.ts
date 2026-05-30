import { http } from '../http'

export type ReportTemplateType = 'TRIMESTRAL' | 'GEOGRAFICO'
export type ReportFormat = 'PDF' | 'EXCEL'

// 13. Body actualizado para POST /api/reportes/generar
export interface GenerateReportRequest {
  tipo_plantilla: ReportTemplateType
  fecha_inicio: string     // YYYY-MM-DD
  fecha_fin: string        // YYYY-MM-DD
  formato: ReportFormat
  componentes?: string[]   // e.g. ["kpis", "mapa", "rutas"]
  ejecucion_ids?: string[] // IDs de simulaciones a incluir
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
  // 13. Generar reporte (PDF o Excel)
  // POST /api/reportes/generar
  generate: (payload: GenerateReportRequest) =>
    http.postBlob('/api/reportes/generar', payload),

  history: () =>
    http.get<ReportHistoryItem[]>('/api/reportes/historial'),
}