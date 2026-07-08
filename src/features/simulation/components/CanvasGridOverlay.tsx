import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { SimulationLayerMode } from '@/shared/contracts/simulation.contract'

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
}

export function colorForValue(
  rawValue: number,
  maxValue: number,
  layerMode: SimulationLayerMode,
): [number, number, number, number] {
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

function getProbabilityLabel(ratio: number): string {
  if (ratio >= 0.7) return 'Alta'
  if (ratio >= 0.35) return 'Media'
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
      const row = Math.floor(((shiftedBounds.north - lat) / (shiftedBounds.north - shiftedBounds.south)) * rows)
      const col = Math.floor(((lng - shiftedBounds.west) / (shiftedBounds.east - shiftedBounds.west)) * cols)
      const source = getSourceCell(row, col, rows, cols, orientation)
      const value = data[source.row]?.[source.col] ?? 0
      if (value <= 0) return

      const safeMax = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 1
      const ratio = Math.min(value / safeMax, 1)
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
  }, [bounds, data, enableProbabilityTooltip, layerMode, map, maxValue, offsetLat, offsetLon, orientation])

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

      const raster = rasterizeMatrixToRgba(data, maxValue, layerMode, orientation)
      const image = ctx.createImageData(cols, rows)
      image.data.set(raster.data)
      ctx.putImageData(image, 0, 0)
    })
  }, [data, dataVersion, maxValue, layerMode, orientation])

  return null
}
