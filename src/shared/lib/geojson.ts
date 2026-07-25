import type {
  Feature,
  FeatureCollection,
  GeoJsonObject,
  Geometry,
  GeometryCollection,
  MultiPolygon,
  Polygon,
  Position,
} from 'geojson'

type LatLon = [number, number]

function isPointOnSegment(lng: number, lat: number, start: Position, end: Position): boolean {
  const [x1, y1] = start
  const [x2, y2] = end
  const cross = (lng - x1) * (y2 - y1) - (lat - y1) * (x2 - x1)
  if (Math.abs(cross) > 1e-10) return false

  const minLng = Math.min(x1, x2) - 1e-10
  const maxLng = Math.max(x1, x2) + 1e-10
  const minLat = Math.min(y1, y2) - 1e-10
  const maxLat = Math.max(y1, y2) + 1e-10
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat
}

function isLngLatInRing(lng: number, lat: number, ring: Position[]): boolean {
  let inside = false

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const current = ring[i]
    const previous = ring[j]
    if (isPointOnSegment(lng, lat, previous, current)) return true

    const [xi, yi] = current
    const [xj, yj] = previous
    const crosses = yi > lat !== yj > lat
    if (crosses && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }

  return inside
}

function isLngLatInPolygon(lng: number, lat: number, polygon: Polygon['coordinates']): boolean {
  const [outerRing, ...holes] = polygon
  if (!outerRing || !isLngLatInRing(lng, lat, outerRing)) return false
  return !holes.some((hole) => isLngLatInRing(lng, lat, hole))
}

function geometryContainsLatLon(geometry: Geometry | null, lat: number, lon: number): boolean {
  if (!geometry) return false

  if (geometry.type === 'Polygon') {
    return isLngLatInPolygon(lon, lat, (geometry as Polygon).coordinates)
  }

  if (geometry.type === 'MultiPolygon') {
    return (geometry as MultiPolygon).coordinates.some((polygon) => isLngLatInPolygon(lon, lat, polygon))
  }

  if (geometry.type === 'GeometryCollection') {
    return (geometry as GeometryCollection).geometries.some((child) => geometryContainsLatLon(child, lat, lon))
  }

  return false
}

export function geoJsonContainsLatLon(geojson: GeoJsonObject | null, lat: number, lon: number): boolean {
  if (!geojson || !Number.isFinite(lat) || !Number.isFinite(lon)) return false

  if (geojson.type === 'FeatureCollection') {
    return (geojson as FeatureCollection).features.some((feature) => geometryContainsLatLon(feature.geometry, lat, lon))
  }

  if (geojson.type === 'Feature') {
    return geometryContainsLatLon((geojson as Feature).geometry, lat, lon)
  }

  return geometryContainsLatLon(geojson as Geometry, lat, lon)
}

export function filterLatLonInsideGeoJson<T>(
  items: T[],
  geojson: GeoJsonObject | null,
  getLatLon: (item: T) => LatLon,
): T[] {
  if (!geojson) return []
  return items.filter((item) => {
    const [lat, lon] = getLatLon(item)
    return geoJsonContainsLatLon(geojson, lat, lon)
  })
}

/**
 * Convierte un WKT (POLYGON) en `Geometry` GeoJSON (lon, lat).
 * Acepta el prefijo SRID=4326;... de PostGIS y devuelve null si no parsea.
 */
export function wktToGeoJsonGeometry(wkt: string): Geometry | null {
  if (!wkt) return null
  let body = wkt.trim()
  const semi = body.indexOf(';')
  if (semi > 0 && /SRID=\d+/i.test(body.slice(0, semi))) body = body.slice(semi + 1)

  if (/^POLYGON\s*\(/i.test(body)) {
    const rings = parseParens(body.replace(/^POLYGON\s*/i, ''))
    if (!rings) return null
    return { type: 'Polygon', coordinates: rings }
  }
  if (/^MULTIPOLYGON\s*\(/i.test(body)) {
    const bodyNoPrefix = body.replace(/^MULTIPOLYGON\s*/i, '')
    if (!bodyNoPrefix.startsWith('(') || !bodyNoPrefix.endsWith(')')) return null
    const inner = bodyNoPrefix.slice(1, -1)
    const polyStrs = splitTopLevel(inner, ',')
    const polys: Position[][][] = []
    for (const ps of polyStrs) {
      const rings = parseParens(ps.trim())
      if (!rings) return null
      polys.push(rings)
    }
    return { type: 'MultiPolygon', coordinates: polys }
  }
  return null
}

function parseTuple(t: string): Position | null {
  const nums = t.trim().split(/\s+/).map(Number)
  if (nums.length < 2 || nums.some((n) => !Number.isFinite(n))) return null
  return [nums[0], nums[1]]
}

function splitTopLevel(input: string, sep: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of input) {
    if (ch === '(') depth++
    else if (ch === ')') depth--
    if (ch === sep && depth === 0) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  if (cur.trim()) out.push(cur)
  return out
}

function parseRing(s: string): Position[] | null {
  const inner = s.trim().replace(/^\(/, '').replace(/\)$/, '')
  const tuples = splitTopLevel(inner, ',')
  const coords: Position[] = []
  for (const t of tuples) {
    const p = parseTuple(t)
    if (!p) return null
    coords.push(p)
  }
  return coords
}

function parseParens(body: string): Position[][] | null {
  if (!body.startsWith('(') || !body.endsWith(')')) return null
  const inner = body.slice(1, -1)
  const ringStrs = splitTopLevel(inner, ',')
  const rings: Position[][] = []
  for (const rs of ringStrs) {
    const ring = parseRing(rs)
    if (!ring) return null
    rings.push(ring)
  }
  return rings
}

export interface WktToFeatureOptions {
  properties?: GeoJsonProperties
}

/** Helper: WKT → Feature<Polygon | MultiPolygon> */
export function wktToFeature(wkt: string, options: WktToFeatureOptions = {}): Feature<Geometry> | null {
  const geometry = wktToGeoJsonGeometry(wkt)
  if (!geometry) return null
  return { type: 'Feature', properties: options.properties ?? {}, geometry }
}

export function wktCollectionToFeatureCollection(
  wkts: string[],
  baseProperties: GeoJsonProperties = {},
): FeatureCollection {
  const features: Feature<Geometry>[] = []
  for (let i = 0; i < wkts.length; i++) {
    const feature = wktToFeature(wkts[i], { properties: { ...baseProperties, idx: i } })
    if (feature) features.push(feature)
  }
  return { type: 'FeatureCollection', features }
}
