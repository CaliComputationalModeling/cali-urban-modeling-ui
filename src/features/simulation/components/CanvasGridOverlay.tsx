import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { SimulationLayerMode } from '@/shared/contracts/simulation.contract'
import type { Geometry } from 'geojson'
import { wktCollectionToFeatureCollection } from '@/shared/lib/geojson'

export interface GridBounds {
  north: number
  south: number
  west: number
  east: number
}

type MatrixOrientation = 'normal' | 'rotate180' | 'mirrorX' | 'mirrorY'

interface CanvasGridOverlayProps {
  bounds: GridBounds
  data: number[][] | null
  layerMode: SimulationLayerMode
  dataVersion: number
  maxValue?: number
  enableProbabilityTooltip?: boolean
  orientation?: MatrixOrientation
  offsetLat?: number
  offsetLon?: number
  useP95?: boolean
  fixedReference?: number
}

export interface GeoreferencedAttractor {
  tipo: string
  lat: number
  lon: number
  activo?: boolean
}

interface AttractorCanvasOverlayProps {
  bounds: GridBounds
  attractors: GeoreferencedAttractor[]
  visible: boolean
}

interface DiscreteGridOverlayProps {
  bounds: GridBounds
  data: number[][] | null
  visible: boolean
  dataVersion: number
  orientation?: MatrixOrientation
  offsetLat?: number
  offsetLon?: number
  fixedReference?: number
  enableTooltip?: boolean
}

const ATTRACTOR_EMOJIS: Record<string, string> = {
  fachadas_ciegas: '🧱',
  vias_deterioradas: '🚧',
  residuos: '🗑️',
  deficiencia_iluminacion: '💡',
  cai_policial: '👮',
  guardia_seguridad: '🛡️',
}

export function colorForValue(
  rawValue: number,
  maxValue: number,
  layerMode: SimulationLayerMode,
): [number, number, number, alpha: number] {
  if (rawValue <= 0.001) return [0, 0, 0, 0]

  const safeMax = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 1
  const ratio = Math.min(rawValue / safeMax, 1)

  if (layerMode === 'density') {
    const alpha = Math.round((0.15 + ratio * 0.8) * 255)

    if (ratio < 0.3) {
      return [254, 240, 138, Math.min(alpha, 130)]
    }
    if (ratio < 0.65) {
      return [249, 115, 22, Math.min(alpha, 200)]
    }
    return [185, 28, 28, Math.min(alpha, 242)]
  }

  const alpha = Math.round((0.2 + ratio * 0.75) * 255)

  if (ratio < 0.4) {
    return [96, 165, 250, Math.min(alpha, 100)]
  }
  if (ratio < 0.75) {
    return [139, 92, 246, Math.min(alpha, 190)]
  }
  return [168, 85, 247, Math.min(alpha, 240)]
}

/**
 * Percentil 95 sobre una matriz densa (computa percentil en orden O(n)).
 * Retorna 0 si no hay datos válidos.
 */
export function percentile95(matrix: number[][]): number {
  if (!matrix || matrix.length === 0) return 0
  const flat: number[] = []
  for (const row of matrix) {
    if (!row) continue
    for (const v of row) {
      if (Number.isFinite(v) && v > 0) flat.push(v)
    }
  }
  if (flat.length === 0) return 0
  flat.sort((a, b) => a - b)
  const idx = Math.min(flat.length - 1, Math.floor(0.95 * (flat.length - 1)))
  return flat[idx]
}

/** Heatmap continuo normalizado al percentil 95 (no al máximo absoluto). */
export function colorForValueHeatmapP95(
  rawValue: number,
  p95: number,
): [number, number, number, number] {
  if (rawValue <= 0.001) return [0, 0, 0, 0]
  const safeP95 = Number.isFinite(p95) && p95 > 0 ? p95 : 1
  const ratio = Math.min(rawValue / safeP95, 1)
  const alpha = Math.round((0.18 + ratio * 0.75) * 255)
  if (ratio < 0.4) return [254, 240, 138, Math.min(alpha, 130)]
  if (ratio < 0.75) return [249, 115, 22, Math.min(alpha, 200)]
  return [185, 28, 28, Math.min(alpha, 242)]
}

