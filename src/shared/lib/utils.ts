import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert grid (i,j) indices to latitude/longitude within a bounding box.
// i: row index (0 = top), j: column index (0 = left)
export function gridIndexToLatLon(i: number, j: number, rows: number, cols: number, bbox?: { lat_min: number; lat_max: number; lon_min: number; lon_max: number }) {
  // Default bounding box: Cali
  const box = bbox ?? { lat_min: 3.30, lat_max: 3.60, lon_min: -76.60, lon_max: -76.45 }

  const latRange = box.lat_max - box.lat_min
  const lonRange = box.lon_max - box.lon_min

  const latStep = latRange / rows
  const lonStep = lonRange / cols

  // i=0 -> top -> lat_max; so invert
  const lat = box.lat_max - (i + 0.5) * latStep
  const lon = box.lon_min + (j + 0.5) * lonStep

  return [lat, lon] as [number, number]
}

// Convert a numeric matrix (rows x cols) of densities into a GeoJson FeatureCollection
export function matrixToGeoJson(matrix: number[][], bbox?: { lat_min: number; lat_max: number; lon_min: number; lon_max: number }) {
  const rows = matrix.length
  const cols = matrix[0]?.length ?? 0

  const features = [] as any[]

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const densidad = Number(matrix[i][j] ?? 0)
      const [lat, lon] = gridIndexToLatLon(i, j, rows, cols, bbox)
      features.push({
        type: 'Feature',
        properties: { x: j, y: i, agentes: Math.round(densidad), densidad },
        geometry: { type: 'Point', coordinates: [lon, lat] },
      })
    }
  }

  return {
    type: 'FeatureCollection',
    features,
    metadata: { generacion: 0, timestamp: new Date().toISOString(), total_agentes: 0, max_densidad: 1 },
  }
}
