import { useMemo, useEffect, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Rectangle,
  Tooltip,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useSimulationStore } from '@/store/simulationStore'
import http from '@/services/http'
import type { GeoJsonResponse } from '@/shared/contracts/simulation.contract'
import { mapsEndpoints } from '@/services/endpoints/maps.endpoints'
import type { RutaMovilidad } from '@/services/endpoints/maps.endpoints'

const LAT_MIN = 3.3
const LAT_MAX = 3.55
const LON_MIN = -76.6
const LON_MAX = -76.45

interface ActiveCell {
  bounds: [[number, number], [number, number]]
  x: number
  y: number
  agentes: number
  densidad: number
  ratio: number
}

function getCellColor(ratio: number): string {
  const clamped = Math.min(Math.max(ratio, 0), 1)

  if (clamped > 0.85) return '#f43f5e' // Rose 500 (Vivo)
  if (clamped > 0.65) return '#fbbf24' // Amber 400
  if (clamped > 0.45) return '#22c55e' // Green 500
  if (clamped > 0.25) return '#0ea5e9' // Sky 500
  return '#8b5cf6' // Violet 500
}

function getCellOpacity(ratio: number): number {
  return 0.58 + Math.min(Math.max(ratio, 0), 1) * 0.34
}

const POI_ICONS: Record<string, { emoji: string; color: string }> = {
  comedor_social: { emoji: '🍽', color: '#22c55e' },
  cambuche: { emoji: '🏕', color: '#d4af37' },
  zona_consumo: { emoji: '⚠', color: '#f97316' },
  zona_patrullaje: { emoji: '🚔', color: '#ef4444' },
  parque_publico: { emoji: '🌳', color: '#86efac' },
  hospital_cai: { emoji: '🏥', color: '#f43f5e' },
}

