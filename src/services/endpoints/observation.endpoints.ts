import { http } from "../http";
import type { Observation, ObservationCreate } from "@/shared/types/observation.types";

export const observationEndpoints = {
  getAll: (params?: { 
    usuario_id?: number;
  }) =>
    http.get<Observation[]>("/observations", {
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
    http.put<Observation>(`/observations/${id}`, data),
  delete: (id: string) =>
    http.delete(`/observations/${id}`),
};
