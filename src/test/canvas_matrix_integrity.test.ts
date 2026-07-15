import { describe, expect, it } from 'vitest'
import { colorForValue, projectAttractorToCanvas, rasterizeMatrixToRgba } from '@/features/simulation/components/CanvasGridOverlay'

describe('backend matrix to canvas ImageData projection', () => {
  it('keeps NumPy [row][col] order as JS y * width + x without transposition', () => {
    const matrix = [
      [100, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]

    const image = rasterizeMatrixToRgba(matrix, 100, 'density')
    const maxDensityColor = colorForValue(100, 100, 'density')
    const transparentColor = colorForValue(0, 100, 'density')

    expect(image.width).toBe(3)
    expect(image.height).toBe(3)
    expect(Array.from(image.data.slice(0, 4))).toEqual(maxDensityColor)

    const northEastIndex = (0 * image.width + 1) * 4
    const southWestIndex = (1 * image.width + 0) * 4
    expect(Array.from(image.data.slice(northEastIndex, northEastIndex + 4))).toEqual(transparentColor)
    expect(Array.from(image.data.slice(southWestIndex, southWestIndex + 4))).toEqual(transparentColor)
  })

  it('flips backend south-first rows vertically while preserving west-east alignment', () => {
    const matrix = [
      [100, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]

    const image = rasterizeMatrixToRgba(matrix, 100, 'density', 'mirrorY')
    const maxDensityColor = colorForValue(100, 100, 'density')

    const southWestIndex = (2 * image.width) * 4
    expect(Array.from(image.data.slice(southWestIndex, southWestIndex + 4))).toEqual(maxDensityColor)
  })

  it('projects geographic attractors with north at canvas y=0', () => {
    const bounds = { north: 3.6, south: 3.3, west: -76.6, east: -76.45 }

    expect(projectAttractorToCanvas({ lat: 3.6, lon: -76.6 }, bounds, 300, 600)).toEqual({ x: 0, y: 0 })
    expect(projectAttractorToCanvas({ lat: 3.3, lon: -76.45 }, bounds, 300, 600)).toEqual({ x: 300, y: 600 })
  })
})
