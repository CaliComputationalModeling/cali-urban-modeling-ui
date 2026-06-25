import { useMemo, useEffect, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Popup,
  Polyline,
  GeoJSON,
  CircleMarker,
  Tooltip,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useSimulationStore } from '@/store/simulationStore'
import { useMapsStore } from '@/store/mapsStore'
import http from '@/services/http'
import type { PointOfInterest } from '@/shared/contracts/simulation.contract'
import { mapsEndpoints } from '@/services/endpoints/maps.endpoints'
import type { RutaMovilidad } from '@/services/endpoints/maps.endpoints'
import { CanvasGridOverlay, type GridBounds } from '@/features/simulation/components/CanvasGridOverlay'
import type { Feature, GeoJsonProperties, Geometry } from 'geojson'

const LAT_MIN = 3.3
const LAT_MAX = 3.55
const LON_MIN = -76.6
const LON_MAX = -76.45
const MALLA_BOUNDS: GridBounds = { north: LAT_MAX, south: LAT_MIN, west: LON_MIN, east: LON_MAX }
const COMUNAS_STYLE: L.PathOptions = {
  color: 'rgba(255,255,255,0.35)',
  weight: 1.5,
  fillColor: 'rgba(255,255,255,0.02)',
  fillOpacity: 0.02,
  opacity: 0.9,
  dashArray: '4,4',
}

function getComunaLabel(properties: GeoJsonProperties): string {
  const rawValue = properties?.NUMERO_COMUNA ?? properties?.numero_comuna ?? properties?.comuna ?? properties?.COMUNA ?? properties?.nombre ?? properties?.NOMBRE
  return rawValue ? `Comuna ${String(rawValue).replace(/^comuna\s+/i, '')}` : 'Comuna'
}

function bindComunaTooltip(feature: Feature<Geometry, GeoJsonProperties>, layer: L.Layer) {
  layer.bindTooltip(getComunaLabel(feature.properties), {
    permanent: false,
    direction: 'center',
    className: 'comuna-tooltip',
  })
}

export const SimulationMap = () => {
  const currentGeneration = useSimulationStore((s) => s.currentGeneration)
  const simulationId = useSimulationStore((s) => s.simulationId)
  const loadedPasos = useSimulationStore((s) => s.loadedPasos)
  const showAgentsLayer = useSimulationStore((s) => s.showAgentsLayer)
  const showAttractorsLayer = useSimulationStore((s) => s.showAttractorsLayer)
  const toggleAgentsLayer = useSimulationStore((s) => s.toggleAgentsLayer)
  const toggleAttractorsLayer = useSimulationStore((s) => s.toggleAttractorsLayer)
  const showComunasLayer = useMapsStore((s) => s.showComunasLayer)
  const comunasGeoJson = useMapsStore((s) => s.comunasGeoJson)
  const toggleComunasLayer = useMapsStore((s) => s.toggleComunasLayer)
  const fetchComunasGeoJson = useMapsStore((s) => s.fetchComunasGeoJson)

  const caliCoords: [number, number] = [3.4372, -76.5225]

  const [pois, setPois] = useState<PointOfInterest[]>([])
  const [routes, setRoutes] = useState<RutaMovilidad[]>([])

  const [selectedStep, setSelectedStep] = useState<number | null>(null)

  useEffect(() => {
    http
      .get<{ pois: PointOfInterest[] }>('/observations/pois')
      .then((res) => {
        if (res.ok && res.data?.pois) {
          setPois(res.data.pois)
        }
      })
      .catch(() => null)
  }, [])

  useEffect(() => {
    if (showComunasLayer) fetchComunasGeoJson().catch(() => null)
  }, [fetchComunasGeoJson, showComunasLayer])

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

  const liveStepIndex = useMemo(() => {
    const index = loadedPasos.findIndex((paso) => paso.tiempo === currentGeneration)
    return index >= 0 ? index : 0
  }, [currentGeneration, loadedPasos])

  const currentMatrix = useMemo(() => {
    const step = selectedStep !== null ? loadedPasos[selectedStep] : loadedPasos[liveStepIndex]
    if (!step) return null
    return step.densidad
  }, [liveStepIndex, loadedPasos, selectedStep])

  const maxDensity = useMemo(() => {
    if (!currentMatrix || currentMatrix.length === 0) return 1
    const values = currentMatrix.flat().filter(Number.isFinite)
    return Math.max(...values) || 1
  }, [currentMatrix])

  const timelineValue = selectedStep ?? liveStepIndex

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

        {showComunasLayer && comunasGeoJson && (
          <GeoJSON
            data={comunasGeoJson}
            style={COMUNAS_STYLE}
            onEachFeature={bindComunaTooltip}
          />
        )}

        {showAgentsLayer && (
          <CanvasGridOverlay
            bounds={MALLA_BOUNDS}
            data={currentMatrix}
            layerMode="density"
            dataVersion={timelineValue}
            maxValue={maxDensity}
            enableProbabilityTooltip
            orientation="mirrorX"
          />
        )}

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

        {showAttractorsLayer && pois
          .filter((poi) => Number.isFinite(poi.latitud) && Number.isFinite(poi.longitud))
          .map((poi) => (
            <CircleMarker
              key={String(poi.id)}
              center={[
                poi.latitud,
                poi.longitud,
              ]}
              radius={7 + Math.min(Number(poi.peso ?? 0), 4)}
              pathOptions={{
                color: '#e0f2fe',
                fillColor: '#0ea5e9',
                fillOpacity: 0.95,
                opacity: 1,
                weight: 1.5,
              }}
            >
              <Tooltip sticky className="sim-tooltip">
                <b>Atractor</b><br />
                {poi.nombre}<br />
                {poi.tipo_poi}
              </Tooltip>
              <Popup>
                <b>{poi.nombre}</b>
                <br />
                Tipo: {poi.tipo_poi}
                <br />
                Peso: {poi.peso ?? '—'}
                <br />
                Radio:{' '}
                {poi.radio_influencia ?? '—'} celdas
              </Popup>
            </CircleMarker>
          ))}
      </MapContainer>

      <div className="sim-layer-toggle">
        <button
          className={showAgentsLayer ? 'active' : ''}
          onClick={toggleAgentsLayer}
        >
          Ver Agentes
        </button>
        <button
          className={showAttractorsLayer ? 'active' : ''}
          onClick={toggleAttractorsLayer}
        >
          Ver Atractores
        </button>
        <button
          className={showComunasLayer ? 'active' : ''}
          onClick={toggleComunasLayer}
        >
          📍 Ver Comunas
        </button>
      </div>

      <div className="sim-map-legend">
        <p className="sim-map-legend-title">Leyenda</p>
        <div><span style={{ background: '#fef08a' }} /> Baja densidad</div>
        <div><span style={{ background: '#f97316' }} /> Media densidad</div>
        <div><span style={{ background: '#b91c1c' }} /> Alta densidad</div>
        <div><span style={{ background: '#0ea5e9' }} /> Atractores</div>
      </div>

      {loadedPasos.length > 0 && (
        <div className="sim-timeline-control" aria-label="Control de pasos de simulación">
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
            value={timelineValue}
            onChange={(e) =>
              setSelectedStep(Number(e.target.value))
            }
            className="sim-timeline-range"
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

          <span className="sim-timeline-label">
            Paso {timelineValue} /{' '}
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
