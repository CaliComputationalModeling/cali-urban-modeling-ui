import { describe, expect, it } from 'vitest'
import {
  bucketFor,
  colorForBucket,
  colorForValueHeatmapP95,
  percentile95,
  rasterizeDiscrete,
  DISCRETE_THRESHOLDS,
} from '@/features/simulation/components/CanvasGridOverlay'
import { wktCollectionToFeatureCollection, wktToGeoJsonGeometry } from '@/shared/lib/geojson'

describe('percentile95', () => {
  it('returns 0 for empty matrix', () => {
    expect(percentile95([])).toBe(0)
  })

  it('skips zeros and non-finite values', () => {
    expect(percentile95([[0, 0, 0, 0]])).toBe(0)
  })

  it('returns the 95th percentile of positive values', () => {
    const matrix = [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    ]
    const p = percentile95(matrix)
    expect(p).toBeGreaterThanOrEqual(19)
    expect(p).toBeLessThanOrEqual(20)
  })

  it('ignora valores negativos y ceros', () => {
    const p = percentile95([
      [-10, -5, 0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    ])
    // 10 valores válidos: idx = floor(0.95*9)=8 → valor en posición 8 = 90
    expect(p).toBeGreaterThanOrEqual(90)
  })
})

describe('colorForValueHeatmapP95', () => {
  it('returns transparent for near-zero values', () => {
    expect(colorForValueHeatmapP95(0, 100)).toEqual([0, 0, 0, 0])
  })

  it('uses p95 instead of absolute max for ratio', () => {
    const cLow = colorForValueHeatmapP95(50, 100)
    const cHigh = colorForValueHeatmapP95(150, 100)
    // Above p95 caps ratio at 1
    expect(cHigh[3]).toBeGreaterThanOrEqual(cLow[3])
  })

  it('falls back to alpha 0 if p95 invalid', () => {
    const c = colorForValueHeatmapP95(10, 0)
    expect(c[3]).toBeGreaterThan(0)
  })
})

describe('bucketFor', () => {
  it('classifies empty / low / mid / high', () => {
    expect(bucketFor(0)).toBe('empty')
    expect(bucketFor(DISCRETE_THRESHOLDS.mid - 0.01)).toBe('low')
    expect(bucketFor(DISCRETE_THRESHOLDS.mid)).toBe('mid')
    expect(bucketFor(DISCRETE_THRESHOLDS.high)).toBe('high')
    expect(bucketFor(1.5)).toBe('high')
  })

  it('colorForBucket is alpha 0 for empty', () => {
    expect(colorForBucket('empty')[3]).toBe(0)
  })
})

describe('rasterizeDiscrete', () => {
  it('produces HxW ImageData with discrete buckets', () => {
    const m = [
      [0.0, 0.1, 0.5, 1.0],
      [0.0, 0.0, 0.36, 0.71],
    ]
    const img = rasterizeDiscrete(m)
    expect(img.width).toBe(4)
    expect(img.height).toBe(2)
    // bucket empty → alpha 0
    expect(img.data[3]).toBe(0)
    // bucket high → alpha 220
    const highIndex = (0 * 4 + 3) * 4
    expect(img.data[highIndex + 3]).toBe(220)
  })
})

describe('wktToGeoJsonGeometry', () => {
  it('parses POLYGON with one ring', () => {
    const g = wktToGeoJsonGeometry(
      'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))',
    )
    expect(g?.type).toBe('Polygon')
    if (g?.type === 'Polygon') {
      expect(g.coordinates[0]).toHaveLength(5)
    }
  })

  it('parses POLYGON with two rings (outer + hole)', () => {
    const g = wktToGeoJsonGeometry(
      'POLYGON((0 0, 10 0, 10 10, 0 10, 0 0), (2 2, 8 2, 8 8, 2 8, 2 2))',
    )
    expect(g?.type).toBe('Polygon')
    if (g?.type === 'Polygon') {
      expect(g.coordinates).toHaveLength(2)
    }
  })

  it('parses MULTIPOLYGON with multiple polygons', () => {
    const g = wktToGeoJsonGeometry(
      'MULTIPOLYGON(((0 0, 1 0, 1 1, 0 1, 0 0)), ((2 2, 3 2, 3 3, 2 3, 2 2)))',
    )
    expect(g?.type).toBe('MultiPolygon')
    if (g?.type === 'MultiPolygon') {
      expect(g.coordinates).toHaveLength(2)
    }
  })

  it('strips SRID=4326; prefix', () => {
    const g = wktToGeoJsonGeometry('SRID=4326;POLYGON((0 0, 1 0, 1 1, 0 0))')
    expect(g?.type).toBe('Polygon')
  })

  it('returns null for invalid input', () => {
    expect(wktToGeoJsonGeometry('')).toBeNull()
    expect(wktToGeoJsonGeometry('POINT (0 0)')).toBeNull()
  })
})

describe('wktCollectionToFeatureCollection', () => {
  it('builds a FeatureCollection of polygons', () => {
    const fc = wktCollectionToFeatureCollection([
      'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))',
      'POLYGON((2 2, 3 2, 3 3, 2 3, 2 2))',
    ])
    expect(fc.type).toBe('FeatureCollection')
    expect(fc.features).toHaveLength(2)
  })

  it('skips invalid WKTs', () => {
    const fc = wktCollectionToFeatureCollection([
      'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))',
      'INVALID',
    ])
    expect(fc.features).toHaveLength(1)
  })
})
