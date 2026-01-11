import { apiClient } from "../apiClient"
import type { Simulation } from "@/shared/types/simulation.types"

export const simulationEndpoints = {
  getAll: () => apiClient.get<Simulation[]>("/simulations"),
  getById: (id: string) => apiClient.get<Simulation>(`/simulations/${id}`),
  create: (simulation: Partial<Simulation>) => apiClient.post<Simulation>("/simulations", simulation),
  update: (id: string, simulation: Partial<Simulation>) => apiClient.put<Simulation>(`/simulations/${id}`, simulation),
  delete: (id: string) => apiClient.delete(`/simulations/${id}`),
}
