import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

import type { AtractorFisicoResponse } from '@/services/endpoints/simulation.endpoints'
import { emojiForAtractor } from './atractorEmojis'

interface AttractorMarkersLayerProps {
  attractors: AtractorFisicoResponse[]
  visible: boolean
  onAttractorMove?: (id: number, lat: number, lon: number) => void
  onAttractorCreate?: (lat: number, lon: number) => void
  onAttractorDelete?: (id: number) => void
  editMode?: boolean
}

export const AttractorMarkersLayer = ({
  attractors,
  visible,
  onAttractorMove,
  onAttractorCreate,
  onAttractorDelete,
  editMode = false,
}: AttractorMarkersLayerProps) => {
  const map = useMap()
  const layerRef = useRef<L.LayerGroup | null>(null)
  const clickHandlerRef = useRef<L.LeafletEventHandlerFn | null>(null)

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
        draggable: editMode,
      })
      const intensidad = Number.isFinite(a.intensidad) ? a.intensidad : 0
      const radio = Number.isFinite(a.radio_influencia) ? a.radio_influencia : 0
      const isRepulsor = intensidad < 0
      marker.bindTooltip(
        `<b>${a.tipo}</b>${isRepulsor ? ' (repulsor)' : ''}<br/>` +
          `Intensidad: ${intensidad.toFixed(2)}<br/>` +
          `Radio: ${radio} celdas`,
        { direction: 'top', offset: [0, -10] },
      )

      if (editMode && onAttractorMove) {
        marker.on('dragend', () => {
          const pos = marker.getLatLng()
          onAttractorMove(a.id, pos.lat, pos.lng)
        })
      }

      if (editMode && onAttractorDelete) {
        const popupContent = L.DomUtil.create('div')
        popupContent.style.fontSize = '12px'
        popupContent.innerHTML =
          `<b>${a.tipo}</b>${isRepulsor ? ' (repulsor)' : ''}<br/>` +
          `Intensidad: ${intensidad.toFixed(2)}<br/>` +
          `Radio: ${radio} celdas`
        const deleteBtn = L.DomUtil.create('button', '', popupContent)
        deleteBtn.textContent = 'Eliminar'
        deleteBtn.style.cssText = 'margin-top:6px;padding:3px 10px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;width:100%'
        deleteBtn.addEventListener('click', () => {
          marker.closePopup()
          onAttractorDelete(a.id)
        })
        marker.bindPopup(popupContent)
      }

      marker.addTo(group)
    }

    if (!map.hasLayer(group)) {
      group.addTo(map)
    }
  }, [attractors, map, visible, editMode, onAttractorMove, onAttractorDelete])

  useEffect(() => {
    if (!visible || !editMode || !onAttractorCreate) {
      if (clickHandlerRef.current) {
        map.off('click', clickHandlerRef.current)
        clickHandlerRef.current = null
      }
      return
    }

    const handler: L.LeafletEventHandlerFn = (e) => {
      const event = e as L.LeafletMouseEvent
      if ((event.originalEvent.target as HTMLElement)?.closest?.('.leaflet-marker-icon, .leaflet-popup')) return
      onAttractorCreate(event.latlng.lat, event.latlng.lng)
    }
    clickHandlerRef.current = handler
    map.on('click', handler)
    return () => {
      map.off('click', handler)
      clickHandlerRef.current = null
    }
  }, [map, visible, editMode, onAttractorCreate])

  if (!visible || !editMode) return null

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 1000,
      background: 'rgba(15, 23, 42, 0.95)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 12,
      color: '#e2e8f0',
      maxWidth: 200,
    }}>
      <span style={{ fontWeight: 600, fontSize: 11, opacity: 0.7 }}>Modo edición</span>
      <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>
        Clic en el mapa para crear<br/>
        Arrastra para mover<br/>
        Clic en marcador para eliminar
      </div>
    </div>
  )
}
