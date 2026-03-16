import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSimulationStore } from '@/store/simulationStore';

export const SimulationMap = () => {
  const { data, currentGeneration } = useSimulationStore();
  const caliCoords: [number, number] = [3.4516, -76.5320];

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', minHeight: '550px' }}>
      <MapContainer 
        center={caliCoords} 
        zoom={14} 
        zoomControl={false}
        scrollWheelZoom={true}
        style={{ 
          height: '100%', 
          width: '100%', 
          backgroundColor: '#11141b',
          borderRadius: '24px' 
        }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO'
        />

        {data && (
          <GeoJSON 
            // 🚀 CLAVE: Usamos currentGeneration para forzar a Leaflet a redibujar
            key={`sim-gen-${currentGeneration}-${data.features.length}`} 
            data={data}
            pointToLayer={(feature, latlng) => {
              const state = feature.properties?.state || 1;
              const colors: Record<number, string> = {
                1: '#00d9ff', // Movimiento (Cian)
                2: '#d4af37', // Concentración (Oro)
                3: '#ef4444'  // Alerta (Rojo)
              };

              return L.circleMarker(latlng, {
                radius: 7, 
                fillColor: colors[state] || '#00d9ff',
                color: '#ffffff',
                weight: 1.5,
                opacity: 1,
                fillOpacity: 0.9
              });
            }}
          />
        )}
      </MapContainer>

      {/* Indicador de estado visual */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: '8px 16px',
        borderRadius: '8px',
        border: '1px solid var(--color-accent)',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '12px'
      }}>
        📡 GEN_{currentGeneration}
      </div>
    </div>
  );
};