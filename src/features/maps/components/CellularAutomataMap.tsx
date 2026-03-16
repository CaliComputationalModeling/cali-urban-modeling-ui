"use client"

import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Play, Pause, RotateCcw } from 'lucide-react'
import type { SimulationResponseDTO } from '@/shared/types/api.dtos'

interface CellularAutomataMapProps {
  simulationId?: string
  onSimulationUpdate?: (data: SimulationResponseDTO) => void
  autoPlay?: boolean
  updateInterval?: number
}

// Configuración de colores para estados de células
const CELL_COLORS: Record<number, string> = {
  0: 'rgba(200, 200, 200, 0)', // Transparente
  1: 'rgba(255, 0, 0, 0.7)', // Rojo - Estado 1
  2: 'rgba(255, 255, 0, 0.7)', // Amarillo - Estado 2
  3: 'rgba(0, 0, 255, 0.7)', // Azul - Estado 3
  4: 'rgba(0, 255, 0, 0.7)', // Verde - Estado 4
  5: 'rgba(255, 165, 0, 0.7)', // Naranja - Estado 5
}

// Coordenadas de Cali, Colombia
const CALI_CENTER: [number, number] = [3.4516, -76.5320]
const CALI_BOUNDS: [[number, number], [number, number]] = [
  [3.3500, -76.2000],
  [3.5500, -76.9000],
]

/**
 * Componente para visualizar autómata celular sobre un mapa de Cali
 * 
 * Características:
 * - Mapa interactivo con Leaflet
 * - Grilla del autómata superpuesta
 * - Colores dinámicos por estado de célula
 * - Controles de simulación
 * - Actualización en tiempo real
 */
