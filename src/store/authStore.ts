import { create } from 'zustand'
import http from '@/services/http'
import type { User } from '@/shared/types/user.types'
import type { LoginCredentials, LoginResponse } from '@/shared/types/auth.types'

interface RegisterData {
  email: string
  password: string
  nombre_completo: string
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

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  token: string | null

  initialize: () => Promise<void>
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  register: (data: RegisterData) => Promise<void>
  clearSession: () => void
  clearError: () => void
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  restoreSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  token: null,

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
  },

  register: async (data: RegisterData) => {
    set({ isLoading: true, error: null })
    const response = await http.post('/auth/register', data)
    if (!response.ok) {
      set({ isLoading: false, error: extractErrorMessage(response.data) })
      return
    }
    set({ isLoading: false, error: null })
  },

  clearSession: () => {
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      token: null,
    })
  },

  clearError: () => set({ error: null }),

  setUser: (user: User | null) => set({ user, isAuthenticated: !!user }),

  setToken: (token: string | null) => set({ token }),

  restoreSession: async () => {
    await get().initialize()
  },
}))