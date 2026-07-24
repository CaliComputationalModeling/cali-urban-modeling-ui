<<<<<<< HEAD
import { create } from 'zustand'
import http from '@/services/http'
import type { User } from '@/shared/types/user.types'
import type { LoginCredentials, LoginResponse } from '@/shared/types/auth.types'
=======
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
>>>>>>> 44fa15ef18c7ea319939bfa768140030a1bfe210

import { create } from 'zustand'
import { authService, type LoginRequestDTO, type RegisterRequestDTO, type UserDTO } from '@/services/domain'

export interface AuthState {
  // Estado
  user: Partial<UserDTO> | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

<<<<<<< HEAD
  initialize: () => Promise<void>
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  clearSession: () => void
  clearError: () => void
}

function extractErrorMessage(data: unknown): string {
  if (data && typeof data === 'object' && 'detail' in data) {
    return String((data as { detail: unknown }).detail)
  }
  if (data && typeof data === 'object' && 'message' in data) {
    return String((data as { message: unknown }).message)
  }
  return 'Error inesperado del servidor'
}

export const useAuthStore = create<AuthState>((set, get) => ({
=======
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
>>>>>>> 44fa15ef18c7ea319939bfa768140030a1bfe210
  user: null,
  token: null,
  isAuthenticated: false,
<<<<<<< HEAD
  isLoading: true,
  error: null,

  initialize: async () => {
    http.onUnauthorized(() => get().clearSession())

    const response = await http.get<User>('/auth/me')
    if (response.ok) {
      set({
        user: response.data,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    } else {
      get().clearSession()
    }
  },

  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true, error: null })

    const response = await http.post<LoginResponse>('/auth/login', credentials)
    if (!response.ok) {
      set({
        isLoading: false,
        error: extractErrorMessage(response.data),
      })
      return
    }

    const userResponse = await http.get<User>('/auth/me')
    if (!userResponse.ok) {
      get().clearSession()
      set({
        isLoading: false,
        error: 'No se pudo obtener la información del usuario',
      })
      return
    }

    set({
      user: userResponse.data,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    })
  },

  logout: async () => {
    await http.post('/auth/logout')
    get().clearSession()
=======
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
>>>>>>> 44fa15ef18c7ea319939bfa768140030a1bfe210
  },

  clearSession: () => {
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
  },

  clearError: () => set({ error: null }),
}))
