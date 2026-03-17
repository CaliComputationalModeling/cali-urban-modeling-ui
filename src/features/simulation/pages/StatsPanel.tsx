"use client";
import { Activity, Users, Database, Clock, Utensils, Home, Zap, AlertTriangle } from 'lucide-react';
import { useSimulationStore } from '@/store/simulationStore';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';

// ─── Tooltip personalizado ────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--color-surface, #1a1f2e)',
      border: '1px solid var(--color-border, #2a2f3e)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 11,
    }}>
      <p style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color, margin: '2px 0' }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Componente métrica individual ───────────────────────────────────────────

const Metric = ({
  icon: Icon,
  label,
  value,
  color = 'var(--color-accent)',
  sub,
}: {
  icon: any;
  label: string;
  value: string | number;
  color?: string;
  sub?: string;
}) => (
  <div className="sim-metric">
    <div className="sim-metric-header">
      <Icon size={13} color={color} />
      <span className="sim-metric-label">{label}</span>
    </div>
    <p className="sim-metric-value">{value}</p>
    {sub && <p className="sim-metric-sub">{sub}</p>}
  </div>
);

// ─── StatsPanel ───────────────────────────────────────────────────────────────

export const StatsPanel = () => {
  const { stats, isRunning, currentGeneration, history } = useSimulationStore();
  const hasData = currentGeneration > 0;
  const total = stats.totalAgentes > 0 ? stats.totalAgentes : 1;
  const pct = (n: number) => ((n / total) * 100).toFixed(1) + '%';

  return (
    <div className="sim-stats">
      <h3 className="sim-stats-title">MÉTRICAS_TIEMPO_REAL</h3>

      {/* Población activa */}
      <Metric
        icon={Users}
        label="Población Activa"
        value={stats.totalAgentes.toLocaleString()}
        color="var(--color-accent)"
        sub={`${stats.livingCells} celdas ocupadas`}
      />

      {/* Densidad */}
      <Metric
        icon={Activity}
        label="Densidad Promedio"
        value={`${(stats.density * 100).toFixed(2)}%`}
        color="var(--color-gold, #d4af37)"
      />

      {/* Distribución urbana */}
      <div className="sim-metric">
        <div className="sim-metric-header">
          <Database size={13} color="#64748b" />
          <span className="sim-metric-label">Distribución Urbana</span>
        </div>
        <div className="sim-urban-rows">
          {/* En tránsito */}
          <div className="sim-urban-row">
            <Zap size={11} color="#00d9ff" />
            <span className="sim-urban-label">En tránsito</span>
            <span className="sim-urban-value" style={{ color: '#00d9ff' }}>
              {stats.enTransito}
              <span className="sim-urban-pct">{pct(stats.enTransito)}</span>
            </span>
          </div>
          {/* En comedor */}
          <div className="sim-urban-row">
            <Utensils size={11} color="#22c55e" />
            <span className="sim-urban-label">En comedor</span>
            <span className="sim-urban-value" style={{ color: '#22c55e' }}>
              {stats.enComedor}
              <span className="sim-urban-pct">{pct(stats.enComedor)}</span>
            </span>
          </div>
          {/* En cambuche */}
          <div className="sim-urban-row">
            <Home size={11} color="#d4af37" />
            <span className="sim-urban-label">En cambuche</span>
            <span className="sim-urban-value" style={{ color: '#d4af37' }}>
              {stats.enCambuche}
              <span className="sim-urban-pct">{pct(stats.enCambuche)}</span>
            </span>
          </div>
          {/* Zona consumo */}
          <div className="sim-urban-row">
            <AlertTriangle size={11} color="#f97316" />
            <span className="sim-urban-label">Zona consumo</span>
            <span className="sim-urban-value" style={{ color: '#f97316' }}>
              {stats.enZonaConsumo}
              <span className="sim-urban-pct">{pct(stats.enZonaConsumo)}</span>
            </span>
          </div>
          {/* Zona repulsora */}
          <div className="sim-urban-row">
            <AlertTriangle size={11} color="#ef4444" />
            <span className="sim-urban-label">Zona repulsora</span>
            <span className="sim-urban-value" style={{ color: '#ef4444' }}>
              {stats.enZonaRepulsora}
              <span className="sim-urban-pct">{pct(stats.enZonaRepulsora)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Gráfica histórica */}
      <div className="sim-metric" style={{ flex: 1, minHeight: 160 }}>
        <div className="sim-metric-header">
          <Activity size={13} color="#64748b" />
          <span className="sim-metric-label">Historial de Comportamiento</span>
        </div>

        {hasData && history.length > 1 ? (
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={history} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="gTransito" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00d9ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00d9ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gComedor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCambuche" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#d4af37" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2736" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#475569' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: '#475569' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="enTransito" name="Tránsito"
                stroke="#00d9ff" strokeWidth={1.5} fill="url(#gTransito)" dot={false} />
              <Area type="monotone" dataKey="enComedor"  name="Comedor"
                stroke="#22c55e" strokeWidth={1.5} fill="url(#gComedor)"  dot={false} />
              <Area type="monotone" dataKey="enCambuche" name="Cambuche"
                stroke="#d4af37" strokeWidth={1.5} fill="url(#gCambuche)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
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