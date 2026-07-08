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
