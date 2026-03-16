/**
 * User Service
 * 
 * Maneja operaciones relacionadas con usuarios:
 * - Obtener perfil
 * - Actualizar perfil
 * - Listar usuarios (admin)
 * - Eliminar usuario (admin)
 */

import { http } from '../http'

export interface UserProfileDTO {
  id: number
  email: string
  nombre_completo: string
  rol_id: number
  created_at: string
  updated_at: string
}

export interface UpdateUserProfileDTO {
  nombre_completo?: string
  email?: string
}

export interface PaginatedUsersDTO {
  items: UserProfileDTO[]
  total: number
  limit: number
  offset: number
}

class UserServiceImpl {
  private readonly API_PREFIX = '/users'

  /**
   * Obtiene el perfil del usuario actual
   */
  async getProfile(): Promise<UserProfileDTO> {
    const response = await http.get<UserProfileDTO>(`${this.API_PREFIX}/me`)
    return response.data
  }

  /**
   * Actualiza el perfil del usuario actual
   */
  async updateProfile(data: UpdateUserProfileDTO): Promise<UserProfileDTO> {
    const response = await http.put<UserProfileDTO>(`${this.API_PREFIX}/me`, data)
    return response.data
  }

  /**
   * Lista todos los usuarios (requiere rol admin)
   */
  async listUsers(limit: number = 10, offset: number = 0): Promise<PaginatedUsersDTO> {
    const response = await http.get<PaginatedUsersDTO>(this.API_PREFIX, {
      params: { limit: String(limit), offset: String(offset) }
    })
    return response.data
  }

  /**
   * Obtiene un usuario específico por ID (requiere rol admin)
   */
  async getUserById(userId: number): Promise<UserProfileDTO> {
    const response = await http.get<UserProfileDTO>(`${this.API_PREFIX}/${userId}`)
    return response.data
  }

  /**
   * Elimina un usuario (requiere rol admin)
   */
  async deleteUser(userId: number): Promise<void> {
    await http.delete(`${this.API_PREFIX}/${userId}`)
  }
}

export const userService = new UserServiceImpl()
