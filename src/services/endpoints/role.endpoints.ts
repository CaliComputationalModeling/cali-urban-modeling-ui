import { http } from '../http'

export interface Role {
  id: number
  nombre: string
  descripcion?: string | null
}

export interface RoleCreate {
  nombre: string
  descripcion?: string
}

export type RoleUpdate = Partial<RoleCreate>

export const roleEndpoints = {
  getAll: () => http.get<Role[]>('/roles/'),
  getById: (id: number) => http.get<Role>(`/roles/${id}`),
  create: (data: RoleCreate) => http.post<Role>('/roles/', data),
  update: (id: number, data: RoleUpdate) => http.put<Role>(`/roles/${id}`, data),
}
