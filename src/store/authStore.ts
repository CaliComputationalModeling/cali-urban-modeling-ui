import { create } from 'zustand'
import http, { AUTH_TOKEN_KEY } from '@/services/http'
import type { User } from '@/shared/types/user.types'
import type { LoginCredentials, LoginResponse } from '@/shared/types/auth.types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

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
  return 'Error inesperado del servidor'
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initialize: async () => {
    http.onUnauthorized(() => get().clearSession())

    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) {
      set({ isLoading: false })
      return
    }

    const response = await http.get<User>('/auth/me')
    if (response.ok) {
      set({
        user: response.data,
        isAuthenticated: true,
        isLoading: false,
      })
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      set({ isLoading: false })
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

    const { access_token } = response.data
    localStorage.setItem(AUTH_TOKEN_KEY, access_token)

    const userResponse = await http.get<User>('/auth/me')
    if (!userResponse.ok) {
      localStorage.removeItem(AUTH_TOKEN_KEY)
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
    })
  },

  logout: async () => {
    await http.post('/auth/logout')
    get().clearSession()
  },

  clearSession: () => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem('user_role')
    localStorage.removeItem('user_id')
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
  },

  clearError: () => set({ error: null }),
}))
