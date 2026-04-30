import { http } from "../http";
import type { Observation, ObservationCreate } from "@/shared/types/observation.types";

export const observationEndpoints = {
  getAll: (limit = 20, offset = 0) =>
    http.get<{ items: Observation[]; total: number }>(`/observations?limit=${limit}&offset=${offset}`),
  getById: (id: number) =>
    http.get<Observation>(`/observations/${id}`),
  create: (data: ObservationCreate) =>
    http.post<Observation>("/observations", data),
  update: (id: number, data: Partial<ObservationCreate>) =>
    http.patch<Observation>(`/observations/${id}`, data),
  delete: (id: number) =>
    http.delete(`/observations/${id}`),
};
