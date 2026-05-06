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
import type { SimulationStatus } from '@/shared/contracts/simulation.contract'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM TOOLTIP
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// METRIC CARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// STATUS CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SimulationStatus, { label: string; color: string }> = {
  idle: { label: 'Detenida', color: '#64748b' },
  running: { label: 'Simulando...', color: '#22c55e' },
  paused: { label: 'En pausa', color: '#d4af37' },
  error: { label: 'Error', color: '#ef4444' },
  completed: { label: 'Completada', color: '#00d9ff' },
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS PANEL - TIPADO FUERTE CON CONTRATO
// ─────────────────────────────────────────────────────────────────────────────

export const StatsPanel = () => {
  // Leer del store tipado con contrato
  const urbanState = useSimulationStore((s) => s.urbanState)
  const status = useSimulationStore((s) => s.status)
  const currentGeneration = useSimulationStore((s) => s.currentGeneration)
  const history = useSimulationStore((s) => s.history)

  const hasData = currentGeneration > 0 && urbanState !== null

  // Datos actuales desde UrbanState del backend
  const totalAgentes = urbanState?.total_agentes ?? 0
  const maxDensidad = urbanState?.max_densidad ?? 0
  const celdasOcupadas = urbanState?.celdas_ocupadas ?? 0
  const enTransito = urbanState?.en_transito ?? 0
  const enComedor = urbanState?.en_comedor ?? 0
  const enCambuche = urbanState?.en_cambuche ?? 0
  const zonaConsumo = urbanState?.zona_consumo ?? 0
  const zonaRepulsora = urbanState?.zona_repulsora ?? 0

  // Calcular porcentajes
  const total = totalAgentes > 0 ? totalAgentes : 1
  const pct = (n: number) => ((n / total) * 100).toFixed(1) + '%'

  // Configuración de estado actual
  const statusCfg = STATUS_CONFIG[status]

  return (
    <div className="sim-stats">
      <h3 className="sim-stats-title">METRICAS_TIEMPO_REAL</h3>

      {/* Status indicator - semáforo */}
      <div className="sim-status-indicator">
        <span className="sim-status-dot" style={{ background: statusCfg.color }} />
        <span className="sim-status-label" style={{ color: statusCfg.color }}>
          {statusCfg.label}
        </span>
      </div>

      {/* Total agentes */}
      <Metric
        icon={Users}
        label="Total Agentes"
        value={totalAgentes.toLocaleString()}
        color="var(--color-accent)"
        sub={`${celdasOcupadas} celdas ocupadas`}
      />

      {/* Max densidad */}
      <Metric
        icon={TrendingUp}
        label="Densidad Maxima"
        value={maxDensidad}
        color="#ef4444"
        sub="agentes en celda mas densa"
      />

      {/* Celdas ocupadas + generación en una fila */}
      <div className="sim-metric-row">
        <div className="sim-metric sim-metric-half">
          <div className="sim-metric-header">
            <Grid3X3 size={13} color="#d4af37" />
            <span className="sim-metric-label">Celdas Ocupadas</span>
          </div>
          <p className="sim-metric-value">{celdasOcupadas}</p>
        </div>
        <div className="sim-metric sim-metric-half">
          <div className="sim-metric-header">
            <Activity size={13} color="#22c55e" />
            <span className="sim-metric-label">Generacion</span>
          </div>
          <p className="sim-metric-value">{currentGeneration}</p>
        </div>
      </div>

      {/* Distribución urbana desde UrbanState real */}
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
              {enTransito}
              <span className="sim-urban-pct">{pct(enTransito)}</span>
            </span>
          </div>
          <div className="sim-urban-row">
            <Utensils size={11} color="#22c55e" />
            <span className="sim-urban-label">En comedor</span>
            <span className="sim-urban-value" style={{ color: '#22c55e' }}>
              {enComedor}
              <span className="sim-urban-pct">{pct(enComedor)}</span>
            </span>
          </div>
          <div className="sim-urban-row">
            <Home size={11} color="#d4af37" />
            <span className="sim-urban-label">En cambuche</span>
            <span className="sim-urban-value" style={{ color: '#d4af37' }}>
              {enCambuche}
              <span className="sim-urban-pct">{pct(enCambuche)}</span>
            </span>
          </div>
          <div className="sim-urban-row">
            <AlertTriangle size={11} color="#f97316" />
            <span className="sim-urban-label">Zona consumo</span>
            <span className="sim-urban-value" style={{ color: '#f97316' }}>
              {zonaConsumo}
              <span className="sim-urban-pct">{pct(zonaConsumo)}</span>
            </span>
          </div>
          <div className="sim-urban-row">
            <AlertTriangle size={11} color="#ef4444" />
            <span className="sim-urban-label">Zona repulsora</span>
            <span className="sim-urban-value" style={{ color: '#ef4444' }}>
              {zonaRepulsora}
              <span className="sim-urban-pct">{pct(zonaRepulsora)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Gráfica de línea - evolución de agentes */}
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
                dataKey="generacion"
                tick={{ fontSize: 9, fill: '#475569' }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 9, fill: '#475569' }} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="total_agentes"
                name="Total"
                stroke="#00d9ff"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="en_transito"
                name="Transito"
                stroke="#64748b"
                strokeWidth={1}
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="en_comedor"
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

      {/* Nota: "Execution time" se eliminó porque ahora es manejado por el backend */}
    </div>
  )
}

