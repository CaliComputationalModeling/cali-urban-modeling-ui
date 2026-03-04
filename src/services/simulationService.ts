import { simulationEndpoints } from "./endpoints/simulation.endpoints"
import { useSimulationStore } from "@/store/simulationStore"

export const simulationService = {
  async fetchCells() {
    try {
      const cells = await simulationEndpoints.getAll()
      // store as the current simulation representation
      useSimulationStore.getState().setCurrentSimulation({ id: "default", cells } as any)
      return cells
    } catch (err) {
      console.error("fetchCells", err)
      throw err
    }
  },

  async runStep() {
    try {
      const updated = await simulationEndpoints.run?.() // if run exists
      if (!updated) {
        // call the run endpoint explicitly
        const baseUrl = (import.meta as any).env.VITE_API_URL || "http://localhost:3000/api"
        const res = await fetch(`${baseUrl}/simulations/run`, { method: "POST" })
        const data = await res.json()
        useSimulationStore.getState().setCurrentSimulation({ id: "default", cells: data } as any)
        return data
      }
      useSimulationStore.getState().setCurrentSimulation({ id: "default", cells: updated } as any)
      return updated
    } catch (err) {
      console.error("runStep", err)
      throw err
    }
  },

  async setCells(cells: any[]) {
    const base = (import.meta as any).env.VITE_API_URL || "http://localhost:3000/api"
    const res = await fetch(`${base}/simulations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cells),
    })
    const data = await res.json()
    useSimulationStore.getState().setCurrentSimulation({ id: "default", cells: data } as any)
    return data
  },
}