/**
 * Umbral mínimo para considerar una celda como "ocupada" en la capa discreta.
 */
export const DISCRETE_THRESHOLDS = {
  empty: 0,
  low: 0.001,
} as const

function getSourceCell(
  displayRow: number,
  displayCol: number,
  height: number,
  width: number,
  orientation: MatrixOrientation,
) {
  if (orientation === 'rotate180') {
    return { row: height - 1 - displayRow, col: width - 1 - displayCol }
  }
  if (orientation === 'mirrorX') {
    return { row: displayRow, col: width - 1 - displayCol }
  }
  if (orientation === 'mirrorY') {
    return { row: height - 1 - displayRow, col: displayCol }
  }

  return { row: displayRow, col: displayCol }
}

export function rasterizeMatrixToRgba(
  matrix: number[][],
  maxValue: number,
  layerMode: SimulationLayerMode,
  orientation: MatrixOrientation = 'normal',
) {
  const height = matrix.length
  const width = matrix[0]?.length ?? 0
  const rgba = new Uint8ClampedArray(width * height * 4)

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const index = (row * width + col) * 4
      const source = getSourceCell(row, col, height, width, orientation)
      const rawValue = matrix[source.row]?.[source.col] ?? 0
      const [r, g, b, a] = colorForValue(rawValue, maxValue, layerMode)
      rgba[index] = r
      rgba[index + 1] = g
      rgba[index + 2] = b
      rgba[index + 3] = a
    }
  }

  return { width, height, data: rgba }
}

/**
 * Heatmap continuo normalizado al percentil 95 (no al máximo absoluto).
 * Usado por la capa "heatmap" para evitar que el AC pinte todo en rojo.
 */
export function rasterizeHeatmapP95(
  matrix: number[][],
  orientation: MatrixOrientation = 'normal',
  fixedReference?: number,
) {
  const height = matrix.length
  const width = matrix[0]?.length ?? 0
  const rgba = new Uint8ClampedArray(width * height * 4)
  const p95 = fixedReference && fixedReference > 0 ? fixedReference : percentile95(matrix)

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const index = (row * width + col) * 4
      const source = getSourceCell(row, col, height, width, orientation)
      const rawValue = matrix[source.row]?.[source.col] ?? 0
      const [r, g, b, a] = colorForValueHeatmapP95(rawValue, p95)
      rgba[index] = r
      rgba[index + 1] = g
      rgba[index + 2] = b
      rgba[index + 3] = a
    }
  }

  return { width, height, data: rgba, p95 }
}

function getProbabilityLabel(ratio: number): string {
  if (ratio >= 0.66) return 'Alta'
  if (ratio >= 0.33) return 'Media'
  return 'Baja'
}

function applyBoundsOffset(bounds: GridBounds, offsetLat: number, offsetLon: number): GridBounds {
  return {
    north: bounds.north + offsetLat,
    south: bounds.south + offsetLat,
    west: bounds.west + offsetLon,
    east: bounds.east + offsetLon,
  }
}

export function projectAttractorToCanvas(
  attractor: Pick<GeoreferencedAttractor, 'lat' | 'lon'>,
  bounds: GridBounds,
  width: number,
  height: number,
) {
  const x = ((attractor.lon - bounds.west) / (bounds.east - bounds.west)) * width
  const y = ((bounds.north - attractor.lat) / (bounds.north - bounds.south)) * height
  return { x, y }
}

