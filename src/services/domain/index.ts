/**
 * Domain Services Index
 * 
 * Centraliza la exportación de todos los servicios de dominio
 * Facilita imports limpios en toda la aplicación
 */

export { simulationService } from './simulationService'
export type { UserProfileDTO } from './userService'
export { userService } from './userService'
export { authService } from './authService'
export type { LoginRequestDTO, LoginResponseDTO, RegisterRequestDTO, UserDTO } from './authService'
export { observationService } from './observationService'
export type { ObservationDTO, CreateObservationDTO } from './observationService'
