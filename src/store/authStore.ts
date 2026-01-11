import { create } from "zustand"
import type { User } from "@/shared/types/user.types"

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (email: string, password: string) => {
    // Mock authentication - replace with real API call
    console.log("Login attempt:", { email, password })

    // Simulated successful login
    const mockUser: User = {
      id: "1",
      name: "Usuario Demo",
      email,
      role: "admin" as any,
      status: "active" as any,
    }

    set({ user: mockUser, isAuthenticated: true })
  },
  logout: () => {
    set({ user: null, isAuthenticated: false })
  },
}))
