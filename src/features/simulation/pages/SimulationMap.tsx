import { useMemo, useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useSimulationStore } from '@/store/simulationStore'
import http from '@/services/http'
import type { GeoJsonResponse } from '@/shared/contracts/simulation.contract'
import { mapsEndpoints } from '@/services/endpoints/maps.endpoints'
import { simulationEndpoints } from '@/services/endpoints/simulation.endpoints'

// ─────────────────────────────────────────────────────────────────────────────
// DENSITY COLOR SCALE - Green → Yellow → Red
// ─────────────────────────────────────────────────────────────────────────────

function getDensityColor(ratio: number): string {
  const hue = 120 * (1 - Math.min(ratio, 1))
  return `hsl(${hue}, 80%, 50%)`
}

function getDensityRadius(ratio: number): number {
  return 4 + Math.min(ratio, 1) * 16
}

// ─────────────────────────────────────────────────────────────────────────────
// POI ICONS
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION MAP COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const SimulationMap = () => {
  const geojson = useSimulationStore((s) => s.geojson)
  const currentGeneration = useSimulationStore((s) => s.currentGeneration)
  const simulationId = useSimulationStore((s) => s.simulationId)

  const caliCoords: [number, number] = [3.4372, -76.5225]
  const [pois, setPois] = useState<Record<string, unknown>[]>([])
  const [routes, setRoutes] = useState<{ origen: {lat:number,lon:number}, destino:{lat:number,lon:number}, intensidad:number }[]>([])
  const [heatmapCells, setHeatmapCells] = useState<{ lat:number; lon:number; densidad:number }[]>([])
  const [steps, setSteps] = useState<GeoJsonResponse[] | null>(null)
  const [selectedStep, setSelectedStep] = useState<number | null>(null)

  // Cargar POIs una sola vez
  useEffect(() => {
    http
      .get<{ pois: Record<string, unknown>[] }>('/observations/pois')
      .then((res) => {
        if (res.ok && res.data?.pois) setPois(res.data.pois)
      })
      .catch(() => null)
  }, [])

  // Fetch predicted routes when we have a simulation execution id
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
  }, [simulationId, currentGeneration])

  // Fetch heatmap (historical density)
  useEffect(() => {
    mapsEndpoints
      .getHeatmap()
      .then((res) => {
        if (res.ok && Array.isArray(res.data)) {
          setHeatmapCells(res.data.map((c: any) => ({ lat: c.lat, lon: c.lon, densidad: c.densidad })))
        }
      })
      .catch(() => null)
  }, [])

  // Fetch steps/matrices for timeline if we have a simulation id
  useEffect(() => {
    if (!simulationId) return
    simulationEndpoints
      .getSimulationSteps(simulationId)
      .then((res) => {
        if (res.ok && res.data) {
          // Expecting an array of GeoJsonResponse-like objects
          const parsed = Array.isArray(res.data) ? res.data : null
          if (parsed) {
            setSteps(parsed)
            setSelectedStep(parsed.length > 0 ? parsed.length - 1 : null)
          }
        }
      })
      .catch(() => null)
  }, [simulationId])

  // Filtrar geometrías nulas y calcular max densidad para normalización
  const { filteredGeoJson, maxAgentes } = useMemo(() => {
    if (!geojson) return { filteredGeoJson: null, maxAgentes: 1 }

    const features = geojson.features.filter((f) => f.geometry !== null)

    let max = 0
    for (const f of features) {
      const agentes = (f.properties?.agentes as number) ?? 0
      if (agentes > max) max = agentes
    }

    const filtered: GeoJsonResponse = {
      type: 'FeatureCollection',
      features,
      metadata: geojson.metadata,
    }

    return {
      filteredGeoJson: filtered,
      maxAgentes: Math.max(max, 1),
    }
  }, [geojson])

  

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer
        center={caliCoords}
        zoom={14}
        zoomControl={false}
        scrollWheelZoom={true}
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

        {/* Agentes de simulación - coloreado por densidad */}
        {/** If steps timeline selected, show that step otherwise current geojson */}
        {(steps && selectedStep !== null ? steps[selectedStep] : filteredGeoJson) && (
          <GeoJSON
            key={`sim-${currentGeneration}-${filteredGeoJson?.features.length ?? 0}-${selectedStep ?? 'curr'}`}
            data={(steps && selectedStep !== null ? steps[selectedStep] : filteredGeoJson) as any}
            pointToLayer={(feature, latlng) => {
              const agentes = (feature.properties?.agentes as number) ?? 0
              const ratio = agentes / maxAgentes

              return L.circleMarker(latlng, {
                radius: getDensityRadius(ratio),
                fillColor: getDensityColor(ratio),
                color: '#ffffff',
                weight: 1,
                opacity: 0.9,
                fillOpacity: 0.85,
              })
            }}
            onEachFeature={(feature, layer) => {
              const agentes = (feature.properties?.agentes as number) ?? 0
              const x = (feature.properties?.x as number) ?? '?'
              const y = (feature.properties?.y as number) ?? '?'
              const ratio = agentes / maxAgentes
              const densityPct = (ratio * 100).toFixed(1)

              layer.bindTooltip(
                `<b>Celda [${x},${y}]</b><br/>Agentes: ${agentes}<br/>Densidad: ${densityPct}%`,
                { className: 'sim-tooltip', sticky: true },
              )
            }}
          />
        )}

        {/* Predicted routes as polylines */}
        {routes.map((r, idx) => (
          <Polyline
            key={`route-${idx}`}
            positions={[[r.origen.lat, r.origen.lon], [r.destino.lat, r.destino.lon]]}
            pathOptions={{ color: r.intensidad > 0.5 ? '#ff6b6b' : '#60a5fa', weight: 2, opacity: 0.8 }}
          />
        ))}

        {/* Heatmap (historical density) */}
        {heatmapCells.map((c, idx) => {
          const color = getDensityColor(c.densidad)
          return (
            <CircleMarker
              key={`heat-${idx}`}
              center={[c.lat, c.lon]}
              radius={Math.max(3, c.densidad * 12)}
              pathOptions={{ fillColor: color, color: color, fillOpacity: 0.35, opacity: 0.6 }}
            />
          )
        })}

        {/* Markers fijos de POI */}
        {pois
          .filter((poi) => !!(poi.latitud as number) && !!(poi.longitud as number))
          .map((poi) => {
            const lat = poi.latitud as number
            const lon = poi.longitud as number
            return (
              <Marker
                key={poi.id as string}
                position={[lat, lon]}
                icon={makePOIIcon(poi.tipo_poi as string)}
              >
                <Popup>
                  <b>{poi.nombre as string}</b>
                  <br />
                  Tipo: {poi.tipo_poi as string}
                  <br />
                  Peso: {poi.peso as number}
                  <br />
                  Radio: {poi.radio_influencia as number} celdas
                </Popup>
              </Marker>
            )
          })}

      </MapContainer>

      {/* Timeline slider and controls */}
      <div style={{ position: 'absolute', left: 12, bottom: 12, zIndex: 550, background: 'rgba(13,16,23,0.8)', padding: 8, borderRadius: 8, color: '#fff' }}>
        {steps && steps.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setSelectedStep((s) => (s !== null ? Math.max(0, s - 1) : steps.length - 1))}>◀</button>
            <input type="range" min={0} max={steps.length - 1} value={selectedStep ?? steps.length - 1} onChange={(e) => setSelectedStep(Number(e.target.value))} />
            <button onClick={() => setSelectedStep((s) => (s !== null ? Math.min(steps.length - 1, s + 1) : 0))}>▶</button>
            <div style={{ minWidth: 120 }}>Paso: {selectedStep !== null ? selectedStep : '—'} / {steps.length - 1}</div>
          </div>
        ) : null}
      </div>
    </div>
  )
}