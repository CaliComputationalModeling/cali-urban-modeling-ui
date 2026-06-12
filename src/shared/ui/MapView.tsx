"use client"

/**
 * MapView — Mapa Leaflet con la grilla del autómata superpuesta.
 *
 * Instalación requerida:
 *   npm install leaflet react-leaflet
 *   npm install -D @types/leaflet
 *
 * En tu layout.tsx o globals.css agrega:
 *   import "leaflet/dist/leaflet.css"
 */

import { useEffect, useRef, useMemo } from "react"
import { useSimulationStore } from "@/store/simulationStore"
import type { Cell } from "@/shared/types/simulation.types"

// Bounds por defecto: Cali, Colombia (coincide con tu geospatial_bounds)
const DEFAULT_BOUNDS = {
  lat_min: 3.2,
  lat_max: 3.6,
  lon_min: -76.2,
  lon_max: -75.9,
}

export const MapView = () => {
  const mapRef = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)
  const layerGroupRef = useRef<any>(null)

  const simulationId = useSimulationStore((s) => s.simulationId)
  const currentGeneration = useSimulationStore((s) => s.currentGeneration)
  const loadedPasos = useSimulationStore((s) => s.loadedPasos)

  const currentStep = useMemo(
    () => loadedPasos.find((paso) => paso.tiempo === currentGeneration) ?? loadedPasos[0],
    [currentGeneration, loadedPasos],
  )

  const cells = useMemo<Cell[]>(() => {
    if (!currentStep) return []
    const result: Cell[] = []
    for (let row = 0; row < currentStep.densidad.length; row++) {
      for (let col = 0; col < (currentStep.densidad[row]?.length ?? 0); col++) {
        if ((currentStep.densidad[row]?.[col] ?? 0) > 0) {
          result.push({ position: { x: col, y: row }, state: 1 })
        }
      }
    }
    return result
  }, [currentStep])

  const width = currentStep?.densidad[0]?.length ?? 50
  const height = currentStep?.densidad.length ?? 50

  // Calcular el centro del mapa desde los bounds
  const center = useMemo(() => ({
    lat: (DEFAULT_BOUNDS.lat_min + DEFAULT_BOUNDS.lat_max) / 2,
    lng: (DEFAULT_BOUNDS.lon_min + DEFAULT_BOUNDS.lon_max) / 2,
  }), [])

  // Inicializar mapa una sola vez
  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return

    // Importamos Leaflet dinámicamente (SSR safe)
    import("leaflet").then((L) => {
      // Fix para los íconos de Leaflet con webpack/Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      const map = L.map(mapRef.current!).setView([center.lat, center.lng], 12)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      // Dibujar el bounding box del área de simulación
      L.rectangle(
        [
          [DEFAULT_BOUNDS.lat_min, DEFAULT_BOUNDS.lon_min],
          [DEFAULT_BOUNDS.lat_max, DEFAULT_BOUNDS.lon_max],
        ],
        { color: "#6366f1", weight: 2, fill: false, dashArray: "6 4" }
      ).addTo(map)

      // Grupo de capas para las celdas — se actualiza sin recrear el mapa
      layerGroupRef.current = L.layerGroup().addTo(map)
      mapInstanceRef.current = map
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [center])

  // Actualizar celdas cada vez que cambia la simulación
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return

    import("leaflet").then((L) => {
      layerGroupRef.current.clearLayers()

      const latRange = DEFAULT_BOUNDS.lat_max - DEFAULT_BOUNDS.lat_min
      const lonRange = DEFAULT_BOUNDS.lon_max - DEFAULT_BOUNDS.lon_min

      const cellLatSize = latRange / height
      const cellLonSize = lonRange / width

      cells.forEach((cell: any) => {
        if (cell.state !== 1) return

        const x = cell.position.x
        const y = cell.position.y

        // Si la celda tiene coordenada geo real del backend, la usamos
        // Si no, la calculamos desde la posición discreta
        let lat: number
        let lon: number

        if (cell.geo_coordinate?.latitude && cell.geo_coordinate?.longitude) {
          lat = cell.geo_coordinate.latitude
          lon = cell.geo_coordinate.longitude
        } else {
          lat = DEFAULT_BOUNDS.lat_min + (y / height) * latRange
          lon = DEFAULT_BOUNDS.lon_min + (x / width) * lonRange
        }

        // Cada celda es un rectángulo en el mapa
        const bounds: [[number, number], [number, number]] = [
          [lat, lon],
          [lat + cellLatSize, lon + cellLonSize],
        ]

        L.rectangle(bounds, {
          color: "#6366f1",
          fillColor: "#818cf8",
          fillOpacity: 0.7,
          weight: 0.5,
        }).addTo(layerGroupRef.current)
      })
    })
  }, [cells, height, width])

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-gray-200" style={{ height: "420px" }}>
      <div ref={mapRef} className="w-full h-full" />

      {/* Overlay cuando no hay simulación */}
      {!simulationId && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
          <p className="text-gray-500 text-sm">Carga una simulación para ver las celdas en el mapa</p>
        </div>
      )}

      {/* Leyenda */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow p-2 text-xs space-y-1 z-[1000]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-indigo-400 border border-indigo-600" />
          <span>Celda viva</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm border-2 border-dashed border-indigo-500" />
          <span>Área de simulación</span>
        </div>
      </div>
    </div>
  )
}
