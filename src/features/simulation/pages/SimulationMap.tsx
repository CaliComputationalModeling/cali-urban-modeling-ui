import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSimulationStore } from '@/store/simulationStore';

export const SimulationMap = () => {
  const { data, currentGeneration, isRunning } = useSimulationStore();
  const caliCoords: [number, number] = [3.4516, -76.5320];

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
          attribution='&copy; CARTO'
        />

        {data && (
          <GeoJSON
            key={`sim-gen-${currentGeneration}-${data.features.length}`}
            data={data}
            pointToLayer={(feature, latlng) => {
              const state = feature.properties?.state || 1;
              const colors: Record<number, string> = {
                1: '#00d9ff',
                2: '#d4af37',
                3: '#ef4444',
              };
              return L.circleMarker(latlng, {
                radius: 7,
                fillColor: colors[state] || '#00d9ff',
                color: '#ffffff',
                weight: 1.5,
                opacity: 1,
                fillOpacity: 0.9,
              });
            }}
          />
        )}
      </MapContainer>

      {/* Generation badge */}
      <div className="sim-map-badge">
        <span className={`sim-map-badge-dot ${isRunning ? '' : ''}`}
          style={{ animationPlayState: isRunning ? 'running' : 'paused' }}
        />
        GEN_{currentGeneration.toString().padStart(5, '0')}
      </div>
    </div>
  );
};