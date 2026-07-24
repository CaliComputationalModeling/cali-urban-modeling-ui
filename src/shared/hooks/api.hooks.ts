/**
 * Custom Hooks para API Integration
 * 
 * Facilitan el uso de servicios y stores en componentes React
 * Sigue el patrón de React Hooks
 */

import { useCallback } from 'react'
import { useSimulationStore } from '@/store/simulationStore'
import { useAuthStore } from '@/store/authStore'
import type { SimulationCreateRequestDTO } from '@/shared/types/api.dtos'

/**
 * Hook para operaciones de simulación
 */
export const useSimulation = () => {
  const {
    currentSimulation,
    simulations,
    isLoading,
    isRunning,
    error,
    logs,
    loadSimulation,
    loadSimulations,
    createSimulation,
    runSimulation,
    resetSimulation,
    deleteSimulation,
    clearError,
    clearLogs,
  } = useSimulationStore()

  const handleLoadSimulation = useCallback(
    async (id: string) => {
      try {
        await loadSimulation(id)
      } catch (err) {
        console.error('Failed to load simulation:', err)
      }
    },
    [loadSimulation]
  )

  const handleLoadSimulations = useCallback(
    async (limit?: number, offset?: number) => {
      try {
        await loadSimulations(limit, offset)
      } catch (err) {
        console.error('Failed to load simulations:', err)
      }
    },
    [loadSimulations]
  )

  const handleCreateSimulation = useCallback(
    async (config: SimulationCreateRequestDTO) => {
      try {
        return await createSimulation(config)
      } catch (err) {
        console.error('Failed to create simulation:', err)
        throw err
      }
    },
    [createSimulation]
  )

  const handleRunSimulation = useCallback(
    async (generations: number) => {
      try {
        await runSimulation(generations)
      } catch (err) {
        console.error('Failed to run simulation:', err)
      }
    },
    [runSimulation]
  )

  const handleResetSimulation = useCallback(
    async () => {
      try {
        await resetSimulation()
      } catch (err) {
        console.error('Failed to reset simulation:', err)
      }
    },
    [resetSimulation]
  )

  const handleDeleteSimulation = useCallback(
    async (id: string) => {
      try {
        await deleteSimulation(id)
      } catch (err) {
        console.error('Failed to delete simulation:', err)
      }
    },
    [deleteSimulation]
  )

  return {
    // Estado
    currentSimulation,
    simulations,
    isLoading,
    isRunning,
    error,
    logs,

    // Acciones
    loadSimulation: handleLoadSimulation,
    loadSimulations: handleLoadSimulations,
    createSimulation: handleCreateSimulation,
    runSimulation: handleRunSimulation,
    resetSimulation: handleResetSimulation,
    deleteSimulation: handleDeleteSimulation,
    clearError,
    clearLogs,
  }
}

/**
 * Hook para operaciones de autenticación
 */
export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    token,
    login,
    logout,
    register,
    clearError,
    setUser,
    setToken,
    restoreSession,
  } = useAuthStore()

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      try {
        await login({ email, password })
      } catch (err) {
        console.error('Login failed:', err)
        throw err
      }
    },
    [login]
  )

  const handleLogout = useCallback(
    async () => {
      try {
        await logout()
      } catch (err) {
        console.error('Logout failed:', err)
      }
    },
    [logout]
  )

  const handleRegister = useCallback(
    async (email: string, password: string, nombre_completo: string) => {
      try {
        await register({ email, password, nombre_completo })
      } catch (err) {
        console.error('Registration failed:', err)
        throw err
      }
    },
    [register]
  )

  return {
    // Estado
    user,
    isAuthenticated,
    isLoading,
    error,
    token,

    // Acciones
    login: handleLogin,
    logout: handleLogout,
    register: handleRegister,
    clearError,
    setUser,
    setToken,
    restoreSession,
  }
}
