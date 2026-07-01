import { useState } from 'react'
import { scenarioImportExportEndpoints } from '@/services/endpoints'
import { getScenarioErrorMessages } from '@/features/scenarios/errors/scenarioErrors'

function filenameFromDisposition(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback
  const match = /filename="?([^";]+)"?/i.exec(disposition)
  return match?.[1] ?? fallback
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function useExportScenario() {
  const [exportingScenarioId, setExportingScenarioId] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<number, string[]>>({})

  const exportScenario = async (scenarioId: number, scenarioName: string): Promise<boolean> => {
    setExportingScenarioId(scenarioId)
    setErrors((current) => ({ ...current, [scenarioId]: [] }))

    const response = await scenarioImportExportEndpoints.exportScenario(scenarioId)
    setExportingScenarioId(null)

    if (!response.ok) {
      setErrors((current) => ({ ...current, [scenarioId]: getScenarioErrorMessages(response.data) }))
      return false
    }

    const filename = filenameFromDisposition(
      response.headers.get('content-disposition'),
      `escenario_${scenarioId}_${scenarioName.replace(/\W+/g, '_').toLowerCase()}.xlsx`,
    )
    downloadBlob(response.data, filename)
    return true
  }

  return { exportScenario, exportingScenarioId, errors }
}
