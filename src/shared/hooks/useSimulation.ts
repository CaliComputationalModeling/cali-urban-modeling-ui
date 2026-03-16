/**
 * Hook para gestionar la simulación de autómata celular
 *
 * Encapsula:
 * - Lógica de fetching de datos
 * - Control de ejecución (play/pause/reset)
 * - Actualización automática cada N milisegundos
 * - Manejo de errores
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { simulationService } from '@/services/domain/simulationService'
import type { SimulationResponseDTO } from '@/shared/types/api.dtos'

export interface UseSimulationOptions {
  simulationId?: string
  autoPlay?: boolean
  updateInterval?: number // milisegundos
  onUpdate?: (data: SimulationResponseDTO) => void
  onError?: (error: Error) => void
}

export interface UseSimulationReturn {
  // Estado
  simulationData: SimulationResponseDTO | null
  isLoading: boolean
  isRunning: boolean
  error: Error | null
  generation: number
  aliveCells: number
  populationDensity: number

  // Acciones
  start: () => void
  pause: () => void
  reset: () => Promise<void>
  step: () => Promise<void>
  stepMultiple: (generations: number) => Promise<void>
  refresh: () => Promise<void>
  
  // Control
  setUpdateInterval: (interval: number) => void
}

/**
 * Hook para controlar simulación de autómata celular
 *
 * @example
 * const { start, pause, isRunning, generation } = useSimulation({
 *   simulationId: 'sim_123',
 *   updateInterval: 500,
 *   autoPlay: true,
 * })
 */
export const useSimulation = (options: UseSimulationOptions): UseSimulationReturn => {
  const {
    simulationId,
    autoPlay = false,
    updateInterval = 1000,
    onUpdate,
    onError,
  } = options

  // Estado
  const [simulationData, setSimulationData] = useState<SimulationResponseDTO | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRunning, setIsRunning] = useState(autoPlay)
  const [error, setError] = useState<Error | null>(null)
  const [updateIntervalMs, setUpdateIntervalMs] = useState(updateInterval)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Datos derivados
  const generation = simulationData?.generation ?? 0
  const aliveCells = simulationData?.grid?.alive_cells ?? 0
  const populationDensity = simulationData?.grid ? (simulationData.grid.alive_cells / simulationData.grid.total_cells) * 100 : 0

  /**
   * Obtiene estado actual de la simulación
   */
  const refresh = useCallback(async () => {
    if (!simulationId) return

    try {
      setIsLoading(true)
      setError(null)
      const data = await simulationService.getSimulation(simulationId)
      setSimulationData(data)
      onUpdate?.(data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [simulationId, onUpdate, onError])

  /**
   * Ejecuta un paso de simulación
   */
  const step = useCallback(async () => {
    if (!simulationId) return

    try {
      setIsLoading(true)
      setError(null)
      await simulationService.runSimulationStep(simulationId, { generations: 1 })
      await refresh()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to execute step')
      setError(error)
      onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [simulationId, refresh, onError])

  /**
   * Ejecuta múltiples pasos
   */
  const stepMultiple = useCallback(
    async (generations: number) => {
      if (!simulationId) return

      try {
        setIsLoading(true)
        setError(null)
        await simulationService.runSimulationStep(simulationId, { generations })
        await refresh()
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to execute steps')
        setError(error)
        onError?.(error)
      } finally {
        setIsLoading(false)
      }
    },
    [simulationId, refresh, onError]
  )

  /**
   * Reinicia la simulación
   */
  const reset = useCallback(async () => {
    if (!simulationId) return

    try {
      setIsLoading(true)
      setError(null)
      await simulationService.resetSimulation(simulationId)
      await refresh()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to reset')
      setError(error)
      onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [simulationId, refresh, onError])

  /**
   * Inicia simulación automática
   */
  const start = useCallback(() => {
    setIsRunning(true)
  }, [])

  /**
   * Pausa simulación automática
   */
  const pause = useCallback(() => {
    setIsRunning(false)
  }, [])

  /**
   * Actualizar intervalo
   */
  const setUpdateInterval = useCallback((newInterval: number) => {
    setUpdateIntervalMs(newInterval)
  }, [])

  // Cargar simulación inicial
  useEffect(() => {
    refresh()
  }, [simulationId])

  // Loop de actualización automática
  useEffect(() => {
    if (!isRunning || !simulationId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Ejecutar primer paso inmediatamente
    void step()

    // Luego repetir cada interval
    intervalRef.current = setInterval(() => {
      void step()
    }, updateIntervalMs)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning, simulationId, updateIntervalMs, step])

  return {
    simulationData,
    isLoading,
    isRunning,
    error,
    generation,
    aliveCells,
    populationDensity,
    start,
    pause,
    reset,
    step,
    stepMultiple,
    refresh,
    setUpdateInterval,
  }
}