export function drawAttractors(
  ctx: CanvasRenderingContext2D,
  attractors: GeoreferencedAttractor[],
  bounds: GridBounds,
  width: number,
  height: number,
) {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '22px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'

  for (const attractor of attractors) {
    if (attractor.activo === false || !Number.isFinite(attractor.lat) || !Number.isFinite(attractor.lon)) continue
    if (attractor.lat < bounds.south || attractor.lat > bounds.north || attractor.lon < bounds.west || attractor.lon > bounds.east) continue

    const { x, y } = projectAttractorToCanvas(attractor, bounds, width, height)
    ctx.beginPath()
    ctx.arc(x, y, 15, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillText(ATTRACTOR_EMOJIS[attractor.tipo] ?? '📍', x, y + 1)
  }
}

export const AttractorCanvasOverlay = ({ bounds, attractors, visible }: AttractorCanvasOverlayProps) => {
  const map = useMap()

  useEffect(() => {
    if (!visible) return

    const canvas = document.createElement('canvas')
    canvas.dataset.testid = 'physical-attractors-canvas'
    canvas.style.position = 'absolute'
    canvas.style.pointerEvents = 'none'
    canvas.style.zIndex = '550'
    map.getPanes().overlayPane.appendChild(canvas)

    const render = () => {
      const northWest = map.latLngToLayerPoint([bounds.north, bounds.west])
      const southEast = map.latLngToLayerPoint([bounds.south, bounds.east])
      const width = Math.max(1, Math.round(Math.abs(southEast.x - northWest.x)))
      const height = Math.max(1, Math.round(Math.abs(southEast.y - northWest.y)))
      canvas.style.transform = `translate3d(${Math.min(northWest.x, southEast.x)}px, ${Math.min(northWest.y, southEast.y)}px, 0)`
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      const pixelRatio = window.devicePixelRatio || 1
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(pixelRatio, pixelRatio)
      drawAttractors(ctx, attractors, bounds, width, height)
    }

    render()
    map.on('zoom move resize', render)
    return () => {
      map.off('zoom move resize', render)
      canvas.remove()
    }
  }, [attractors, bounds, map, visible])

  return null
}

export const CanvasGridOverlay = ({
  bounds,
  data,
  layerMode,
  dataVersion,
  maxValue = 1,
  enableProbabilityTooltip = false,
  orientation = 'normal',
  offsetLat = 0,
  offsetLon = 0,
  useP95 = true,
  fixedReference,
}: CanvasGridOverlayProps) => {
  const map = useMap()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.dataset.testid = 'simulation-heatmap-canvas'
    canvas.style.position = 'absolute'
    canvas.style.pointerEvents = 'none'
    canvas.style.imageRendering = 'pixelated'
    canvas.style.zIndex = '350'
    canvasRef.current = canvas
    map.getPanes().overlayPane.appendChild(canvas)

    const updatePosition = () => {
      const shiftedBounds = applyBoundsOffset(bounds, offsetLat, offsetLon)
      const northWest = map.latLngToLayerPoint([shiftedBounds.north, shiftedBounds.west])
      const southEast = map.latLngToLayerPoint([shiftedBounds.south, shiftedBounds.east])
      const width = Math.max(1, Math.abs(southEast.x - northWest.x))
      const height = Math.max(1, Math.abs(southEast.y - northWest.y))
      canvas.style.transform = `translate3d(${Math.min(northWest.x, southEast.x)}px, ${Math.min(northWest.y, southEast.y)}px, 0)`
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
    }

    updatePosition()
    map.on('zoom move resize', updatePosition)

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      map.off('zoom move resize', updatePosition)
      canvas.remove()
      canvasRef.current = null
    }
  }, [bounds, map, offsetLat, offsetLon])

  useEffect(() => {
    if (!enableProbabilityTooltip || layerMode !== 'density') return

    const handleClick = (event: L.LeafletMouseEvent) => {
      if (!data || data.length === 0 || (data[0]?.length ?? 0) === 0) return
      const shiftedBounds = applyBoundsOffset(bounds, offsetLat, offsetLon)
      const { lat, lng } = event.latlng
      if (lat > shiftedBounds.north || lat < shiftedBounds.south || lng < shiftedBounds.west || lng > shiftedBounds.east) return

      const rows = data.length
      const cols = data[0]?.length ?? 0
      const row = Math.min(rows - 1, Math.floor(((shiftedBounds.north - lat) / (shiftedBounds.north - shiftedBounds.south)) * rows))
      const col = Math.min(cols - 1, Math.floor(((lng - shiftedBounds.west) / (shiftedBounds.east - shiftedBounds.west)) * cols))
      const source = getSourceCell(row, col, rows, cols, orientation)
      const value = data[source.row]?.[source.col] ?? 0
      if (value <= 0) return

      const p95 = fixedReference && fixedReference > 0 ? fixedReference : percentile95(data)
      const safeP95 = p95 > 0 ? p95 : 1
      const ratio = Math.min(value / safeP95, 1)
      const probability = Math.round(ratio * 100)
      L.popup({ className: 'probability-popup' })
        .setLatLng(event.latlng)
        .setContent(`Probabilidad de avistamiento: ${getProbabilityLabel(ratio)} (${probability}%)`)
        .openOn(map)
    }

    map.on('click', handleClick)
    return () => {
      map.off('click', handleClick)
    }
  }, [bounds, data, enableProbabilityTooltip, fixedReference, layerMode, map, maxValue, offsetLat, offsetLon, orientation])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      const ctx = canvas.getContext('2d', { alpha: true })
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (!data || data.length === 0 || (data[0]?.length ?? 0) === 0) {
        return
      }

      const rows = data.length
      const cols = data[0]?.length ?? 0
      canvas.width = cols
      canvas.height = rows
      ctx.imageSmoothingEnabled = false

      const raster = useP95
        ? rasterizeHeatmapP95(data, orientation, fixedReference)
        : rasterizeMatrixToRgba(data, maxValue, layerMode, orientation)
      const image = ctx.createImageData(cols, rows)
      image.data.set(raster.data)
      ctx.putImageData(image, 0, 0)
    })
  }, [data, dataVersion, fixedReference, maxValue, layerMode, orientation, useP95])

  return null
}

