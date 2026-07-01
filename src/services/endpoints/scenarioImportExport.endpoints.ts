import { http } from '../http'

export interface ScenarioImportResult {
  escenario_id: number
  version_id: number
  regla_id: number
  nombre: string
  total_pesos: number
  total_reglas: number
  message: string
}

export const scenarioImportExportEndpoints = {
  importScenario: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return http.postForm<ScenarioImportResult>('/api/escenarios/importar', formData)
  },

  exportScenario: (scenarioId: number) =>
    http.get<Blob>(`/api/escenarios/${scenarioId}/exportar`, {
      responseType: 'blob',
    }),
}
