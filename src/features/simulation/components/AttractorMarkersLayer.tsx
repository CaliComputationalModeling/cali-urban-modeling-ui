import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

import type { AtractorFisicoResponse } from '@/services/endpoints/simulation.endpoints'
import { emojiForAtractor } from './atractorEmojis'

interface AttractorMarkersLayerProps {
  attractors: AtractorFisicoResponse[]
  visible: boolean
}

/**
 * Capa Leaflet independiente para atractores físicos, basada en `L.divIcon`.
 * Se puede ocultar/mostrar sin afectar el heatmap ni la capa discreta.
 * Reutiliza el mismo estado (`showAttractorsLayer`) y endpoint.
 */
export const AttractorMarkersLayer = ({ attractors, visible }: AttractorMarkersLayerProps) => {
  const map = useMap()
  const layerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    const group = L.layerGroup()
    layerRef.current = group
    return () => {
      group.clearLayers()
      group.remove()
      layerRef.current = null
    }
  }, [map])

  useEffect(() => {
    const group = layerRef.current
    if (!group) return

    group.clearLayers()

    if (!visible) {
      if (map.hasLayer(group)) map.removeLayer(group)
      return
    }

    for (const a of attractors) {
      if (a.activo === false) continue
      if (!Number.isFinite(a.lat) || !Number.isFinite(a.lon)) continue
      const emoji = emojiForAtractor(a.tipo)
      const icon = L.divIcon({
        className: 'sim-atractor-divicon',
        html: `<span class="sim-atractor-emoji" aria-hidden="true">${emoji}</span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })
      const marker = L.marker([a.lat, a.lon], {
        icon,
        keyboard: false,
        riseOnHover: true,
        title: a.tipo,
      })
      const intensidad = Number.isFinite(a.intensidad) ? a.intensidad : 0
      const radio = Number.isFinite(a.radio_influencia) ? a.radio_influencia : 0
      marker.bindTooltip(
        `<b>${a.tipo}</b><br/>` +
          `Intensidad: ${intensidad.toFixed(2)}<br/>` +
          `Radio: ${radio} celdas`,
        { direction: 'top', offset: [0, -10] },
      )
      marker.addTo(group)
    }

    if (!map.hasLayer(group)) {
      group.addTo(map)
    }
  }, [attractors, map, visible])

  return null
}