const makePOIIcon = (tipo: string) => {
  const def = POI_ICONS[tipo] || { emoji: '📍', color: '#94a3b8' }

  return L.divIcon({
    html: `<div style="font-size:16px;line-height:1;filter:drop-shadow(0 0 4px ${def.color})">${def.emoji}</div>`,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

export const SimulationMap = () => {
  const geojson = useSimulationStore((s) => s.geojson)
  const currentGeneration = useSimulationStore((s) => s.currentGeneration)
  const simulationId = useSimulationStore((s) => s.simulationId)
  const loadedPasos = useSimulationStore((s) => s.loadedPasos)

  const caliCoords: [number, number] = [3.4372, -76.5225]

  const [pois, setPois] = useState<Record<string, unknown>[]>([])
  const [routes, setRoutes] = useState<RutaMovilidad[]>([])

  const [selectedStep, setSelectedStep] = useState<number | null>(null)

  const [timelineGeoJson, setTimelineGeoJson] =
    useState<GeoJsonResponse | null>(null)

  useEffect(() => {
    http
      .get<{ pois: Record<string, unknown>[] }>('/observations/pois')
      .then((res) => {
        if (res.ok && res.data?.pois) {
          setPois(res.data.pois)
        }
      })
      .catch(() => null)
  }, [])

  useEffect(() => {
    if (!simulationId) return

    mapsEndpoints
      .getPredictedRoutes(String(simulationId))
      .then((res) => {
        if (res.ok && res.data?.rutas) {
          setRoutes(res.data.rutas)
        }
      })
      .catch(() => null)
  }, [simulationId])

  useEffect(() => {
    if (selectedStep === null || !loadedPasos[selectedStep]) {
      setTimelineGeoJson(null)
      return
    }

    const paso = loadedPasos[selectedStep]

    const rows = paso.densidad.length
    const cols = rows > 0 ? paso.densidad[0].length : 0

    const features = []

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const densidad = paso.densidad[i][j] ?? 0

        if (densidad <= 0) continue

        const lat = LAT_MIN + (i / rows) * (LAT_MAX - LAT_MIN)
        const lon = LON_MIN + (j / cols) * (LON_MAX - LON_MIN)

        features.push({
          type: 'Feature' as const,
          properties: {
            x: j,
            y: i,
            agentes: Math.round(densidad * 100),
            densidad,
            en_transito: 0,
            en_comedor: 0,
            en_cambuche: 0,
            zona_consumo: 0,
            zona_repulsora: 0,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [lon, lat] as [number, number],
          },
        })
      }
    }

    setTimelineGeoJson({
      type: 'FeatureCollection',
      features,
      metadata: {
        generacion: paso.tiempo,
        timestamp: new Date().toISOString(),
        total_agentes: paso.total_poblacion,
        max_densidad: 0,
      },
    })
  }, [selectedStep, loadedPasos])

  const activeCells = useMemo<ActiveCell[]>(() => {
    const step =
      selectedStep !== null
        ? loadedPasos[selectedStep]
        : loadedPasos.find((paso) => paso.tiempo === currentGeneration)

    if (step) {
      const rows = step.densidad.length
      const cols = rows > 0 ? step.densidad[0].length : 0
      const latStep = (LAT_MAX - LAT_MIN) / Math.max(rows, 1)
      const lonStep = (LON_MAX - LON_MIN) / Math.max(cols, 1)
      const occupied = []
      let maxAgents = 0

      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          const densidad = step.densidad[i]?.[j] ?? 0
          if (densidad <= 0) continue

          const agentes = Math.max(1, Math.round(densidad * 100))
          if (agentes > maxAgents) maxAgents = agentes

          occupied.push({
            x: j,
            y: i,
            agentes,
            densidad,
            bounds: [
              [LAT_MIN + i * latStep, LON_MIN + j * lonStep],
              [LAT_MIN + (i + 1) * latStep, LON_MIN + (j + 1) * lonStep],
            ] as [[number, number], [number, number]],
          })
        }
      }

      return occupied.map((cell) => ({
        ...cell,
        ratio: cell.agentes / Math.max(maxAgents, 1),
      }))
    }

    const source = timelineGeoJson ?? geojson
    if (!source) return []

    const features = source.features.filter((f) => f.geometry !== null)
    let maxAgents = 0

    for (const feature of features) {
      const agentes = (feature.properties?.agentes as number) ?? 0
      if (agentes > maxAgents) maxAgents = agentes
    }

    return features.map((feature) => {
      const x = (feature.properties?.x as number) ?? 0
      const y = (feature.properties?.y as number) ?? 0
      const agentes = (feature.properties?.agentes as number) ?? 0
      const densidad = (feature.properties?.densidad as number) ?? 0
      const [lon, lat] = feature.geometry.coordinates
      const cellSize = 0.001

      return {
        x,
        y,
        agentes,
        densidad,
        ratio: agentes / Math.max(maxAgents, 1),
        bounds: [
          [lat - cellSize / 2, lon - cellSize / 2],
          [lat + cellSize / 2, lon + cellSize / 2],
        ],
      }
    })
  }, [currentGeneration, geojson, loadedPasos, selectedStep, timelineGeoJson])

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    >
      <MapContainer
        center={caliCoords}
        zoom={14}
        zoomControl={false}
        scrollWheelZoom
        style={{
          height: '100%',
          width: '100%',
          backgroundColor: '#0d1017',
          borderRadius: '24px',
        }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; CARTO"
        />

        {/* Renderizado de celdas ocupadas como rectángulos vivos */}
        {activeCells.map((cell) => (
          <Rectangle
            key={`cell-${cell.x}-${cell.y}-${selectedStep ?? 'live'}`}
            bounds={cell.bounds}
            pathOptions={{
              fillColor: getCellColor(cell.ratio),
              fillOpacity: getCellOpacity(cell.ratio),
              stroke: false, // Esto hace que la malla vacía sea invisible
            }}
          >
            <Tooltip sticky className="sim-tooltip">
              <b>Celda [{cell.x},{cell.y}]</b><br/>
              Agentes: {cell.agentes}<br/>
              Densidad: {(cell.densidad * 100).toFixed(1)}%
            </Tooltip>
          </Rectangle>
        ))}

        {routes.map((r, idx) => (
          <Polyline
            key={`route-${idx}`}
            positions={[
              [r.origen.lat, r.origen.lon],
              [r.destino.lat, r.destino.lon],
            ]}
            pathOptions={{
              color:
                r.intensidad > 0.5
                  ? '#ff6b6b'
                  : '#60a5fa',
              weight: 2,
              opacity: 0.8,
            }}
          />
        ))}

        {pois
          .filter(
            (poi) =>
              !!(poi.latitud as number) &&
              !!(poi.longitud as number),
          )
          .map((poi) => (
            <Marker
              key={poi.id as string}
              position={[
                poi.latitud as number,
                poi.longitud as number,
              ]}
              icon={makePOIIcon(
                poi.tipo_poi as string,
              )}
            >
              <Popup>
                <b>{poi.nombre as string}</b>
                <br />
                Tipo: {poi.tipo_poi as string}
                <br />
                Peso: {poi.peso as number}
                <br />
                Radio:{' '}
                {poi.radio_influencia as number} celdas
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {loadedPasos.length > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            zIndex: 550,
            background: 'rgba(13,16,23,0.85)',
            padding: '8px 12px',
            borderRadius: 8,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <button
            onClick={() =>
              setSelectedStep((s) =>
                Math.max(
                  0,
                  (s ?? loadedPasos.length - 1) - 1,
                ),
              )
            }
          >
            ◀
          </button>

          <input
            type="range"
            min={0}
            max={loadedPasos.length - 1}
            value={selectedStep ?? currentGeneration}
            onChange={(e) =>
              setSelectedStep(Number(e.target.value))
            }
            style={{ width: 140 }}
          />

          <button
            onClick={() =>
              setSelectedStep((s) =>
                Math.min(
                  loadedPasos.length - 1,
                  (s ?? 0) + 1,
                ),
              )
            }
          >
            ▶
          </button>

          <span
            style={{
              fontSize: 12,
              color: '#94a3b8',
              minWidth: 100,
            }}
          >
            Paso {selectedStep ?? currentGeneration} /{' '}
            {loadedPasos.length - 1}
          </span>

          {selectedStep !== null && (
            <button
              onClick={() => setSelectedStep(null)}
            >
              Live
            </button>
          )}
        </div>
      )}
    </div>
  )
}
