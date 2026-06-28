import { http } from '../http'
import type { LoginCredentials, LoginResponse } from '@/shared/types/auth.types'
import type { User } from '@/shared/types/user.types'

export const authEndpoints = {
  login: (credentials: LoginCredentials) => http.post<LoginResponse>('/auth/login', credentials),
  logout: () => http.post('/auth/logout'),
  me: () => http.get<User>('/auth/me'),
}
