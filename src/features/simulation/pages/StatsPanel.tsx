import { Activity, Users, Database, Clock } from 'lucide-react';
import { useSimulationStore } from '@/store/simulationStore';

export const StatsPanel = () => {
  const { stats } = useSimulationStore();

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '16px'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: 700,
    color: '#64748b',
    letterSpacing: '1px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    textTransform: 'uppercase'
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '2px', color: 'var(--color-gold)', marginBottom: '24px' }}>
        MÉTRICAS_TIEMPO_REAL
      </h3>

      <div style={cardStyle}>
        <span style={labelStyle}><Users size={14} color="var(--color-accent)" /> Población Activa</span>
        <p style={{ fontSize: '28px', color: 'white', margin: 0, fontWeight: 700 }}>{stats.livingCells}</p>
      </div>

      <div style={cardStyle}>
        <span style={labelStyle}><Activity size={14} color="var(--color-gold)" /> Densidad Promedio</span>
        <p style={{ fontSize: '28px', color: 'white', margin: 0, fontWeight: 700 }}>{(stats.density * 100).toFixed(2)}%</p>
      </div>

      <div style={{ ...cardStyle, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span style={labelStyle}><Database size={14} /> Historial de Celdas</span>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', marginTop: '10px' }}>
          <p style={{ fontSize: '11px', color: '#475569', fontStyle: 'italic' }}>Gráfica de Tendencia (Procesando...)</p>
        </div>
      </div>

      <div style={{ marginTop: 'auto', padding: '20px', backgroundColor: 'rgba(0, 217, 255, 0.05)', borderRadius: '16px', border: '1px solid rgba(0, 217, 255, 0.1)' }}>
        <span style={{ ...labelStyle, color: 'var(--color-accent)' }}><Clock size={14} /> Tiempo de Proceso_VPU</span>
        <p style={{ fontSize: '20px', color: 'var(--color-accent)', margin: 0, fontWeight: 700, fontFamily: 'monospace' }}>{stats.executionTime}</p>
      </div>
    </div>
  );
};