import {
  Activity,
  Users,
  Database,
  Clock,
  Utensils,
  Home,
  Zap,
  AlertTriangle,
  Grid3X3,
  TrendingUp,
} from 'lucide-react'
import { useSimulationStore } from '@/store/simulationStore'
import type { SimulationStatus } from '@/store/simulationStore'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: Record<string, unknown>) => {
  if (!active || !(payload as unknown[])?.length) return null
  return (
    <div
      style={{
        background: 'var(--color-surface, #1a1f2e)',
        border: '1px solid var(--color-border, #2a2f3e)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 11,
      }}
    >
      <p style={{ color: '#94a3b8', marginBottom: 4 }}>{label as string}</p>
      {(payload as { dataKey: string; color: string; name: string; value: number }[]).map((p) => (
        <p key={p.dataKey} style={{ color: p.color, margin: '2px 0' }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

const Metric = ({
  icon: Icon,
  label,
  value,
  color = 'var(--color-accent)',
  sub,
}: {
  icon: React.ComponentType<{ size?: number | string; color?: string }>
  label: string
  value: string | number
  color?: string
  sub?: string
}) => (
  <div className="sim-metric">
    <div className="sim-metric-header">
      <Icon size={13} color={color} />
      <span className="sim-metric-label">{label}</span>
    </div>
    <p className="sim-metric-value">{value}</p>
    {sub && <p className="sim-metric-sub">{sub}</p>}
  </div>
)

// ─── Status Config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SimulationStatus, { label: string; color: string }> = {
  idle: { label: 'Detenida', color: '#64748b' },
  running: { label: 'Simulando...', color: '#22c55e' },
  paused: { label: 'En pausa', color: '#d4af37' },
  error: { label: 'Error', color: '#ef4444' },
  completed: { label: 'Completada', color: '#00d9ff' },
}

// ─── StatsPanel ──────────────────────────────────────────────────────────────

export const StatsPanel = () => {
  const stats = useSimulationStore((s) => s.stats)
  const status = useSimulationStore((s) => s.status)
  const currentGeneration = useSimulationStore((s) => s.currentGeneration)
  const history = useSimulationStore((s) => s.history)

  const hasData = currentGeneration > 0
  const total = stats.totalAgentes > 0 ? stats.totalAgentes : 1
  const pct = (n: number) => ((n / total) * 100).toFixed(1) + '%'
  const statusCfg = STATUS_CONFIG[status]

  return (
    <div className="sim-stats">
      <h3 className="sim-stats-title">METRICAS_TIEMPO_REAL</h3>

      {/* Status indicator */}
      <div className="sim-status-indicator">
        <span className="sim-status-dot" style={{ background: statusCfg.color }} />
        <span className="sim-status-label" style={{ color: statusCfg.color }}>
          {statusCfg.label}
        </span>
      </div>

      {/* Total agents */}
      <Metric
        icon={Users}
        label="Total Agentes"
        value={stats.totalAgentes.toLocaleString()}
        color="var(--color-accent)"
        sub={`${stats.livingCells} celdas ocupadas`}
      />

      {/* Max density */}
      <Metric
        icon={TrendingUp}
        label="Densidad Maxima"
        value={stats.maxDensity}
        color="#ef4444"
        sub="agentes en celda mas densa"
      />

      {/* Occupied cells + generation in a row */}
      <div className="sim-metric-row">
        <div className="sim-metric sim-metric-half">
          <div className="sim-metric-header">
            <Grid3X3 size={13} color="#d4af37" />
            <span className="sim-metric-label">Celdas Ocupadas</span>
          </div>
          <p className="sim-metric-value">{stats.livingCells}</p>
        </div>
        <div className="sim-metric sim-metric-half">
          <div className="sim-metric-header">
            <Activity size={13} color="#22c55e" />
            <span className="sim-metric-label">Generacion</span>
          </div>
          <p className="sim-metric-value">{currentGeneration}</p>
        </div>
      </div>

      {/* Urban distribution */}
      <div className="sim-metric">
        <div className="sim-metric-header">
          <Database size={13} color="#64748b" />
          <span className="sim-metric-label">Distribucion Urbana</span>
        </div>
        <div className="sim-urban-rows">
          <div className="sim-urban-row">
            <Zap size={11} color="#00d9ff" />
            <span className="sim-urban-label">En transito</span>
            <span className="sim-urban-value" style={{ color: '#00d9ff' }}>
              {stats.enTransito}
              <span className="sim-urban-pct">{pct(stats.enTransito)}</span>
            </span>
          </div>
          <div className="sim-urban-row">
            <Utensils size={11} color="#22c55e" />
            <span className="sim-urban-label">En comedor</span>
            <span className="sim-urban-value" style={{ color: '#22c55e' }}>
              {stats.enComedor}
              <span className="sim-urban-pct">{pct(stats.enComedor)}</span>
            </span>
          </div>
          <div className="sim-urban-row">
            <Home size={11} color="#d4af37" />
            <span className="sim-urban-label">En cambuche</span>
            <span className="sim-urban-value" style={{ color: '#d4af37' }}>
              {stats.enCambuche}
              <span className="sim-urban-pct">{pct(stats.enCambuche)}</span>
            </span>
          </div>
          <div className="sim-urban-row">
            <AlertTriangle size={11} color="#f97316" />
            <span className="sim-urban-label">Zona consumo</span>
            <span className="sim-urban-value" style={{ color: '#f97316' }}>
              {stats.enZonaConsumo}
              <span className="sim-urban-pct">{pct(stats.enZonaConsumo)}</span>
            </span>
          </div>
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

      {/* History chart — line chart of total agents */}
      <div className="sim-metric" style={{ flex: 1, minHeight: 160 }}>
        <div className="sim-metric-header">
          <Activity size={13} color="#64748b" />
          <span className="sim-metric-label">Evolucion de Agentes</span>
        </div>

        {hasData && history.length > 1 ? (
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={history} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2736" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9, fill: '#475569' }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 9, fill: '#475569' }} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="totalAgentes"
                name="Total"
                stroke="#00d9ff"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="enTransito"
                name="Transito"
                stroke="#64748b"
                strokeWidth={1}
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="enComedor"
                name="Comedor"
                stroke="#22c55e"
                strokeWidth={1}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="sim-spark-empty">
            <p>Sin datos — inicia la simulacion</p>
          </div>
        )}
      </div>

      {/* Execution time */}
      <div className="sim-exec-card">
        <div className="sim-exec-label">
          <Clock size={13} />
          TIEMPO_PROCESO_VPU
        </div>
        <p className="sim-exec-value">{stats.executionTime || '00:00.000'}</p>
      </div>
    </div>
  )
}
