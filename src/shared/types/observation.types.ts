export interface Observation {
  id: string
  type: ObservationType
  description: string
  photos: string[]
  location: Location
  date: string
  status: ObservationStatus
  userId: string
}

export enum ObservationType {
  CONCENTRATION = "concentration",
  MIGRATION = "migration",
  SERVICES = "services",
  INCIDENT = "incident",
}

export enum ObservationStatus {
  PENDING = "pending",
  VALIDATED = "validated",
  REJECTED = "rejected",
}

export interface Location {
  lat: number
  lng: number
}
