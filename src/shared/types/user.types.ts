export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
}

export enum UserRole {
  ADMIN = "admin",
  TECHNICIAN = "technician",
  FIELD_WORKER = "field_worker",
  VIEWER = "viewer",
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}
