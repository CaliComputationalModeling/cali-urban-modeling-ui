/**
 * Ejemplo: Simulations List Component
 * 
 * Demuestra:
 * - Paginación
 * - Loading states
 * - Error handling
 * - Lista actualizada desde API
 */

import { useEffect, useState, useCallback } from 'react'
import { useSimulation } from '@/shared/hooks/api.hooks'

const ITEMS_PER_PAGE = 10

export function SimulationsListComponent() {
  const {
    simulations,
    isLoading,
    error,
    loadSimulations,
    deleteSimulation,
    clearError,
  } = useSimulation()

  const [currentPage, setCurrentPage] = useState(1)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  /**
   * Cargar simulaciones en mount y cuando cambia la página
   */
  useEffect(() => {
    const offset = (currentPage - 1) * ITEMS_PER_PAGE
    loadSimulations(ITEMS_PER_PAGE, offset).catch((err) => {
      console.error('Failed to load simulations:', err)
    })
  }, [currentPage, loadSimulations])

  /**
   * Maneja eliminación de simulación
   */
  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('¿Estás seguro de que deseas eliminar esta simulación?')) {
        return
      }

      setDeleteLoading(id)
      setDeleteError(null)

      try {
        await deleteSimulation(id)
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : 'Error al eliminar')
      } finally {
        setDeleteLoading(null)
      }
    },
    [deleteSimulation]
  )

  if (isLoading && simulations.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando simulaciones...</p>
        </div>
      </div>
    )
  }

  if (error || deleteError) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        <p className="font-semibold">Error</p>
        <p>{error || deleteError}</p>
        <button
          onClick={() => {
            clearError()
            setDeleteError(null)
          }}
          className="mt-2 text-sm underline hover:no-underline"
        >
          Descartar
        </button>
      </div>
    )
  }

  if (simulations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No hay simulaciones disponibles</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tabla de simulaciones */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-4 py-2 text-left">Nombre</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Estado</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Generación</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Células Vivas</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Creado</th>
              <th className="border border-gray-300 px-4 py-2 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {simulations.map((simulation) => (
              <tr key={simulation.simulation_id} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 font-medium">
                  {simulation.name}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      simulation.status === 'ready'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {simulation.status}
                  </span>
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {simulation.generation}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {simulation.grid.alive_cells} / {simulation.grid.total_cells}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                  {new Date(simulation.created_at).toLocaleDateString()}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center space-x-2">
                  <button
                    onClick={() => {
                      // Navegar a detalles
                      console.log('Ver detalles de:', simulation.simulation_id)
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    Ver
                  </button>
                  <button
                    onClick={() => handleDelete(simulation.simulation_id)}
                    disabled={deleteLoading === simulation.simulation_id}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                  >
                    {deleteLoading === simulation.simulation_id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex justify-center gap-2 mt-6">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1 || isLoading}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 rounded transition-colors"
        >
          Anterior
        </button>
        <span className="px-4 py-2 text-gray-600">
          Página {currentPage}
        </span>
        <button
          onClick={() => setCurrentPage((p) => p + 1)}
          disabled={simulations.length < ITEMS_PER_PAGE || isLoading}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 rounded transition-colors"
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}
