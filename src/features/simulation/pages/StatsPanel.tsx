import { Activity, Users, Database, Clock } from 'lucide-react';
import { useSimulationStore } from '@/store/simulationStore';

// Genera alturas de barras pseudo-aleatorias para el sparkline decorativo
const SPARK_HEIGHTS = [35, 55, 42, 70, 58, 48, 80, 62, 45, 75, 50, 65, 38, 72, 55];

export const StatsPanel = () => {
  const { stats, isRunning, currentGeneration } = useSimulationStore();

  // Anima las barras del sparkline cuando hay datos reales o está corriendo
  const hasData = currentGeneration > 0;

  return (
    <div className="sim-stats">
      <h3 className="sim-stats-title">MÉTRICAS_TIEMPO_REAL</h3>

      {/* Población activa */}
      <div className="sim-metric">
        <div className="sim-metric-header">
          <Users size={13} color="var(--color-accent)" />
          <span className="sim-metric-label">Población Activa</span>
        </div>
        <p className="sim-metric-value">{stats.livingCells.toLocaleString()}</p>
      </div>

      {/* Densidad */}
      <div className="sim-metric">
        <div className="sim-metric-header">
          <Activity size={13} color="var(--color-gold)" />
          <span className="sim-metric-label">Densidad Promedio</span>
        </div>
        <p className="sim-metric-value">{(stats.density * 100).toFixed(2)}%</p>
      </div>

      {/* Sparkline / historial */}
      <div className="sim-metric sparkline" style={{ flex: 1 }}>
        <div className="sim-metric-header">
          <Database size={13} color="var(--color-text-muted)" style={{ color: '#64748b' }} />
          <span className="sim-metric-label">Historial de Celdas</span>
        </div>

        {hasData ? (
          <div className="sim-sparkline-area">
            {SPARK_HEIGHTS.map((h, i) => (
              <div
                key={i}
                className="sim-spark-bar"
                style={{ height: `${isRunning ? Math.max(8, (h + (i * 3 + currentGeneration * 7) % 40)) : h}%` }}
              />
            ))}
          </div>
        ) : (
          <div className="sim-spark-empty">
            <p>Sin datos — inicia la simulación</p>
          </div>
        )}
      </div>

      {/* Tiempo de ejecución */}
      <div className="sim-exec-card">
        <div className="sim-exec-label">
          <Clock size={13} />
          TIEMPO_PROCESO_VPU
        </div>
        <p className="sim-exec-value">{stats.executionTime || '00:00.000'}</p>
      </div>
    </div>
  );
};