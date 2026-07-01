import { useState } from 'react'
import { scenarioImportExportEndpoints, type ScenarioImportResult } from '@/services/endpoints'
import { getScenarioErrorMessages } from '@/features/scenarios/errors/scenarioErrors'

export function useImportScenario() {
  const [isImporting, setIsImporting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [result, setResult] = useState<ScenarioImportResult | null>(null)

  const importScenario = async (file: File): Promise<ScenarioImportResult | null> => {
    setIsImporting(true)
    setErrors([])
    setResult(null)

    const response = await scenarioImportExportEndpoints.importScenario(file)
    setIsImporting(false)

    if (!response.ok) {
      setErrors(getScenarioErrorMessages(response.data))
      return null
    }

    setResult(response.data)
    return response.data
  }

  return { importScenario, isImporting, errors, result, clearErrors: () => setErrors([]) }
}
