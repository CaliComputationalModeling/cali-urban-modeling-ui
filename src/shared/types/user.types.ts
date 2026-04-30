export enum UserRole {
  ADMIN = 1,          // Administrador del sistema
  COORDINATOR = 2,    // Coordinador técnico
  TECHNICIAN = 3,     // Equipo técnico
  FOUNDATION_HEAD = 4, // Jefe de fundación
  FIELD_WORKER = 5,   // Trabajador de campo
}

export interface User {
  id: number
  nombre_completo: string
  email: string
  rol_id: UserRole
  activo?: boolean
}

export interface CreateUserPayload {
  email: string
  password: string
  nombre_completo: string
  rol_id: number
}
