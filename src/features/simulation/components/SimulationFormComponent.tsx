/**
 * Ejemplo: Simulation Form Component
 * 
 * Demuestra cómo usar la API integrada en componentes React
 * Sigue Clean Code principles:
 * - Type-safe con TypeScript
 * - Error handling consistente
 * - Loading states
 * - Validación
 */

import { useState, useCallback } from 'react'
import { useSimulation } from '@/shared/hooks/api.hooks'
import type { SimulationCreateRequestDTO } from '@/shared/types/api.dtos'
import { NeighborhoodType, BoundaryMode, RuleFormat } from '@/shared/types/api.dtos'

interface SimulationFormData {
  name: string
  description: string
  gridWidth: number
  gridHeight: number
  neighborhoodType: NeighborhoodType
  boundaryMode: BoundaryMode
  ruleType: RuleFormat
  birth: string
  survival: string
}

const INITIAL_FORM_DATA: SimulationFormData = {
  name: '',
  description: '',
  gridWidth: 50,
  gridHeight: 50,
  neighborhoodType: NeighborhoodType.MOORE,
  boundaryMode: BoundaryMode.FIXED,
  ruleType: RuleFormat.CONWAY,
  birth: '3',
  survival: '2,3',
}

export function SimulationFormComponent() {
  const { createSimulation, isLoading, error, clearError } = useSimulation()
  const [formData, setFormData] = useState<SimulationFormData>(INITIAL_FORM_DATA)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  /**
   * Valida los datos del formulario
   */
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.name.trim()) {
      errors.name = 'El nombre es requerido'
    }

    if (formData.gridWidth < 10 || formData.gridWidth > 1000) {
      errors.gridWidth = 'El ancho debe estar entre 10 y 1000'
    }

    if (formData.gridHeight < 10 || formData.gridHeight > 1000) {
      errors.gridHeight = 'El alto debe estar entre 10 y 1000'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [formData])

  /**
   * Convierte strings de números a arrays
   */
  const parseNumberArray = (str: string): number[] => {
    return str
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n))
  }

  /**
   * Maneja el submit del formulario
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!validateForm()) {
        return
      }

      clearError()

      const request: SimulationCreateRequestDTO = {
        name: formData.name,
        description: formData.description || undefined,
        grid_config: {
          width: formData.gridWidth,
          height: formData.gridHeight,
          neighborhood_type: formData.neighborhoodType,
          boundary_mode: formData.boundaryMode,
        },
        rule: {
          rule_type: formData.ruleType,
          birth: parseNumberArray(formData.birth),
          survival: parseNumberArray(formData.survival),
        },
      }

      try {
        const simulation = await createSimulation(request)
        console.log('Simulación creada:', simulation)
        // Redirigir o actualizar UI
        setFormData(INITIAL_FORM_DATA)
      } catch (err) {
        console.error('Error creating simulation:', err)
      }
    },
    [formData, validateForm, createSimulation, clearError]
  )

  /**
   * Maneja cambios en inputs
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }))

    // Limpiar error del campo si existe
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }, [validationErrors])

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Nombre de Simulación *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          disabled={isLoading}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        {validationErrors.name && (
          <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          Descripción
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          disabled={isLoading}
          rows={3}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="gridWidth" className="block text-sm font-medium">
            Ancho de Grilla
          </label>
          <input
            type="number"
            id="gridWidth"
            name="gridWidth"
            min="10"
            max="1000"
            value={formData.gridWidth}
            onChange={handleChange}
            disabled={isLoading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          {validationErrors.gridWidth && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.gridWidth}</p>
          )}
        </div>

        <div>
          <label htmlFor="gridHeight" className="block text-sm font-medium">
            Alto de Grilla
          </label>
          <input
            type="number"
            id="gridHeight"
            name="gridHeight"
            min="10"
            max="1000"
            value={formData.gridHeight}
            onChange={handleChange}
            disabled={isLoading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          {validationErrors.gridHeight && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.gridHeight}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="neighborhoodType" className="block text-sm font-medium">
            Tipo de Vecindario
          </label>
          <select
            id="neighborhoodType"
            name="neighborhoodType"
            value={formData.neighborhoodType}
            onChange={handleChange}
            disabled={isLoading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value={NeighborhoodType.MOORE}>Moore</option>
            <option value={NeighborhoodType.VON_NEUMANN}>Von Neumann</option>
            <option value={NeighborhoodType.EXTENDED_MOORE}>Extended Moore</option>
          </select>
        </div>

        <div>
          <label htmlFor="boundaryMode" className="block text-sm font-medium">
            Modo de Borde
          </label>
          <select
            id="boundaryMode"
            name="boundaryMode"
            value={formData.boundaryMode}
            onChange={handleChange}
            disabled={isLoading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value={BoundaryMode.FIXED}>Fixed</option>
            <option value={BoundaryMode.PERIODIC}>Periodic</option>
            <option value={BoundaryMode.REFLECT}>Reflect</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="ruleType" className="block text-sm font-medium">
            Tipo de Regla
          </label>
          <select
            id="ruleType"
            name="ruleType"
            value={formData.ruleType}
            onChange={handleChange}
            disabled={isLoading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value={RuleFormat.CONWAY}>Conway</option>
            <option value={RuleFormat.WOLFRAM}>Wolfram</option>
            <option value={RuleFormat.CUSTOM}>Custom</option>
          </select>
        </div>

        <div>
          <label htmlFor="birth" className="block text-sm font-medium">
            Birth (números separados por coma)
          </label>
          <input
            type="text"
            id="birth"
            name="birth"
            value={formData.birth}
            onChange={handleChange}
            disabled={isLoading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label htmlFor="survival" className="block text-sm font-medium">
            Survival (números separados por coma)
          </label>
          <input
            type="text"
            id="survival"
            name="survival"
            value={formData.survival}
            onChange={handleChange}
            disabled={isLoading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded transition-colors"
      >
        {isLoading ? 'Creando simulación...' : 'Crear Simulación'}
      </button>
    </form>
  )
}
