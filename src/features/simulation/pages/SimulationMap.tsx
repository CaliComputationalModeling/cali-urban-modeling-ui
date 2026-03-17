"use client";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSimulationStore } from '@/store/simulationStore';
import { useEffect, useState } from 'react';
import http from '@/services/http';

// ─── Colores por estado ───────────────────────────────────────────────────────
const STATE_COLORS: Record<number, { fill: string; label: string }> = {
  1: { fill: '#00d9ff', label: 'En tránsito' },
  2: { fill: '#d4af37', label: 'En cambuche' },
  3: { fill: '#22c55e', label: 'En comedor' },
  4: { fill: '#f97316', label: 'Zona consumo' },
  5: { fill: '#ef4444', label: 'Zona repulsora' },
};

// ─── Íconos POI ───────────────────────────────────────────────────────────────
const POI_ICONS: Record<string, { emoji: string; color: string }> = {
  comedor_social:  { emoji: '🍽', color: '#22c55e' },
  cambuche:        { emoji: '🏕', color: '#d4af37' },
  zona_consumo:    { emoji: '⚠',  color: '#f97316' },
  zona_patrullaje: { emoji: '🚔', color: '#ef4444' },
  parque_publico:  { emoji: '🌳', color: '#86efac' },
  hospital_cai:    { emoji: '🏥', color: '#f43f5e' },
};

const makePOIIcon = (tipo: string) => {
  const def = POI_ICONS[tipo] || { emoji: '📍', color: '#94a3b8' };
  return L.divIcon({
    html: `<div style="font-size:16px;line-height:1;filter:drop-shadow(0 0 4px ${def.color})">${def.emoji}</div>`,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// ─── SimulationMap ────────────────────────────────────────────────────────────

export const SimulationMap = () => {
  const { data, currentGeneration, isRunning } = useSimulationStore();
  const caliCoords: [number, number] = [3.4372, -76.5225];
  const [pois, setPois] = useState<any[]>([]);

  // Cargar POIs una sola vez al montar
  useEffect(() => {
    http.get<any>('/observations/pois')
      .then((res) => { if (res.ok && res.data?.pois) setPois(res.data.pois); })
      .catch(() => null);
  }, []);

  // Filtrar features sin geometry para evitar errores silenciosos de Leaflet
  const dataFiltrada = data
    ? { ...data, features: data.features.filter((f) => f.geometry !== null) }
    : null;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer
        center={caliCoords}
        zoom={14}
        zoomControl={false}
        scrollWheelZoom={true}
        style={{
          height: '100%',
          width: '100%',
          backgroundColor: '#0d1017',
          borderRadius: '24px',
        }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; CARTO"
        />

        {/* Agentes de la simulación */}
        {dataFiltrada && dataFiltrada.features.length > 0 && (
          <GeoJSON
            key={`sim-${currentGeneration}-${dataFiltrada.features.length}`}
            data={dataFiltrada}
            pointToLayer={(feature, latlng) => {
              const state = feature.properties?.state ?? 1;
              const def = STATE_COLORS[state] ?? STATE_COLORS[1];
              const agentes = feature.properties?.agentes ?? 1;
              return L.circleMarker(latlng, {
                radius: Math.min(4 + agentes, 12),
                fillColor: def.fill,
                color: '#ffffff',
                weight: 1,
                opacity: 0.9,
                fillOpacity: 0.85,
              });
            }}
            onEachFeature={(feature, layer) => {
              const s = feature.properties?.state ?? 1;
              const def = STATE_COLORS[s] ?? STATE_COLORS[1];
              const agentes = feature.properties?.agentes ?? 1;
              const tipo = feature.properties?.tipo_poi ?? 'ninguno';
              layer.bindTooltip(
                `<b>${def.label}</b><br/>
                 Agentes: ${agentes}<br/>
                 POI: ${tipo}<br/>
                 x:${feature.properties?.x} y:${feature.properties?.y}`,
                { className: 'sim-tooltip', sticky: true }
              );
            }}
          />
        )}

        {/* Marcadores fijos de POIs */}
        {pois.map((poi) =>
          poi.latitud && poi.longitud ? (
            <Marker
              key={poi.id}
              position={[poi.latitud, poi.longitud]}
              icon={makePOIIcon(poi.tipo_poi)}
            >
              <Popup>
                <b>{poi.nombre}</b><br />
                Tipo: {poi.tipo_poi}<br />
                Peso: {poi.peso}<br />
                Radio: {poi.radio_influencia} celdas
              </Popup>
            </Marker>
          ) : null
        )}
      </MapContainer>

      {/* Badge de generación */}
      <div className="sim-map-badge">
        <span
          className="sim-map-badge-dot"
          style={{ animationPlayState: isRunning ? 'running' : 'paused' }}
        />
        GEN_{currentGeneration.toString().padStart(5, '0')}
      </div>

      {/* Leyenda */}
      <div className="sim-map-legend">
        {Object.entries(STATE_COLORS).map(([state, def]) => (
          <div key={state} className="sim-legend-row">
            <div className="sim-legend-dot" style={{ background: def.fill }} />
            <span>{def.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};