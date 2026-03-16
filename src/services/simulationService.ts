import { simulationEndpoints, type SimulationCreateRequest } from "./endpoints/simulation.endpoints"
import { useSimulationStore } from "@/store/simulationStore"
import type { Simulation } from "@/shared/types/simulation.types"

/**
 * Configuración por defecto para crear una simulación de prueba
 */
const DEFAULT_SIMULATION_CONFIG: SimulationCreateRequest = {
  name: "Simulación Urbana de Cali",
  description: "Autómata celular para modelado urbano computacional",
  grid_config: {
    width: 50,
    height: 50,
    neighborhood_type: "moore",
  },
  rule: {
    rule_type: "conway",
    birth: [3],
    survival: [2, 3],
  },
  initial_cells: [
    { x: 25, y: 24, state: 1 },
    { x: 25, y: 25, state: 1 },
    { x: 25, y: 26, state: 1 },
  ],
}

export const simulationService = {
  /**
   * Obtiene todas las simulaciones disponibles
   */
  async listSimulations() {
    try {
      const response = await simulationEndpoints.getAll(10, 0)
      return response
    } catch (err) {
      console.error("listSimulations", err)
      throw err
    }
  },

  /**
   * Obtiene una simulación por ID
   */
  async getSimulation(id: string) {
    try {
      const simulation = await simulationEndpoints.getById(id)
      useSimulationStore.getState().setCurrentSimulation({
        id: simulation.simulation_id,
        name: simulation.name,
        cells: simulation.cells,
        currentIteration: simulation.grid.generation,
        totalIterations: simulation.grid.generation + 50,
      } as any)
      return simulation
    } catch (err) {
      console.error("getSimulation", err)
      throw err
    }
  },

  /**
   * Crea una nueva simulación con la configuración especificada
   */
  async createSimulation(config: Partial<SimulationCreateRequest> = {}) {
    try {
      const simulationConfig = { ...DEFAULT_SIMULATION_CONFIG, ...config }
      const response = await simulationEndpoints.create(simulationConfig)

      // Actualizar el store con la simulación creada
      const simulation: Simulation = {
        id: response.simulation_id,
        name: response.name,
        cells: response.cells,
        currentIteration: response.grid.generation,
        totalIterations: 100,
        version: "1.0",
        date: new Date().toISOString(),
        status: "ready" as any,
        config: {
          gridConfig: {
            width: response.grid.width,
            height: response.grid.height,
            cellSize: "1x1m",
          },
          iterations: 100,
          parameters: {
            climate: 0.5,
            security: 0.5,
            services: 0.5,
            mobility: 0.5,
          },
        },
      }

      useSimulationStore.getState().setCurrentSimulation(simulation)
      useSimulationStore.getState().addLog(`Simulación creada: ${response.name}`, "success")
      return response
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al crear simulación"
      useSimulationStore.getState().addLog(message, "error")
      throw err
    }
  },

  /**
   * Ejecuta un paso (generación) de la simulación
   */
  async runStep(simulationId: string, generations: number = 1) {
    try {
      const response = await simulationEndpoints.runStep(simulationId, generations)

      const state = useSimulationStore.getState()
      const updated: Simulation = {
        ...(state.currentSimulation || ({} as any)),
        cells: response.cells,
        currentIteration: response.grid.generation,
      }

      useSimulationStore.getState().setCurrentSimulation(updated)
      useSimulationStore
        .getState()
        .addLog(
          `${generations} generación(es) ejecutada(s) - Celdas vivas: ${response.grid.alive_cells}`,
          "success"
        )
      return response
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al ejecutar paso"
      useSimulationStore.getState().addLog(message, "error")
      throw err
    }
  },

  /**
   * Obtiene estadísticas de la simulación actual
   */
  async getStatistics(simulationId: string) {
    try {
      const stats = await simulationEndpoints.getStatistics(simulationId)
      return stats
    } catch (err) {
      console.error("getStatistics", err)
      throw err
    }
  },

  /**
   * Reinicia la simulación al estado inicial
   */
  async reset(simulationId: string) {
    try {
      const response = await simulationEndpoints.reset(simulationId)
      const simulation: Simulation = {
        id: response.simulation_id,
        name: response.name,
        cells: response.cells,
        currentIteration: response.grid.generation,
        totalIterations: 100,
        version: "1.0",
        date: new Date().toISOString(),
        status: "ready" as any,
        config: {
          gridConfig: {
            width: response.grid.width,
            height: response.grid.height,
            cellSize: "1x1m",
          },
          iterations: 100,
          parameters: {
            climate: 0.5,
            security: 0.5,
            services: 0.5,
            mobility: 0.5,
          },
        },
      }

      useSimulationStore.getState().setCurrentSimulation(simulation)
      useSimulationStore.getState().addLog("Simulación reiniciada", "success")
      return response
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al reiniciar"
      useSimulationStore.getState().addLog(message, "error")
      throw err
    }
  },

  /**
   * Obtiene celdas (deprecated - usar getSimulation en su lugar)
   */
  async fetchCells() {
    try {
      const response = await simulationEndpoints.getAll(1, 0)
      if (response.items && response.items.length > 0) {
        const sim = response.items[0]
        await this.getSimulation(sim.id)
        return sim.cells || []
      }
      return []
    } catch (err) {
      console.error("fetchCells", err)
      throw err
    }
  },

  /**
   * Configura celdas (deprecated - usar createSimulation en su lugar)
   */
  async setCells(cells: any[]) {
    try {
      const config = { ...DEFAULT_SIMULATION_CONFIG, initial_cells: cells }
      return await this.createSimulation(config)
    } catch (err) {
      console.error("setCells", err)
      throw err
    }
  },
}
