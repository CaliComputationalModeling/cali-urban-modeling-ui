import { useMemo, useEffect, useState, useCallback } from 'react'
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
import { simulationEndpoints, type AtractorFisicoResponse } from '@/services/endpoints/simulation.endpoints'
import { CanvasGridOverlay, DiscreteGridOverlay, percentile95, type GridBounds } from '@/features/simulation/components/CanvasGridOverlay'
import { AttractorMarkersLayer } from '@/features/simulation/components/AttractorMarkersLayer'
import type { Feature, GeoJsonProperties, Geometry } from 'geojson'

const LAT_MIN = 3.3
const LAT_MAX = 3.6
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

function getComunaNumber(properties: GeoJsonProperties): number | null {
  const rawValue = properties?.NUMERO_COMUNA ?? properties?.numero_comuna ?? properties?.comuna ?? properties?.COMUNA
  if (rawValue === null || rawValue === undefined) return null
  const num = Number(rawValue)
  return Number.isFinite(num) ? num : null
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
  const showAutomataLayer = useSimulationStore((s) => s.showAutomataLayer)
  const toggleAgentsLayer = useSimulationStore((s) => s.toggleAgentsLayer)
  const toggleAttractorsLayer = useSimulationStore((s) => s.toggleAttractorsLayer)
  const toggleAutomataLayer = useSimulationStore((s) => s.toggleAutomataLayer)
  const pollingStatus = useSimulationStore((s) => s.pollingStatus)
  const recalculateSimulation = useSimulationStore((s) => s.recalculateSimulation)
  const lastSimulationRequest = useSimulationStore((s) => s.lastSimulationRequest)
  const showComunasLayer = useMapsStore((s) => s.showComunasLayer)
  const comunasGeoJson = useMapsStore((s) => s.comunasGeoJson)
  const toggleComunasLayer = useMapsStore((s) => s.toggleComunasLayer)
  const fetchComunasGeoJson = useMapsStore((s) => s.fetchComunasGeoJson)

  const caliCoords: [number, number] = [3.4372, -76.5225]

  const [pois, setPois] = useState<PointOfInterest[]>([])
  const [physicalAttractors, setPhysicalAttractors] = useState<AtractorFisicoResponse[]>([])
  const [routes, setRoutes] = useState<RutaMovilidad[]>([])
  const [editAttractorsMode, setEditAttractorsMode] = useState(false)
  const [attractorsDirty, setAttractorsDirty] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [highlightedAttractorId, setHighlightedAttractorId] = useState<number | null>(null)
  const [pendingCreate, setPendingCreate] = useState<{ lat: number; lon: number } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)
  const [selectedStep, setSelectedStep] = useState<number | null>(null)
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false)

  useEffect(() => {
    http
      .get<{ pois: PointOfInterest[] }>('/observations/pois')
      .then((res) => {
        if (res.ok && res.data?.pois) {
          setPois(res.data.pois)
        }
      })
      .catch(() => null)
  }, [simulationId])

  useEffect(() => {
    if (showComunasLayer) fetchComunasGeoJson().catch(() => null)
  }, [fetchComunasGeoJson, showComunasLayer])

  useEffect(() => {
    simulationEndpoints
      .listPhysicalAttractors()
      .then((res) => {
        if (res.ok && res.data) setPhysicalAttractors(res.data)
      })
      .catch(() => null)
  }, [simulationId])

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
    const p95 = percentile95(currentMatrix)
    return p95 > 0 ? p95 : 1
  }, [currentMatrix])

  const fixedReference = useMemo(() => {
    if (loadedPasos.length === 0) return undefined
    const paso0 = loadedPasos[0]
    if (!paso0?.densidad) return undefined
    let max = 0
    for (const row of paso0.densidad) {
      if (!row) continue
      for (const v of row) {
        if (v > max) max = v
      }
    }
    return max > 0 ? max : undefined
  }, [loadedPasos])

  const timelineValue = selectedStep ?? liveStepIndex

  const currentPasoPoblacion = useMemo(() => {
    const paso = loadedPasos[timelineValue]
    return paso?.poblacion_por_comuna ?? {}
  }, [loadedPasos, timelineValue])

  const comunaOnEachFeature = useCallback(
    (feature: Feature<Geometry, GeoJsonProperties>, layer: L.Layer) => {
      const label = getComunaLabel(feature.properties)
      layer.bindTooltip(label, {
        permanent: false,
        direction: 'center',
        className: 'comuna-tooltip',
      })
      const comunaNum = getComunaNumber(feature.properties)
      if (comunaNum !== null) {
        const poblacion = Number(currentPasoPoblacion[comunaNum] ?? 0)
        const popupContent = `
          <div style="font-size:12px;line-height:1.6">
            <strong>${label}</strong><br/>
            Población: <span style="color:#0ea5e9;font-weight:600">${Math.round(poblacion).toLocaleString()}</span>
          </div>
        `
        layer.bindPopup(popupContent, { className: 'comuna-popup' })
      }
    },
    [currentPasoPoblacion],
  )

  const refreshAttractors = useCallback(() => {
    simulationEndpoints.listPhysicalAttractors().then((res) => {
      if (res.ok && res.data) setPhysicalAttractors(res.data)
    }).catch(() => null)
  }, [])

  const handleAttractorMove = useCallback((id: number, lat: number, lon: number) => {
    simulationEndpoints.updatePhysicalAttractor(id, { lat, lon }).then((res) => {
      if (res.ok) {
        setAttractorsDirty(true)
        refreshAttractors()
      }
    }).catch(() => null)
  }, [refreshAttractors])

  const handleAttractorCreate = useCallback((lat: number, lon: number) => {
    setPendingCreate({ lat, lon })
  }, [])

  const confirmCreateAttractor = useCallback((tipo: string) => {
    if (!pendingCreate) return
    const isRepulsor = tipo === 'cai_policial' || tipo === 'guardia_seguridad'
    simulationEndpoints.createPhysicalAttractor({
      tipo,
      lat: pendingCreate.lat,
      lon: pendingCreate.lon,
      intensidad: isRepulsor ? -0.7 : 0.7,
      radio_influencia: 3,
      version_escenario_id: lastSimulationRequest?.version_escenario_id ?? null,
    }).then((res) => {
      if (res.ok) {
        setAttractorsDirty(true)
        refreshAttractors()
      }
    }).catch(() => null)
    setPendingCreate(null)
  }, [pendingCreate, lastSimulationRequest, refreshAttractors])

  const handleAttractorDelete = useCallback((id: number) => {
    setPendingDelete(id)
  }, [])

  const confirmDeleteAttractor = useCallback(() => {
    if (pendingDelete === null) return
    simulationEndpoints.deletePhysicalAttractor(pendingDelete).then((res) => {
      if (res.ok) {
        setAttractorsDirty(true)
        refreshAttractors()
      }
    }).catch(() => null)
    setPendingDelete(null)
  }, [pendingDelete, refreshAttractors])

  const handleRecalculate = useCallback(async () => {
    setIsRecalculating(true)
    setAttractorsDirty(false)
    setSelectedStep(null)
    await recalculateSimulation()
    setIsRecalculating(false)
  }, [recalculateSimulation])

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
            key={`comunas-${timelineValue}`}
            data={comunasGeoJson}
            style={COMUNAS_STYLE}
            onEachFeature={comunaOnEachFeature}
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
            orientation="mirrorY"
            useP95
            fixedReference={fixedReference}
          />
        )}

        <DiscreteGridOverlay
          bounds={MALLA_BOUNDS}
          data={currentMatrix}
          visible={showAutomataLayer}
          dataVersion={timelineValue}
          orientation="mirrorY"
          fixedReference={fixedReference}
          enableTooltip
        />

        <AttractorMarkersLayer
          attractors={physicalAttractors}
          visible={showAttractorsLayer}
          editMode={editAttractorsMode}
          onAttractorMove={handleAttractorMove}
          onAttractorCreate={handleAttractorCreate}
          onAttractorDelete={handleAttractorDelete}
        />

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
          data-testid="toggle-heatmap"
        >
          Heatmap (p95)
        </button>
        <button
          className={showAutomataLayer ? 'active' : ''}
          onClick={toggleAutomataLayer}
          data-testid="toggle-automata"
        >
          Autómata (discreto)
        </button>
        <button
          className={showAttractorsLayer ? 'active' : ''}
          onClick={toggleAttractorsLayer}
        >
          Atractores
        </button>
        {showAttractorsLayer && (
          <button
            className={editAttractorsMode ? 'active' : ''}
            onClick={() => setEditAttractorsMode((v) => !v)}
          >
            {editAttractorsMode ? '✏️ Editando' : '✏️ Editar'}
          </button>
        )}
        <button
          className={showComunasLayer ? 'active' : ''}
          onClick={toggleComunasLayer}
        >
          📍 Comunas
        </button>
      </div>

      {(attractorsDirty || isRecalculating) && (
        <div style={{
          position: 'absolute',
          top: 60,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: isRecalculating ? 'rgba(59, 130, 246, 0.95)' : 'rgba(234, 179, 8, 0.95)',
          color: isRecalculating ? '#ffffff' : '#1e293b',
          borderRadius: 8,
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 13,
          fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          {isRecalculating ? (
            <>
              <span>{pollingStatus ?? 'Recalculando simulación...'}</span>
            </>
          ) : (
            <>
              <span>Posición actualizada — recalcula la simulación para ver el efecto</span>
              <button
                onClick={handleRecalculate}
                style={{
                  background: '#1e293b',
                  color: '#e2e8f0',
                  border: 'none',
                  borderRadius: 4,
                  padding: '4px 12px',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Recalcular simulación
              </button>
              <button
                onClick={() => setAttractorsDirty(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 16,
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ×
              </button>
            </>
          )}
        </div>
      )}

      <div className={`sim-map-legend${isLegendCollapsed ? ' is-collapsed' : ''}`}>
        <div className="sim-map-legend-header">
          <p className="sim-map-legend-title">Leyenda</p>
          <button
            type="button"
            className="sim-map-legend-toggle"
            onClick={() => setIsLegendCollapsed((value) => !value)}
            aria-label={isLegendCollapsed ? 'Expandir leyenda' : 'Reducir leyenda'}
            aria-expanded={!isLegendCollapsed}
          >
            {isLegendCollapsed ? '+' : '-'}
          </button>
        </div>

        {!isLegendCollapsed && (
          <div className="sim-map-legend-content">
            <div className="sim-map-legend-row"><span style={{ background: '#fef08a' }} /> Heatmap — baja (p95)</div>
            <div className="sim-map-legend-row"><span style={{ background: '#f97316' }} /> Heatmap — media (p95)</div>
            <div className="sim-map-legend-row"><span style={{ background: '#b91c1c' }} /> Heatmap — alta (p95)</div>
            <div className="sim-map-legend-row"><span style={{ background: '#bfdbfe' }} /> Autómata — baja</div>
            <div className="sim-map-legend-row"><span style={{ background: '#fbbf24' }} /> Autómata — media</div>
            <div className="sim-map-legend-row"><span style={{ background: '#dc2626' }} /> Autómata — alta</div>
            <div className="sim-map-legend-row"><span style={{ background: '#0ea5e9' }} /> POI</div>
            <div className="sim-map-legend-row sim-map-legend-icons">🧱 🚧 🗑️ 💡 Atractores físicos</div>
          </div>
        )}
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

      {pendingCreate && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)',
        }}>
          <div style={{
            background: '#1e293b',
            borderRadius: 12,
            padding: '20px 24px',
            minWidth: 280,
            color: '#e2e8f0',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600 }}>Nuevo atractor / repulsor</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, opacity: 0.7 }}>
              Lat: {pendingCreate.lat.toFixed(4)}, Lon: {pendingCreate.lon.toFixed(4)}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { tipo: 'fachadas_ciegas', label: 'Fachadas ciegas', emoji: '🧱' },
                { tipo: 'vias_deterioradas', label: 'Vías deterioradas', emoji: '🚧' },
                { tipo: 'residuos', label: 'Residuos', emoji: '🗑️' },
                { tipo: 'deficiencia_iluminacion', label: 'Def. iluminación', emoji: '💡' },
                { tipo: 'cai_policial', label: 'CAI policial', emoji: '👮' },
                { tipo: 'guardia_seguridad', label: 'Guardia seguridad', emoji: '🛡️' },
              ].map((t) => (
                <button
                  key={t.tipo}
                  onClick={() => confirmCreateAttractor(t.tipo)}
                  style={{
                    background: '#334155',
                    border: '1px solid #475569',
                    borderRadius: 6,
                    padding: '8px 10px',
                    cursor: 'pointer',
                    color: '#e2e8f0',
                    fontSize: 12,
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setPendingCreate(null)}
              style={{
                marginTop: 12,
                width: '100%',
                background: 'transparent',
                border: '1px solid #475569',
                borderRadius: 6,
                padding: '6px',
                cursor: 'pointer',
                color: '#94a3b8',
                fontSize: 12,
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {pendingDelete !== null && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)',
        }}>
          <div style={{
            background: '#1e293b',
            borderRadius: 12,
            padding: '20px 24px',
            minWidth: 260,
            color: '#e2e8f0',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            textAlign: 'center',
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600 }}>Eliminar atractor</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, opacity: 0.8 }}>
              Se eliminará el atractor ID {pendingDelete}. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setPendingDelete(null)}
                style={{
                  flex: 1,
                  background: '#334155',
                  border: '1px solid #475569',
                  borderRadius: 6,
                  padding: '8px',
                  cursor: 'pointer',
                  color: '#e2e8f0',
                  fontSize: 13,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteAttractor}
                style={{
                  flex: 1,
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px',
                  cursor: 'pointer',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
