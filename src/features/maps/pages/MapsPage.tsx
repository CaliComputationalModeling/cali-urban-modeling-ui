import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip as LeafletTooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { toast } from 'sonner'
import { useMapsStore } from '@/store/mapsStore'

type LatLngTuple = [number, number]

function hslGreenToRed(ratio: number): string {
  const clamped = Math.max(0, Math.min(1, ratio))
  const hue = 120 * (1 - clamped) // 120->0
  return `hsl(${hue}, 85%, 50%)`
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-CO').format(n)
}

function getBoundsFromPoints(points: LatLngTuple[]): L.LatLngBounds | null {
  if (points.length === 0) return null
  const b = L.latLngBounds(points[0], points[0])
  for (const p of points) b.extend(p)
  return b
}

export const MapsPage = () => {
  const heatmap = useMapsStore((s) => s.heatmap)
  const predicted = useMapsStore((s) => s.predicted)
  const selectedExecutionId = useMapsStore((s) => s.selectedExecutionId)
  const setSelectedExecutionId = useMapsStore((s) => s.setSelectedExecutionId)
  const fetchHeatmap = useMapsStore((s) => s.fetchHeatmap)
  const fetchPredictedRoutes = useMapsStore((s) => s.fetchPredictedRoutes)
  const isLoadingHeatmap = useMapsStore((s) => s.isLoadingHeatmap)
  const isLoadingRoutes = useMapsStore((s) => s.isLoadingRoutes)
  const error = useMapsStore((s) => s.error)
  const clearError = useMapsStore((s) => s.clearError)

  const [legendMin, setLegendMin] = useState(0)
  const [legendMax, setLegendMax] = useState(100)

  useEffect(() => {
    fetchHeatmap().catch(() => null)
  }, [fetchHeatmap])

  useEffect(() => {
    if (error) {
      toast.error(error)
      clearError()
    }
  }, [error, clearError])

  const caliCenter: LatLngTuple = [3.4372, -76.5225]

  const densityStats = useMemo(() => {
    if (heatmap.length === 0) return { min: 0, max: 1 }
    let min = Number.POSITIVE_INFINITY
    let max = 0
    for (const c of heatmap) {
      const d = Number(c.densidad ?? 0)
      if (d < min) min = d
      if (d > max) max = d
    }
    return { min: Number.isFinite(min) ? min : 0, max: Math.max(max, 1) }
  }, [heatmap])

  useEffect(() => {
    // default legend window to full range
    setLegendMin(densityStats.min)
    setLegendMax(densityStats.max)
  }, [densityStats.min, densityStats.max])

  const filteredHeatmap = useMemo(() => {
    return heatmap.filter((c) => {
      const d = Number(c.densidad ?? 0)
      return d >= legendMin && d <= legendMax
    })
  }, [heatmap, legendMin, legendMax])

  const allPointsForFit = useMemo(() => {
    const pts: LatLngTuple[] = []
    for (const c of filteredHeatmap) pts.push([c.lat, c.lon])
    for (const r of predicted?.rutas ?? []) {
      pts.push([r.origen.lat, r.origen.lon], [r.destino.lat, r.destino.lon])
    }
    for (const p of predicted?.confluencias ?? []) pts.push([p.lat, p.lon])
    return pts
  }, [filteredHeatmap, predicted])

  const bounds = useMemo(() => getBoundsFromPoints(allPointsForFit), [allPointsForFit])

  const routesIntensity = useMemo(() => {
    const routes = predicted?.rutas ?? []
    let max = 1
    for (const r of routes) max = Math.max(max, Number(r.intensidad ?? 0))
    return { max }
  }, [predicted])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="animate-in">
        <h1 className="headline" style={{ fontSize: '40px' }}>
          Cartografía
        </h1>
        <p className="text-muted">
          Visualización geoespacial agregada (histórico y predicción). Tooltips y leyendas interactivas por celda.
        </p>
      </div>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 12,
          background: 'var(--color-white)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          padding: 14,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(260px, 1fr) minmax(260px, 1fr) minmax(260px, 1fr)',
            gap: 12,
            alignItems: 'end',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-dark)' }}>
              Heatmap (KDE) — rango de densidad
            </label>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
              Min {formatNumber(legendMin)} · Max {formatNumber(legendMax)} · Fuente: `/api/mapas/heatmap`
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-dark)' }}>
              Densidad mínima (filtrar)
            </label>
            <input
              type="range"
              min={densityStats.min}
              max={densityStats.max}
              step={Math.max((densityStats.max - densityStats.min) / 200, 0.0001)}
              value={legendMin}
              onChange={(e) => setLegendMin(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-dark)' }}>
              Densidad máxima (filtrar)
            </label>
            <input
              type="range"
              min={densityStats.min}
              max={densityStats.max}
              step={Math.max((densityStats.max - densityStats.min) / 200, 0.0001)}
              value={legendMax}
              onChange={(e) => setLegendMax(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 12,
            alignItems: 'end',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-dark)' }}>
              Rutas predichas — ejecución
            </label>
            <input
              value={selectedExecutionId}
              onChange={(e) => setSelectedExecutionId(e.target.value)}
              placeholder="ej: 2026-05-06T13-00Z / 12345"
              style={{
                width: '100%',
                marginTop: 6,
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid var(--color-border)',
                background: 'var(--color-input-bg)',
                outline: 'none',
              }}
            />
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
              Fuente: `/api/mapas/rutas/{'{ejecucion_id}'}`
            </p>
          </div>
          <button
            onClick={() => fetchPredictedRoutes().catch(() => null)}
            className="btn"
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid var(--color-border)',
              background: 'var(--color-dark)',
              color: 'white',
              fontWeight: 700,
              height: 42,
              opacity: isLoadingRoutes ? 0.7 : 1,
            }}
            disabled={isLoadingRoutes}
          >
            {isLoadingRoutes ? 'Cargando…' : 'Cargar rutas'}
          </button>
        </div>
      </section>

      <section
        style={{
          background: 'var(--color-white)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
        }}
      >
        <div style={{ height: 560, position: 'relative' }}>
          <MapContainer
            center={caliCenter}
            zoom={13}
            zoomControl={true}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', backgroundColor: '#0d1017' }}
            bounds={bounds ?? undefined}
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />

            {/* Heatmap KDE */}
            {filteredHeatmap.map((c, idx) => {
              const d = Number(c.densidad ?? 0)
              const ratio = (d - densityStats.min) / Math.max(densityStats.max - densityStats.min, 1e-9)
              const color = hslGreenToRed(ratio)
              const radius = 4 + ratio * 10
              return (
                <CircleMarker
                  key={`cell-${idx}`}
                  center={[c.lat, c.lon]}
                  radius={radius}
                  pathOptions={{
                    color: '#ffffff',
                    weight: 0.5,
                    opacity: 0.5,
                    fillColor: color,
                    fillOpacity: 0.75,
                  }}
                >
                  <LeafletTooltip sticky className="sim-tooltip">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <b>Celda (agregada)</b>
                      <span>Densidad: {formatNumber(d)}</span>
                      {c.conteo !== undefined && <span>Conteo: {formatNumber(Number(c.conteo))}</span>}
                      {c.periodo && <span>Periodo: {c.periodo}</span>}
                      <span>
                        Lat/Lon: {c.lat.toFixed(5)}, {c.lon.toFixed(5)}
                      </span>
                    </div>
                  </LeafletTooltip>
                </CircleMarker>
              )
            })}

            {/* Rutas predichas */}
            {(predicted?.rutas ?? []).map((r, idx) => {
              const intensity = Number(r.intensidad ?? 0)
              const ratio = intensity / Math.max(routesIntensity.max, 1)
              const stroke = hslGreenToRed(ratio)
              const weight = 2 + ratio * 5
              const pts: LatLngTuple[] = [
                [r.origen.lat, r.origen.lon],
                [r.destino.lat, r.destino.lon],
              ]
              return (
                <Polyline
                  key={`route-${idx}`}
                  positions={pts}
                  pathOptions={{ color: stroke, weight, opacity: 0.85 }}
                >
                  <LeafletTooltip sticky className="sim-tooltip">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <b>Ruta predicha</b>
                      <span>Intensidad: {formatNumber(intensity)}</span>
                      {r.etiqueta && <span>{r.etiqueta}</span>}
                      <span>
                        Origen: {r.origen.lat.toFixed(4)}, {r.origen.lon.toFixed(4)}
                      </span>
                      <span>
                        Destino: {r.destino.lat.toFixed(4)}, {r.destino.lon.toFixed(4)}
                      </span>
                    </div>
                  </LeafletTooltip>
                </Polyline>
              )
            })}

            {/* Puntos de confluencia */}
            {(predicted?.confluencias ?? []).map((p, idx) => {
              const intensity = Number(p.intensidad ?? 0)
              const ratio = intensity / Math.max(routesIntensity.max, 1)
              const color = hslGreenToRed(ratio)
              return (
                <CircleMarker
                  key={`conf-${idx}`}
                  center={[p.lat, p.lon]}
                  radius={6 + ratio * 8}
                  pathOptions={{
                    color: '#ffffff',
                    weight: 1,
                    opacity: 0.9,
                    fillColor: color,
                    fillOpacity: 0.9,
                  }}
                >
                  <LeafletTooltip sticky className="sim-tooltip">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <b>Confluencia</b>
                      <span>Intensidad: {formatNumber(intensity)}</span>
                      {p.etiqueta && <span>{p.etiqueta}</span>}
                      <span>
                        Lat/Lon: {p.lat.toFixed(4)}, {p.lon.toFixed(4)}
                      </span>
                    </div>
                  </LeafletTooltip>
                </CircleMarker>
              )
            })}
          </MapContainer>

          {/* overlay status */}
          {(isLoadingHeatmap || isLoadingRoutes) && (
            <div className="loading-overlay" style={{ backgroundColor: 'rgba(13,16,23,0.55)', color: 'white' }}>
              {isLoadingHeatmap ? 'Cargando heatmap…' : 'Cargando rutas…'}
            </div>
          )}
        </div>

        {/* Legend */}
        <div
          style={{
            padding: 12,
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 220,
                height: 10,
                borderRadius: 999,
                background: 'linear-gradient(90deg, hsl(120,85%,50%), hsl(60,85%,50%), hsl(0,85%,50%))',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
              title="Verde → Amarillo → Rojo"
            />
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Baja densidad → Alta densidad
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            Celdas: {filteredHeatmap.length} · Rutas: {(predicted?.rutas ?? []).length} · Confluencias:{' '}
            {(predicted?.confluencias ?? []).length}
          </div>
        </div>
      </section>
    </div>
  )
}

