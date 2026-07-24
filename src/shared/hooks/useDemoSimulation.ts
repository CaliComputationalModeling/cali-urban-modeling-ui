/**
 * Hook para crear y gestionar simulaciones de demostración
 * 
 * Proporciona funcionalidad para:
 * - Crear una simulación básica de Conway
 * - Poblar con patrón inicial (blinker, glider, etc)
 * - Test rápido del sistema
 */

import { useState, useCallback } from 'react'
import { simulationService } from '@/services/domain/simulationService'
import type { SimulationResponseDTO, NeighborhoodType, BoundaryMode, RuleFormat } from '@/shared/types/api.dtos'

export interface UseDemoSimulationReturn {
  isCreating: boolean
  error: string | null
  createDemoSimulation: (pattern?: 'blinker' | 'glider' | 'random') => Promise<SimulationResponseDTO | null>
}

/**
 * Patrones iniciales predefinidos para el autómata celular de Conway
 */
const INITIAL_PATTERNS = {
  // Patrón Blinker: oscila cada generación
  blinker: [
    { x: 25, y: 24, state: 1 },
    { x: 25, y: 25, state: 1 },
    { x: 25, y: 26, state: 1 },
  ],

  // Patrón Glider: se mueve diagonalmente
  glider: [
    { x: 24, y: 25, state: 1 },
    { x: 25, y: 26, state: 1 },
    { x: 26, y: 24, state: 1 },
    { x: 26, y: 25, state: 1 },
    { x: 26, y: 26, state: 1 },
  ],

  // Patrón aleatorio
  random: Array.from({ length: 150 }, () => ({
    x: Math.floor(Math.random() * 50),
    y: Math.floor(Math.random() * 50),
    state: Math.random() > 0.7 ? 1 : 0,
  })).filter((c) => c.state === 1),
}

/**
 * Hook para crear simulaciones de demostración
 * 
 * @example
 * const { createDemoSimulation, isCreating } = useDemoSimulation()
 * const sim = await createDemoSimulation('glider')
 */
export const useDemoSimulation = (): UseDemoSimulationReturn => {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createDemoSimulation = useCallback(
    async (pattern: 'blinker' | 'glider' | 'random' = 'blinker') => {
      try {
        setIsCreating(true)
        setError(null)

        const simulation = await simulationService.createSimulation({
          name: `Demo - Conway's Game of Life (${pattern})`,
          description: `Demostración del autómata celular de Conway con patrón ${pattern}`,
          grid_config: {
            width: 50,
            height: 50,
            neighborhood_type: 'moore' as NeighborhoodType,
            boundary_mode: 'fixed' as BoundaryMode,
            geospatial_bounds: {
              lat_min: 3.25,
              lat_max: 3.55,
              lon_min: -76.2,
              lon_max: -75.9,
            },
          },
          rule: {
            rule_type: 'conway' as RuleFormat,
            birth: [3],
            survival: [2, 3],
          },
          initial_cells: INITIAL_PATTERNS[pattern],
        })

        return simulation
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create demo simulation'
        setError(errorMessage)
        console.error('Error creating demo simulation:', err)
        return null
      } finally {
        setIsCreating(false)
      }
    },
    []
  )

  return {
    isCreating,
    error,
    createDemoSimulation,
  }
}
