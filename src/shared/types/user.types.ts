export enum UserRole {
  ADMIN = 1,              // Administrador del sistema
  ANALYST = 2,            // Analista Técnico
  FIELD_WORKER = 3,       // Trabajador de campo
  COORDINATOR = 4,        // Coordinador técnico
  TECHNICIAN = 5,         // Equipo técnico
  FOUNDATION_HEAD = 6,    // Jefe de fundación
  AUXILIARY = 7,          // Auxiliar Técnico
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
