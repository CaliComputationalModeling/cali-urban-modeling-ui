import { create } from "zustand"
import type { Simulation } from "@/core/types/simulation.types"

interface SimulationState {
  currentSimulation: Simulation | null
  simulations: Simulation[]
  isRunning: boolean
  progress: number
  setCurrentSimulation: (simulation: Simulation) => void
  startSimulation: (simulation: Simulation) => void
  stopSimulation: () => void
  updateProgress: (progress: number) => void
}

export const useSimulationStore = create<SimulationState>((set) => ({
  currentSimulation: null,
  simulations: [],
  isRunning: false,
  progress: 0,
  setCurrentSimulation: (simulation) => set({ currentSimulation: simulation }),
  startSimulation: (simulation) => set({ currentSimulation: simulation, isRunning: true, progress: 0 }),
  stopSimulation: () => set({ isRunning: false, progress: 0 }),
  updateProgress: (progress) => set({ progress }),
}))