/**
 * Capa DISCRETA del autómata — pintada sobre las geometrías reales de celda
 * (WKT, desde Etapa 1). Independiente del heatmap; se puede mostrar/ocultar.
 * Si no hay geometrías, cae al render matricial (pixel-aligned).
 */
export const DiscreteGridOverlay = ({
  bounds,
  data,
  visible,
  dataVersion,
  orientation = 'normal',
  offsetLat = 0,
  offsetLon = 0,
  fixedReference,
  enableTooltip = false,
  cellGeometries,
}: DiscreteGridOverlayProps & { cellGeometries?: string[] }) => {
  const map = useMap()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!visible) return
    const canvas = document.createElement('canvas')
    canvas.dataset.testid = 'automata-discrete-canvas'
    canvas.style.position = 'absolute'
    canvas.style.pointerEvents = 'none'
    canvas.style.zIndex = '450'
    canvasRef.current = canvas
    map.getPanes().overlayPane.appendChild(canvas)

    const updatePosition = () => {
      const shiftedBounds = applyBoundsOffset(bounds, offsetLat, offsetLon)
      const northWest = map.latLngToLayerPoint([shiftedBounds.north, shiftedBounds.west])
      const southEast = map.latLngToLayerPoint([shiftedBounds.south, shiftedBounds.east])
      const width = Math.max(1, Math.abs(southEast.x - northWest.x))
      const height = Math.max(1, Math.abs(southEast.y - northWest.y))
      canvas.style.transform = `translate3d(${Math.min(northWest.x, southEast.x)}px, ${Math.min(northWest.y, southEast.y)}px, 0)`
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
    }
    updatePosition()
    map.on('zoom move resize', updatePosition)
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      map.off('zoom move resize', updatePosition)
      canvas.remove()
      canvasRef.current = null
    }
  }, [bounds, map, offsetLat, offsetLon, visible])

  useEffect(() => {
    if (!visible) return
    const canvas = canvasRef.current
    if (!canvas) return
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      const ctx = canvas.getContext('2d', { alpha: true })
      if (!ctx) return
      const shiftedBounds = applyBoundsOffset(bounds, offsetLat, offsetLon)
      const northWest = map.latLngToLayerPoint([shiftedBounds.north, shiftedBounds.west])
      const southEast = map.latLngToLayerPoint([shiftedBounds.south, shiftedBounds.east])
      const width = Math.max(1, Math.abs(southEast.x - northWest.x))
      const height = Math.max(1, Math.abs(southEast.y - northWest.y))
      canvas.width = width
      canvas.height = height
      ctx.clearRect(0, 0, width, height)
      if (!data || data.length === 0) return

      const rows = data.length
      const cols = data[0]?.length ?? 0

      // Modo 1: geometrías reales de celda — dibujar puntos fosforescentes
      if (cellGeometries && cellGeometries.length === rows * cols) {
        const featureCollection = wktCollectionToFeatureCollection(cellGeometries)
        let maxVal = fixedReference && fixedReference > 0 ? fixedReference : 0
        if (!fixedReference || fixedReference <= 0) {
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const v = data[r]?.[c] ?? 0
              if (v > maxVal) maxVal = v
            }
          }
        }
        if (maxVal < 1e-9) return

        ctx.save()
        for (let idx = 0; idx < featureCollection.features.length; idx++) {
          const feat = featureCollection.features[idx]
          if (!feat.geometry) continue
          const row = Math.floor(idx / cols)
          const col = idx % cols
          const source = getSourceCell(row, col, rows, cols, orientation)
          const rawValue = data[source.row]?.[source.col] ?? 0
          if (rawValue <= DISCRETE_THRESHOLDS.low) continue

          const ratio = Math.min(rawValue / maxVal, 1)
          const centroid = geometryCentroid(feat.geometry)
          if (!centroid) continue

          const shifted = applyBoundsOffset(bounds, offsetLat, offsetLon)
          const pt = map.latLngToLayerPoint([centroid[1], centroid[0]])
          const northWest = map.latLngToLayerPoint([shifted.north, shifted.west])
          const southEast = map.latLngToLayerPoint([shifted.south, shifted.east])
          const canvasOriginX = Math.min(northWest.x, southEast.x)
          const canvasOriginY = Math.min(northWest.y, southEast.y)
          const x = pt.x - canvasOriginX
          const y = pt.y - canvasOriginY

          const radius = 1.5 + ratio * 3.5
          const alpha = 0.5 + ratio * 0.5

          ctx.shadowColor = ratio > 0.6 ? '#00ffcc' : '#22d3ee'
          ctx.shadowBlur = 6 + ratio * 8

          ctx.beginPath()
          ctx.arc(x, y, radius, 0, Math.PI * 2)
          ctx.fillStyle = ratio > 0.6
            ? `rgba(0, 255, 204, ${alpha})`
            : ratio > 0.3
            ? `rgba(34, 211, 238, ${alpha})`
            : `rgba(103, 232, 249, ${alpha * 0.7})`
          ctx.fill()
        }
        ctx.restore()
        return
      }

      // Modo 2 (fallback): puntos fosforescentes pixel-aligned
      let maxVal = fixedReference && fixedReference > 0 ? fixedReference : 0
      if (!fixedReference || fixedReference <= 0) {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const v = data[r]?.[c] ?? 0
            if (v > maxVal) maxVal = v
          }
        }
      }
      if (maxVal < 1e-9) return

      const cellW = width / cols
      const cellH = height / rows
      ctx.save()
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const source = getSourceCell(row, col, rows, cols, orientation)
          const rawValue = data[source.row]?.[source.col] ?? 0
          if (rawValue <= DISCRETE_THRESHOLDS.low) continue

          const ratio = Math.min(rawValue / maxVal, 1)
          const cx = (col + 0.5) * cellW
          const cy = (row + 0.5) * cellH
          const radius = Math.max(1, Math.min(cellW, cellH) * (0.2 + ratio * 0.35))
          const alpha = 0.5 + ratio * 0.5

          ctx.shadowColor = ratio > 0.6 ? '#00ffcc' : '#22d3ee'
          ctx.shadowBlur = 4 + ratio * 6

          ctx.beginPath()
          ctx.arc(cx, cy, radius, 0, Math.PI * 2)
          ctx.fillStyle = ratio > 0.6
            ? `rgba(0, 255, 204, ${alpha})`
            : ratio > 0.3
            ? `rgba(34, 211, 238, ${alpha})`
            : `rgba(103, 232, 249, ${alpha * 0.7})`
          ctx.fill()
        }
      }
      ctx.restore()
    })
  }, [bounds, cellGeometries, data, dataVersion, fixedReference, map, offsetLat, offsetLon, orientation, visible])

  useEffect(() => {
    if (!visible || !enableTooltip) return

    const tooltip = L.tooltip({
      permanent: false,
      direction: 'top',
      className: 'probability-popup',
      offset: [0, -10],
    })

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      if (!data || data.length === 0 || (data[0]?.length ?? 0) === 0) return
      const shiftedBounds = applyBoundsOffset(bounds, offsetLat, offsetLon)
      const { lat, lng } = e.latlng
      if (lat > shiftedBounds.north || lat < shiftedBounds.south || lng < shiftedBounds.west || lng > shiftedBounds.east) {
        tooltip.remove()
        return
      }

      const rows = data.length
      const cols = data[0]?.length ?? 0
      const row = Math.min(rows - 1, Math.floor(((shiftedBounds.north - lat) / (shiftedBounds.north - shiftedBounds.south)) * rows))
      const col = Math.min(cols - 1, Math.floor(((lng - shiftedBounds.west) / (shiftedBounds.east - shiftedBounds.west)) * cols))
      const source = getSourceCell(row, col, rows, cols, orientation)
      const value = data[source.row]?.[source.col] ?? 0
      if (value <= 0) {
        tooltip.remove()
        return
      }

      const p95 = fixedReference && fixedReference > 0 ? fixedReference : percentile95(data)
      const safeP95 = p95 > 0 ? p95 : 1
      const ratio = Math.min(value / safeP95, 1)
      const probability = Math.round(ratio * 100)
      tooltip.setLatLng(e.latlng)
      tooltip.setContent(`Probabilidad de avistamiento: ${getProbabilityLabel(ratio)} (${probability}%)`)
      tooltip.addTo(map)
    }

    map.on('mousemove', handleMouseMove)
    return () => {
      map.off('mousemove', handleMouseMove)
      tooltip.remove()
    }
  }, [bounds, data, enableTooltip, fixedReference, map, offsetLat, offsetLon, orientation, visible])

  return null
}

function geometryCentroid(geometry: Geometry): [number, number] | null {
  const coords: number[][] = []
  const collectCoords = (ring: number[][]) => {
    if (!ring) return
    for (const pt of ring) coords.push(pt)
  }
  if (geometry.type === 'Polygon') {
    for (const ring of geometry.coordinates) collectCoords(ring as number[][])
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) for (const ring of poly) collectCoords(ring as number[][])
  } else if (geometry.type === 'Point') {
    return [geometry.coordinates[0], geometry.coordinates[1]]
  } else {
    return null
  }
  if (coords.length === 0) return null
  const sumLng = coords.reduce((s, c) => s + c[0], 0)
  const sumLat = coords.reduce((s, c) => s + c[1], 0)
  return [sumLng / coords.length, sumLat / coords.length]
}
