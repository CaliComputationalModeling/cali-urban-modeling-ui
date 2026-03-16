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
  runStep: (generations?: number) => Promise<void> // <- Modificado para aceptar N generaciones
  startSimulation: (simulation?: Simulation) => void // <- Modificado para ser opcional
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
  totalIterations: 100, // Puedes ajustar esto según el límite de tu simulación
  logs: [],
  error: null,
  isLoading: false,

  // Acciones
  setCurrentSimulation: (simulation) => set({ currentSimulation: simulation }),
  
  fetchCells: async () => {
    set({ isLoading: true, error: null })
    try {
      // Nota: asumiendo que simulationService.fetchCells() existe para obtener datos iniciales masivos
      const cells = await simulationService.fetchCells()
      get().addLog(`Celdas cargadas: ${cells.length} elementos`, 'success')
      set({ isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar celdas'
      get().addLog(message, 'error')
      set({ error: message, isLoading: false })
    }
  },

  runStep: async (generations = 1) => {
    const state = get()
    const activeSimId = state.currentSimulation?.id

    if (!activeSimId) {
      get().addLog('Error: No hay una simulación cargada en el backend. Carga los datos primero.', 'error')
      return
    }

    set({ isLoading: true, error: null })
    
    try {
      // 1. Ejecutamos el cálculo en el backend
      await simulationService.runSimulationStep(activeSimId, generations)
      
      // 2. Traemos el nuevo estado de la grilla
      const updatedData = await simulationService.getSimulation(activeSimId)
      
      // 3. Formateamos las celdas para que coincidan con la interfaz Cell de React
      const formattedCells: Cell[] = updatedData.grid.cells.map((c: any) => ({
        position: { x: c.position.x, y: c.position.y },
        state: c.state
      }))

      // 4. Actualizamos el estado de Zustand
      set({ 
        currentIteration: updatedData.generation,
        currentSimulation: {
          ...state.currentSimulation!,
          cells: formattedCells,
          currentIteration: updatedData.generation
        }
      })
      
      get().addLog(`Generación ${updatedData.generation} calculada exitosamente`, 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al ejecutar paso'
      get().addLog(message, 'error')
      // Si falla, detenemos la ejecución automática
      set({ error: message, isRunning: false }) 
    } finally {
      set({ isLoading: false })
    }
  },

  startSimulation: (simulation) => {
    // Si se pasa una simulación, la seteamos. Si no, solo cambiamos isRunning a true para continuar.
    if (simulation) {
      set({ currentSimulation: simulation, isRunning: true, logs: [] })
    } else {
      set({ isRunning: true })
    }
    get().addLog('Simulación en marcha (Play)', 'info')
  },

  stopSimulation: () => {
    set({ isRunning: false })
    get().addLog('Simulación pausada', 'warning')
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
      // Nota: Asumiendo que esta función existe en tu service
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