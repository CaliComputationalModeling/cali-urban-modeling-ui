import { create } from "zustand";
import type { User } from "@/shared/types/user.types";
import { apiClient } from "@/services/apiClient";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    try {
      const response = await apiClient.post<{ 
        user_id: number; 
        rol: number; 
        nombre?: string 
      }>('/auth/login', { email, password });

      const roles: Record<number, string> = {
        1: "Administrador del sistema",
        2: "Coordinador tecnico",
        3: "Equipo tecnico",
        4: "Jefe de fundacion",
        5: "Trabajador de campo"
      };

      const userData: User = {
        id: (response.user_id ?? 0).toString(),
        name: response.nombre || "Usuario",
        email: email,
        role: roles[response.rol] || "viewer",
        status: "active",
      };

      set({ user: userData, isAuthenticated: true });
    } catch (error) {
      console.error("Error en la autenticación:", error);
      throw error; 
    }
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      set({ user: null, isAuthenticated: false });
    }
  },
}));