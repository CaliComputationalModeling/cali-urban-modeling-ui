import { SimulationMap } from './SimulationMap';
import { ControlPanel } from './ControlPanel';
import { StatsPanel } from './StatsPanel';
import { SimulationLoader } from './SimulationLoader';

export const SimulationPage = () => {
  return (
    <div className="animate-in" style={{ padding: '0 40px 40px 40px' }}>
      
      {/* 1. Header Editorial */}
      <header style={{ marginBottom: '40px' }}>
        <p style={{ 
          color: 'var(--color-gold)', 
          letterSpacing: '3px', 
          fontSize: '11px', 
          fontWeight: 700, 
          marginBottom: '12px' 
        }}>
          SIMULACIÓN / MODELO AUTÓMATA CELULAR
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h1 style={{ 
            fontSize: '56px', 
            fontWeight: 700, 
            margin: 0, 
            fontFamily: 'var(--font-display)', 
            lineHeight: 1,
            color: 'var(--color-dark)' 
          }}>
            Análisis de <span style={{ color: 'var(--color-accent)', fontStyle: 'italic' }}>Flujos Urbanos</span>
          </h1>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>SANTIAGO_DE_CALI</span>
            <p style={{ 
              fontSize: '10px', 
              color: 'var(--color-accent)', 
              fontWeight: 700, 
              margin: 0,
              letterSpacing: '1px' 
            }}>
              POSTGIS_GEO_STREAM
            </p>
          </div>
        </div>
      </header>

      {/* 2. Cargador de Escenario (Conexión con Backend) */}
      <div style={{ marginBottom: '32px' }}>
        <SimulationLoader />
      </div>

      {/* 3. Dashboard Central (War Room) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 380px', 
        gap: '32px',
        alignItems: 'start' 
      }}>
        
        {/* Lado Izquierdo: Visualización y Ejecución */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Contenedor del Mapa */}
          <div style={{ 
            height: '600px', 
            borderRadius: '24px', 
            overflow: 'hidden', 
            backgroundColor: '#11141b',
            border: '1px solid rgba(0,0,0,0.05)',
            boxShadow: '0 30px 60px rgba(0,0,0,0.15)',
            position: 'relative'
          }}>
            <SimulationMap />
          </div>

          {/* Panel de Reproducción */}
          <ControlPanel />
          
          {/* Nota técnica al pie */}
          <div style={{ 
            padding: '12px 20px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '12px', 
            border: '1px solid #eee' 
          }}>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
              * Los datos visualizados corresponden a proyecciones estocásticas basadas en densidades de habitabilidad históricas.
            </p>
          </div>
        </div>

        {/* Lado Derecho: Telemetría y Análisis */}
        <div style={{ 
          backgroundColor: '#11141b', 
          borderRadius: '28px', 
          padding: '32px',
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          minHeight: '750px',
          position: 'sticky',
          top: '20px'
        }}>
          <StatsPanel />
        </div>

      </div>
    </div>
  );
};