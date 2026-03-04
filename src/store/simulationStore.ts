import { create } from "zustand"
import type { Simulation, SimulationStatus, Cell, SimulationLog } from "@/shared/types/simulation.types"
import { simulationService } from "@/services/simulationService"

interface SimulationState {
  // Estado
  currentSimulation: Simulation | null
  simulations: Simulation[]
  isRunning: boolean
  currentIteration: number
  totalIterations: number
  logs: SimulationLog[]
  error: string | null
  isLoading: boolean
  
  // Acciones
  setCurrentSimulation: (simulation: Simulation) => void
  fetchCells: () => Promise<void>
  runStep: () => Promise<void>
  startSimulation: (simulation: Simulation) => void
  stopSimulation: () => void
  updateProgress: (current: number, total: number) => void
  addLog: (message: string, level?: 'info' | 'warning' | 'error' | 'success') => void
  clearLogs: () => void
  setError: (error: string | null) => void
  setCells: (cells: Cell[]) => Promise<void>
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  // Estado inicial
  currentSimulation: null,
  simulations: [],
  isRunning: false,
  currentIteration: 0,
  totalIterations: 100,
  logs: [],
  error: null,
  isLoading: false,

  // Acciones
  setCurrentSimulation: (simulation) => set({ currentSimulation: simulation }),
  
  fetchCells: async () => {
    set({ isLoading: true, error: null })
    try {
      const cells = await simulationService.fetchCells()
      get().addLog(`Celdas cargadas: ${cells.length} elementos`, 'success')
      set({ isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar celdas'
      get().addLog(message, 'error')
      set({ error: message, isLoading: false })
    }
  },

  runStep: async () => {
    const state = get()
    set({ isRunning: true, error: null })
    try {
      const updatedCells = await simulationService.runStep()
      const newIteration = state.currentIteration + 1
      set({ currentIteration: newIteration })
      get().addLog(`Paso ${newIteration} completado - Celdas: ${updatedCells?.length || 0}`, 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al ejecutar paso'
      get().addLog(message, 'error')
      set({ error: message })
    } finally {
      set({ isRunning: false })
    }
  },

  startSimulation: (simulation) => {
    set({ currentSimulation: simulation, isRunning: true, currentIteration: 0, logs: [] })
    get().addLog('Simulación iniciada', 'info')
  },

  stopSimulation: () => {
    set({ isRunning: false })
    get().addLog('Simulación detenida', 'info')
  },

  updateProgress: (current, total) => {
    set({ currentIteration: current, totalIterations: total })
  },

  addLog: (message, level = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    const log: SimulationLog = {
      timestamp,
      level,
      message,
    }
    set((state) => ({ logs: [...state.logs, log].slice(-100) })) // Mantener últimos 100 logs
  },

  clearLogs: () => set({ logs: [] }),

  setError: (error) => set({ error }),

  setCells: async (cells) => {
    set({ isLoading: true, error: null })
    try {
      await simulationService.setCells(cells)
      get().addLog(`${cells.length} celdas establecidas`, 'success')
      set({ isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al establecer celdas'
      get().addLog(message, 'error')
      set({ error: message, isLoading: false })
    }
  },
}))
