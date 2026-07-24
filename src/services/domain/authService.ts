/**
 * Authentication Service
 * 
 * Maneja:
 * - Login / Logout
 * - Registro de usuarios
 * - Refresh de tokens
 * - Validación de sesión
 * 
 * Sigue principios de Clean Code:
 * - Single Responsibility (solo auth)
 * - Type-safe con DTOs
 * - Error handling consistente
 */

import { getHttpClient } from '@/services/http/index'

export interface LoginRequestDTO {
  email: string
  password: string
}

export interface LoginResponseDTO {
  message: string
  rol: number
  access_token?: string
  token_type?: string
}

export interface RegisterRequestDTO {
  email: string
  password: string
  nombre_completo: string
  rol_id?: number
}

export interface RegisterResponseDTO {
  message: string
}

export interface UserDTO {
  id: number
  email: string
  nombre_completo: string
  rol_id: number
  created_at: string
}

class AuthServiceImpl {
  private readonly API_PREFIX = '/auth'
  private readonly TOKEN_KEY = 'auth_token'
  private readonly REFRESH_TOKEN_KEY = 'refresh_token'

  /**
   * Login con credenciales
   */
  async login(credentials: LoginRequestDTO): Promise<LoginResponseDTO> {
    const client = getHttpClient()

    const response = await client.post<LoginResponseDTO>(
      `${this.API_PREFIX}/login`,
      credentials,
      { skipAuth: true } // No requiere autenticación previo
    )

    const data = response.data

    // Extraer token de la respuesta o de headers (depende del backend)
    const token = (data as any).access_token || response.headers['authorization']?.replace('Bearer ', '')

    if (token) {
      this.setToken(token)
    }

    return data
  }

  /**
   * Registro de nuevo usuario
   */
  async register(userData: RegisterRequestDTO): Promise<RegisterResponseDTO> {
    const client = getHttpClient()

    const response = await client.post<RegisterResponseDTO>(
      `${this.API_PREFIX}/register`,
      userData,
      { skipAuth: true }
    )

    return response.data
  }

  /**
   * Logout - limpia tokens locales
   */
  async logout(): Promise<void> {
    const client = getHttpClient()

    try {
      await client.post(`${this.API_PREFIX}/logout`)
    } finally {
      // Limpiar tokens incluso si request falla
      this.clearTokens()
    }
  }

  /**
   * Valida si hay sesión activa
   */
  isAuthenticated(): boolean {
    return !!this.getToken()
  }

  /**
   * Obtiene el token actual
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY) || sessionStorage.getItem(this.TOKEN_KEY)
  }

  /**
   * Establece el token de autenticación
   */
  setToken(token: string, persistent: boolean = true): void {
    if (persistent) {
      localStorage.setItem(this.TOKEN_KEY, token)
      sessionStorage.removeItem(this.TOKEN_KEY)
    } else {
      sessionStorage.setItem(this.TOKEN_KEY, token)
      localStorage.removeItem(this.TOKEN_KEY)
    }
  }

  /**
   * Limpia todos los tokens
   */
  clearTokens(): void {
    localStorage.removeItem(this.TOKEN_KEY)
    localStorage.removeItem(this.REFRESH_TOKEN_KEY)
    sessionStorage.removeItem(this.TOKEN_KEY)
    sessionStorage.removeItem(this.REFRESH_TOKEN_KEY)
  }

  /**
   * Decodifica el JWT sin verificación (solo para lectura de claims)
   * En producción, la verificación debe hacerse en el backend
   */
  decodeToken(token?: string): any {
    try {
      const jwt = token || this.getToken()
      if (!jwt) return null

      const parts = jwt.split('.')
      if (parts.length !== 3) return null

      const decoded = JSON.parse(atob(parts[1]))
      return decoded
    } catch {
      return null
    }
  }

  /**
   * Obtiene el usuario actual del token (sin verificación - solo lectura)
   */
  getCurrentUser(): Partial<UserDTO> | null {
    const decoded = this.decodeToken()
    if (!decoded) return null

    return {
      email: decoded.sub || decoded.email,
      id: decoded.id,
      rol_id: decoded.role,
    }
  }
}

// Singleton instance
export const authService = new AuthServiceImpl()
