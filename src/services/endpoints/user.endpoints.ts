import { http } from "../http";
import type { User, CreateUserPayload } from "@/shared/types/user.types";

export const userEndpoints = {
  getAll: () =>
    http.get<User[]>("/users"),
  getById: (id: number) =>
    http.get<User>(`/users/${id}`),
  create: (data: CreateUserPayload) =>
    http.post<User>("/auth/register", data),
  update: (id: number, data: Partial<CreateUserPayload>) =>
    http.patch<User>(`/users/${id}`, data),
  delete: (id: number) =>
    http.delete(`/users/${id}`),
  toggleStatus: (id: number) =>
    http.patch(`/users/${id}/toggle-status`, {}),
};