export const CellularAutomataMap: React.FC<CellularAutomataMapProps> = ({
  simulationId,
  onSimulationUpdate,
  autoPlay = false,
  updateInterval = 1000,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const canvasLayer = useRef<L.Canvas | null>(null)
  const [isRunning, setIsRunning] = useState(autoPlay)
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({
    generation: 0,
    alive_cells: 0,
    population_density: 0,
  })

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = L.map(mapContainer.current, {
      center: CALI_CENTER,
      zoom: 12,
      maxBounds: CALI_BOUNDS,
      maxBoundsViscosity: 1.0,
    })

    // Agregar capa base (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map.current)

    // Agregar canvas layer para renderizado eficiente
    canvasLayer.current = L.canvas().addTo(map.current)

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  /**
   * Renderiza las celdas del autómata sobre el mapa
   */
  const renderCells = (cells: any[], gridConfig: any) => {
    if (!map.current) return

    // Limpiar capas anteriores
    map.current.eachLayer((layer) => {
      if (layer instanceof L.Rectangle && !('_url' in layer)) {
        map.current!.removeLayer(layer)
      }
    })

    if (!gridConfig?.geospatial_bounds || cells.length === 0) return

    const bounds = gridConfig.geospatial_bounds
    const cellWidth = (bounds.lon_max - bounds.lon_min) / gridConfig.width
    const cellHeight = (bounds.lat_max - bounds.lat_min) / gridConfig.height

    // Renderizar cada célula como un rectángulo
    cells.forEach((cell) => {
      if (!cell || cell.state === 0) return // No renderizar células vacías

      const lat1 = bounds.lat_max - (cell.y * cellHeight)
      const lat2 = lat1 - cellHeight
      const lon1 = bounds.lon_min + (cell.x * cellWidth)
      const lon2 = lon1 + cellWidth

      const color = CELL_COLORS[cell.state] || 'rgba(128, 128, 128, 0.5)'

      const rect = L.rectangle(
        [[lat2, lon1], [lat1, lon2]],
        {
          color: color.replace('0.7', '1'), // Border
          fillColor: color,
          fillOpacity: 0.7,
          weight: 0.5,
        }
      ).addTo(map.current!)

      // Tooltip con información de la célula
      rect.bindPopup(
        `<div class="text-sm">
          <p><strong>Posición:</strong> (${cell.x}, ${cell.y})</p>
          <p><strong>Estado:</strong> ${cell.state}</p>
          <p><strong>Lat/Lon:</strong> ${cell.latitude?.toFixed(4)} / ${cell.longitude?.toFixed(4)}</p>
        </div>`
      )
    })
  }

  /**
   * Obtiene simulación del backend y actualiza visualización
   */
  const fetchAndRender = async () => {
    if (!simulationId) return

    try {
      setIsLoading(true)
      const response = await fetch(`http://localhost:3000/api/simulations/${simulationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch simulation')

      const data: SimulationResponseDTO = await response.json()

      // Calcular population_density
      const populationDensity = data.grid ? (data.grid.alive_cells / data.grid.total_cells) * 100 : 0

      // Actualizar estadísticas
      setStats({
        generation: data.generation,
        alive_cells: data.grid.alive_cells,
        population_density: populationDensity,
      })

      // Renderizar celdas
      renderCells(data.grid.cells, data.grid)

      if (onSimulationUpdate) {
        onSimulationUpdate(data)
      }
    } catch (error) {
      console.error('Error fetching simulation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Ejecuta un paso de simulación
   */
  const executeStep = async () => {
    if (!simulationId) return

    try {
      setIsLoading(true)
      const response = await fetch(`http://localhost:3000/api/simulations/${simulationId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
        },
        body: JSON.stringify({ generations: 1 }),
      })

      if (!response.ok) throw new Error('Failed to run simulation step')

      // Obtener estado actualizado
      await fetchAndRender()
    } catch (error) {
      console.error('Error executing step:', error)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Reset simulación
   */
  const handleReset = async () => {
    if (!simulationId) return

    try {
      setIsLoading(true)
      const response = await fetch(`http://localhost:3000/api/simulations/${simulationId}/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
        },
      })

      if (!response.ok) throw new Error('Failed to reset simulation')

      setStats({ generation: 0, alive_cells: 0, population_density: 0 })
      await fetchAndRender()
    } catch (error) {
      console.error('Error resetting simulation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Ejecutar simulación automáticamente o cargar inicial
  useEffect(() => {
    fetchAndRender()
  }, [simulationId])

  // Loop de actualización automática
  useEffect(() => {
    if (!isRunning || !simulationId) return

    const intervalId = setInterval(executeStep, updateInterval)
    return () => clearInterval(intervalId)
  }, [isRunning, simulationId, updateInterval])

  return (
    <div className="space-y-4">
      {/* Mapa */}
      <div
        ref={mapContainer}
        className="w-full h-80 rounded-lg border border-gray-300 shadow-md"
        style={{ minHeight: '400px' }}
      />

      {/* Controles */}
      <div className="flex gap-2 items-center justify-between">
        <div className="flex gap-2">
          <Button
            onClick={() => setIsRunning(!isRunning)}
            disabled={isLoading || !simulationId}
            variant={isRunning ? 'danger' : 'primary'}
            size="sm"
          >
            {isRunning ? (
              <>
                <Pause size={16} className="mr-1" />
                Pausar
              </>
            ) : (
              <>
                <Play size={16} className="mr-1" />
                Ejecutar
              </>
            )}
          </Button>

          <Button
            onClick={executeStep}
            disabled={isLoading || !simulationId}
            variant="secondary"
            size="sm"
          >
            Paso
          </Button>

          <Button
            onClick={handleReset}
            disabled={isLoading || !simulationId}
            variant="secondary"
            size="sm"
          >
            <RotateCcw size={16} className="mr-1" />
            Reiniciar
          </Button>
        </div>

        {/* Estadísticas */}
        <div className="text-sm text-gray-600">
          <span className="font-semibold">Gen:</span> {stats.generation} |
          <span className="font-semibold ml-2">Vivas:</span> {stats.alive_cells} |
          <span className="font-semibold ml-2">Densidad:</span>{' '}
          {(stats.population_density * 100).toFixed(1)}%
        </div>
      </div>

      {/* Leyenda de colores */}
      <Card title="Leyenda de Estados" className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          {Object.entries(CELL_COLORS).map(([state, color]) => (
            <div key={state} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded border"
                style={{ backgroundColor: color }}
              />
              <span>Estado {state}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
