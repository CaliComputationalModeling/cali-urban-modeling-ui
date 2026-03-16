/**
 * Auth Store - Zustand
 * 
 * Maneja:
 * - Estado de autenticación
 * - Token actual
 * - Usuario logueado
 * - Operaciones de login/logout
 * 
 * Type-safe con DTOs de API
 */

import { create } from 'zustand'
import { authService, type LoginRequestDTO, type RegisterRequestDTO, type UserDTO } from '@/services/domain'

export interface AuthState {
  // Estado
  user: Partial<UserDTO> | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Acciones
  login: (credentialsOrEmail: LoginRequestDTO | string, password?: string) => Promise<void>
  register: (userData: RegisterRequestDTO) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: Partial<UserDTO> | null) => void
  setToken: (token: string | null) => void
  clearError: () => void
  restoreSession: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  // Estado inicial
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Acciones
  login: async (credentialsOrEmail, password) => {
    set({ isLoading: true, error: null })

    try {
      // Soportar tanto login(dto) como login(email, password)
      const credentials: LoginRequestDTO = 
        typeof credentialsOrEmail === 'string'
          ? { email: credentialsOrEmail, password: password || '' }
          : credentialsOrEmail

      await authService.login(credentials)

      const user = authService.getCurrentUser()
      const token = authService.getToken()

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      set({
        error: message,
        isLoading: false,
        isAuthenticated: false,
      })
      throw err
    }
  },

  register: async (userData) => {
    set({ isLoading: true, error: null })

    try {
      await authService.register(userData)
      set({ isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      set({
        error: message,
        isLoading: false,
      })
      throw err
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null })

    try {
      await authService.logout()
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed'
      set({
        error: message,
        isLoading: false,
      })
      throw err
    }
  },

  setUser: (user) => set({ user }),

  setToken: (token) => {
    set({ token })
    if (token) {
      authService.setToken(token)
    } else {
      authService.clearTokens()
    }
  },

  clearError: () => set({ error: null }),

  /**
   * Intenta restaurar sesión desde token almacenado
   * Se debe llamar en App.tsx en useEffect
   */
  restoreSession: () => {
    const token = authService.getToken()
    const user = authService.getCurrentUser()

    if (token && user) {
      set({
        token,
        user,
        isAuthenticated: true,
      })
    }
  },
}))
