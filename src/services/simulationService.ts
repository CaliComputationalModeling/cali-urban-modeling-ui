import { apiClient } from "./apiClient";

export interface CellCreate {
  x: number;
  y: number;
  state: number;
}

export interface SimulationPayload {
  name: string;
  description?: string;
  grid_config: {
    width: number;
    height: number;
    geospatial_bounds?: {
      lat_min: number;
      lat_max: number;
      lon_min: number;
      lon_max: number;
    };
    neighborhood_type?: string;
    boundary_mode?: string;
  };
  rule: {
    rule_type: string;
    birth?: number[];
    survival?: number[];
  };
  initial_cells?: CellCreate[];
}

export interface SimulationResponse {
  simulation_id: string;
  name: string;
  description?: string;
  created_at: string;
  generation: number;
  active: boolean;
  grid: any;
}

export const simulationService = {
  // Crea la simulación inicial en el backend
  createSimulation: async (payload: SimulationPayload): Promise<SimulationResponse> => {
    return await apiClient.post<SimulationResponse>("/simulations", payload);
  },
  
  // Ejecuta el autómata (N generaciones)
  runSimulationStep: async (simulationId: string, generations: number = 1) => {
    return await apiClient.post<any>(`/simulations/${simulationId}/run`, { generations });
  },

  // Obtiene el estado actualizado de la simulación
  getSimulation: async (simulationId: string) => {
    return await apiClient.get<any>(`/simulations/${simulationId}`);
  },

  // =================================================================
  // Métodos de compatibilidad para el Store (Zustand)
  // =================================================================

  // Obtiene las celdas iniciales al cargar la página
  fetchCells: async (): Promise<any[]> => {
    // Como la carga real la hacemos enviando el payload en DataLoadPage,
    // aquí simplemente devolvemos un array vacío para inicializar la UI sin errores.
    // A futuro, podría hacer un GET a un catálogo de configuraciones predeterminadas.
    return [];
  },

  // Permite establecer/sobrescribir celdas directamente (Ej: desde un editor manual)
  setCells: async (cells: any[]): Promise<any[]> => {
    // A futuro, esto podría apuntar a un endpoint como PUT /simulations/{id}/cells
    // Por ahora, simulamos una respuesta exitosa para que Zustand actualice el estado local.
    return Promise.resolve(cells);
  }
};