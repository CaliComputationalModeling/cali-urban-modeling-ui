import { http } from "../http";
import type { Observation, ObservationCreate } from "@/shared/types/observation.types";

export const observationEndpoints = {
  getAll: (params?: { 
    limit?: number; 
    offset?: number; 
    user_id?: number;
    bbox?: string; // format: "lonMin,latMin,lonMax,latMax"
  }) =>
    http.get<{ items: Observation[]; total: number }>("/observations", {
      params: params
        ? Object.fromEntries(
            Object.entries(params)
              .filter(([, v]) => v !== undefined && v !== null)
              .map(([k, v]) => [k, String(v)])
          )
        : undefined,
    }),
  getById: (id: number) =>
    http.get<Observation>(`/observations/${id}`),
  create: (data: ObservationCreate) =>
    http.post<Observation>("/observations", data),
  update: (id: string, data: Partial<ObservationCreate>) =>
    http.patch<Observation>(`/observations/${id}`, data),
  delete: (id: string) =>
    http.delete(`/observations/${id}`),
};
