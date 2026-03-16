/**
 * Simulation Store - Zustand
 * 
 * Maneja el estado global de simulaciones:
 * - Simulación actual
 * - Lista de simulaciones
 * - Estado de ejecución
 * - Logs y errores
 * - Sincronización con API
 * 
 * Type-safe con DTOs de API
 */

import { create } from 'zustand'
import { simulationService } from '@/services/domain'
import type {
  SimulationResponseDTO,
  SimulationCreateRequestDTO,
  SimulationRunRequestDTO,
} from '@/shared/types/api.dtos'

export interface SimulationLog {
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'success'
  message: string
}

export interface SimulationState {
  // Estado
  currentSimulation: SimulationResponseDTO | null
  simulations: SimulationResponseDTO[]
  isRunning: boolean
  isLoading: boolean
  error: string | null
  logs: SimulationLog[]
  totalCount: number
  currentIteration: number
  totalIterations: number
  progress: number
  
  // Acciones
  loadSimulation: (id: string) => Promise<void>
  loadSimulations: (limit?: number, offset?: number) => Promise<void>
  createSimulation: (request: SimulationCreateRequestDTO) => Promise<SimulationResponseDTO>
  runSimulation: (generations: number) => Promise<void>
  runStep: (generations?: number) => Promise<void>
  resetSimulation: () => Promise<void>
  deleteSimulation: (id: string) => Promise<void>
  setCurrentSimulation: (simulation: SimulationResponseDTO | null) => void
  clearError: () => void
  clearLogs: () => void
  addLog: (message: string, level?: SimulationLog['level']) => void
  updateProgress: (current: number, total: number) => void
  fetchCells: () => Promise<void>
  startSimulation: () => void
  stopSimulation: () => void
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  // Estado inicial
  currentSimulation: null,
  simulations: [],
  isRunning: false,
  isLoading: false,
  error: null,
  logs: [],
  totalCount: 0,
  currentIteration: 0,
  totalIterations: 0,
  progress: 0,

  // Acciones
  loadSimulation: async (id) => {
    set({ isLoading: true, error: null })

    try {
      const simulation = await simulationService.getSimulation(id)
      set({ currentSimulation: simulation, isLoading: false })
      get().addLog(`Simulación cargada: ${simulation.name}`, 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error loading simulation'
      set({ error: message, isLoading: false })
      get().addLog(message, 'error')
      throw err
    }
  },

  loadSimulations: async (limit = 10, offset = 0) => {
    set({ isLoading: true, error: null })

    try {
      const result = await simulationService.listSimulations(limit, offset)
      set({
        simulations: result.items,
        totalCount: result.total,
        isLoading: false,
      })
      get().addLog(`${result.items.length} simulaciones cargadas`, 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error loading simulations'
      set({ error: message, isLoading: false })
      get().addLog(message, 'error')
      throw err
    }
  },

  createSimulation: async (request) => {
    set({ isLoading: true, error: null })

    try {
      const simulation = await simulationService.createSimulation(request)
      set((state) => ({
        simulations: [simulation, ...state.simulations],
        currentSimulation: simulation,
        isLoading: false,
      }))
      get().addLog(`Simulación creada: ${simulation.name}`, 'success')
      return simulation
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creating simulation'
      set({ error: message, isLoading: false })
      get().addLog(message, 'error')
      throw err
    }
  },

  runSimulation: async (generations) => {
    const current = get().currentSimulation
    if (!current) {
      throw new Error('No simulation selected')
    }

    set({ isRunning: true, error: null })

    try {
      const request: SimulationRunRequestDTO = { generations }
      const result = await simulationService.runSimulationStep(current.simulation_id, request)

      // Actualizar simulación actual con nuevos datos
      set((state) => ({
        currentSimulation: state.currentSimulation
          ? { ...state.currentSimulation, generation: result.generation }
          : null,
        isRunning: false,
      }))

      get().addLog(
        `Simulación ejecutada: Gen ${result.generation}, Células vivas: ${result.alive_cells}`,
        'success'
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error running simulation'
      set({ error: message, isRunning: false })
      get().addLog(message, 'error')
      throw err
    }
  },

  resetSimulation: async () => {
    const current = get().currentSimulation
    if (!current) {
      throw new Error('No simulation selected')
    }

    set({ isLoading: true, error: null })

    try {
      const simulation = await simulationService.resetSimulation(current.simulation_id)
      set({ currentSimulation: simulation, isLoading: false })
      get().addLog('Simulación reseteada', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error resetting simulation'
      set({ error: message, isLoading: false })
      get().addLog(message, 'error')
      throw err
    }
  },

  deleteSimulation: async (id) => {
    set({ isLoading: true, error: null })

    try {
      await simulationService.deleteSimulation(id)
      set((state) => ({
        simulations: state.simulations.filter((s) => s.simulation_id !== id),
        currentSimulation: state.currentSimulation?.simulation_id === id ? null : state.currentSimulation,
        isLoading: false,
      }))
      get().addLog('Simulación eliminada', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error deleting simulation'
      set({ error: message, isLoading: false })
      get().addLog(message, 'error')
      throw err
    }
  },

  setCurrentSimulation: (simulation) => set({ currentSimulation: simulation }),

  clearError: () => set({ error: null }),

  clearLogs: () => set({ logs: [] }),

  addLog: (message, level = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    const log: SimulationLog = { timestamp, level, message }
    set((state) => ({
      logs: [...state.logs, log].slice(-100),
    }))
  },

  updateProgress: (current, total) => {
    const progress = total > 0 ? (current / total) * 100 : 0
    set({ currentIteration: current, totalIterations: total, progress })
  },

  fetchCells: async () => {
    const current = get().currentSimulation
    if (!current) {
      throw new Error('No simulation selected')
    }

    set({ isLoading: true, error: null })

    try {
      const simulation = await simulationService.getSimulation(current.simulation_id)
      set({ currentSimulation: simulation, isLoading: false })
      get().addLog('Células cargadas', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching cells'
      set({ error: message, isLoading: false })
      get().addLog(message, 'error')
      throw err
    }
  },

  runStep: async (generations = 1) => {
    const current = get().currentSimulation
    if (!current) {
      throw new Error('No simulation selected')
    }

    set({ isRunning: true, error: null })

    try {
      const request: SimulationRunRequestDTO = { generations }
      const result = await simulationService.runSimulationStep(current.simulation_id, request)

      set((state) => ({
        currentSimulation: state.currentSimulation
          ? {
              ...state.currentSimulation,
              generation: result.generation,
              cells: result.cells,
            }
          : null,
        isRunning: false,
        currentIteration: result.generation,
      }))

      get().addLog(
        `Paso ejecutado: Gen ${result.generation}, Células vivas: ${result.alive_cells}`,
        'success'
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error executing step'
      set({ error: message, isRunning: false })
      get().addLog(message, 'error')
      throw err
    }
  },

  startSimulation: () => {
    set({ isRunning: true })
    get().addLog('Simulación iniciada', 'success')
  },

  stopSimulation: () => {
    set({ isRunning: false })
    get().addLog('Simulación detenida', 'info')
  },
}))

