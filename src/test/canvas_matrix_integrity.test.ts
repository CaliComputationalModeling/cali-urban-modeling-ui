import { describe, expect, it } from 'vitest'
import { colorForValue, rasterizeMatrixToRgba } from '@/features/simulation/components/CanvasGridOverlay'

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

  it('can mirror the matrix horizontally for west-east map alignment', () => {
    const matrix = [
      [0, 0, 100],
      [0, 0, 0],
      [0, 0, 0],
    ]

    const image = rasterizeMatrixToRgba(matrix, 100, 'density', 'mirrorX')
    const maxDensityColor = colorForValue(100, 100, 'density')

    expect(Array.from(image.data.slice(0, 4))).toEqual(maxDensityColor)
  })
})
