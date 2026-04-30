import { useMemo, useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useSimulationStore } from '@/store/simulationStore'
import http from '@/services/http'

// ─── Density Color Scale ─────────────────────────────────────────────────────

function getDensityColor(ratio: number): string {
  // HSL: 120 (green) → 60 (yellow) → 0 (red)
  const hue = 120 * (1 - Math.min(ratio, 1))
  return `hsl(${hue}, 80%, 50%)`
}

function getDensityRadius(ratio: number): number {
  return 4 + Math.min(ratio, 1) * 16 // 4px to 20px
}

// ─── POI Icons ───────────────────────────────────────────────────────────────

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

// ─── SimulationMap ───────────────────────────────────────────────────────────

export const SimulationMap = () => {
  const data = useSimulationStore((s) => s.data)
  const currentGeneration = useSimulationStore((s) => s.currentGeneration)
  const status = useSimulationStore((s) => s.status)
  const caliCoords: [number, number] = [3.4372, -76.5225]
  const [pois, setPois] = useState<Record<string, unknown>[]>([])

  // Load POIs once on mount
  useEffect(() => {
    http
      .get<{ pois: Record<string, unknown>[] }>('/observations/pois')
      .then((res) => {
        if (res.ok && res.data?.pois) setPois(res.data.pois)
      })
      .catch(() => null)
  }, [])

  // Filter null geometries and compute max agents for density normalization
  const { filteredData, maxAgentes } = useMemo(() => {
    if (!data) return { filteredData: null, maxAgentes: 1 }

    const features = data.features.filter((f) => f.geometry !== null)
    let max = 0
    for (const f of features) {
      const a = (f.properties?.agentes as number) ?? 0
      if (a > max) max = a
    }

    return {
      filteredData: { ...data, features },
      maxAgentes: Math.max(max, 1),
    }
  }, [data])

  const isRunning = status === 'running'

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

        {/* Simulation agents — density-based coloring */}
        {filteredData && filteredData.features.length > 0 && (
          <GeoJSON
            key={`sim-${currentGeneration}-${filteredData.features.length}`}
            data={filteredData}
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
              const x = feature.properties?.x ?? '?'
              const y = feature.properties?.y ?? '?'
              const ratio = agentes / maxAgentes
              const densityPct = (ratio * 100).toFixed(1)

              layer.bindTooltip(
                `<b>Celda [${x},${y}]</b><br/>Agentes: ${agentes}<br/>Densidad: ${densityPct}%`,
                { className: 'sim-tooltip', sticky: true },
              )
            }}
          />
        )}

        {/* Fixed POI markers */}
        {pois.map((poi) => {
          const lat = poi.latitud as number
          const lon = poi.longitud as number
          if (!lat || !lon) return null
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

      {/* Generation badge */}
      <div className="sim-map-badge">
        <span
          className="sim-map-badge-dot"
          style={{ animationPlayState: isRunning ? 'running' : 'paused' }}
        />
        GEN_{currentGeneration.toString().padStart(5, '0')}
      </div>

      {/* Density legend */}
      <div className="sim-map-legend">
        <span className="sim-legend-title">DENSIDAD</span>
        <div className="sim-legend-gradient">
          <div className="sim-legend-bar" />
          <div className="sim-legend-labels">
            <span>Baja</span>
            <span>Media</span>
            <span>Alta</span>
          </div>
        </div>
      </div>
    </div>
  )
}
