import { useMemo } from 'react'
import {
  Activity,
  Users,
  Database,
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
  testId,
}: {
  icon: React.ComponentType<{ size?: number | string; color?: string }>
  label: string
  value: string | number
  color?: string
  sub?: string
  testId?: string
}) => (
  <div className="sim-metric" data-testid={testId}>
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
  const loadedPasos = useSimulationStore((s) => s.loadedPasos)

  const hasData = currentGeneration > 0 && urbanState !== null

  // Datos actuales desde UrbanState del backend
  const totalAgentes = urbanState?.total_agentes ?? 0
  const totalAgentesFormateado = `${Math.round(totalAgentes).toLocaleString()}`
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

  // Población por comuna del paso actual (consumido del backend)
  const currentPaso = loadedPasos.find((p) => p.tiempo === currentGeneration)
    ?? loadedPasos[loadedPasos.length - 1]
  const poblacionPorComuna = currentPaso?.poblacion_por_comuna ?? {}

  const totalComunasActual = useMemo(() => {
    return Object.values(poblacionPorComuna).reduce((sum, value) => sum + Number(value ?? 0), 0)
  }, [poblacionPorComuna])

  const lineData = useMemo(() => {
    return loadedPasos.map((paso) => {
      const values: Record<string, number> = { paso: paso.tiempo }
      ;[3, 9, 10, 4, 19].forEach((comuna) => {
        values[`comuna-${comuna}`] = Number(paso.poblacion_por_comuna?.[comuna] ?? 0)
      })
      return values
    })
  }, [loadedPasos])

  const statusCfg = STATUS_CONFIG[status]

  return (
    <div className="sim-stats" data-testid="simulation-stats-panel">
      <h3 className="sim-stats-title">Indicadores de la simulación</h3>

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
        label="Personas en el área simulada"
        value={totalAgentesFormateado}
        color="var(--color-accent)"
        sub={`Distribuidas en ${celdasOcupadas} zonas del mapa`}
        testId="stats-total-population"
      />

      {/* Concentración máxima — semáforo de nivel */}
      <Metric
        icon={TrendingUp}
        label="Concentración máxima"
        value={maxDensidad > 0 ? maxDensidad.toFixed(2) : '—'}
        color={maxDensidad > 0.7 ? '#ef4444' : maxDensidad > 0.4 ? '#f97316' : '#22c55e'}
        sub={
          maxDensidad > 0.7
            ? '⚠ Concentración crítica — requiere atención'
            : maxDensidad > 0.4
            ? '↑ Concentración moderada — dentro del rango esperado'
            : maxDensidad > 0
            ? '✓ Concentración baja — distribución equilibrada'
            : 'Sin datos — inicia la simulación'
        }
      />

      {/* Celdas ocupadas + generación en una fila */}
      <div className="sim-metric-row">
        <div className="sim-metric sim-metric-half">
          <div className="sim-metric-header">
            <Grid3X3 size={13} color="#d4af37" />
            <span className="sim-metric-label">Zonas con presencia</span>
          </div>
          <p className="sim-metric-value">{celdasOcupadas}</p>
        </div>
        <div className="sim-metric sim-metric-half">
          <div className="sim-metric-header">
            <Activity size={13} color="#22c55e" />
            <span className="sim-metric-label">Paso de tiempo</span>
          </div>
          <p className="sim-metric-value">{currentGeneration}</p>
        </div>
      </div>

      {/* Distribución urbana desde UrbanState real */}
      <div className="sim-metric">
        <div className="sim-metric-header">
          <Database size={13} color="#64748b" />
          <span className="sim-metric-label">Distribución de la población</span>
        </div>
        <div className="sim-urban-rows">
          <div className="sim-urban-row">
            <Zap size={11} color="#00d9ff" />
            <span className="sim-urban-label">Desplazándose</span>
            <span className="sim-urban-value" style={{ color: '#00d9ff' }}>
              {enTransito}
              <span className="sim-urban-pct">{pct(enTransito)}</span>
            </span>
          </div>
          <div className="sim-urban-row">
            <Utensils size={11} color="#22c55e" />
            <span className="sim-urban-label">En comedor comunitario</span>
            <span className="sim-urban-value" style={{ color: '#22c55e' }}>
              {enComedor}
              <span className="sim-urban-pct">{pct(enComedor)}</span>
            </span>
          </div>
          <div className="sim-urban-row">
            <Home size={11} color="#d4af37" />
            <span className="sim-urban-label">En albergue/cambuche</span>
            <span className="sim-urban-value" style={{ color: '#d4af37' }}>
              {enCambuche}
              <span className="sim-urban-pct">{pct(enCambuche)}</span>
            </span>
          </div>
          <div className="sim-urban-row">
            <AlertTriangle size={11} color="#f97316" />
            <span className="sim-urban-label">En zona de consumo</span>
            <span className="sim-urban-value" style={{ color: '#f97316' }}>
              {zonaConsumo}
              <span className="sim-urban-pct">{pct(zonaConsumo)}</span>
            </span>
          </div>
          <div className="sim-urban-row">
            <AlertTriangle size={11} color="#ef4444" />
            <span className="sim-urban-label">En zona repulsora</span>
            <span className="sim-urban-value" style={{ color: '#ef4444' }}>
              {zonaRepulsora}
              <span className="sim-urban-pct">{pct(zonaRepulsora)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Gráfica de línea - evolución de agentes */}
      <div className="sim-metric sim-chart-card">
        <div className="sim-metric-header">
          <Activity size={13} color="#64748b" />
          <span className="sim-metric-label">Evolución de la población simulada (personas)</span>
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
                name="Total personas"
                stroke="#00d9ff"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="en_transito"
                name="Desplazándose"
                stroke="#64748b"
                strokeWidth={1}
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="en_comedor"
                name="En comedor"
                stroke="#22c55e"
                strokeWidth={1}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="sim-spark-empty">
            <p>Sin datos aún — inicia la simulación para ver la evolución</p>
          </div>
        )}
      </div>

      {/* Población por comuna por generación */}
      <div className="sim-metric" data-testid="stats-poblacion-por-comuna">
        <div className="sim-metric-header">
          <Database size={13} color="#0ea5e9" />
          <span className="sim-metric-label">Población por comuna (paso {currentPaso?.tiempo ?? '—'})</span>
        </div>
        {Object.keys(poblacionPorComuna).length === 0 ? (
          <p className="sim-urban-empty">Sin datos por comuna en este paso.</p>
        ) : (
          <>
            <div className="sim-urban-rows" style={{ marginBottom: 12 }}>
              {Array.from({ length: 22 }, (_, idx) => idx + 1).map((comuna) => {
                const valor = Number(poblacionPorComuna[comuna] ?? 0)
                return (
                  <div key={comuna} className="sim-urban-row">
                    <span className="sim-urban-label">Comuna {comuna}</span>
                    <span className="sim-urban-value" style={{ color: '#0ea5e9' }}>
                      {valor.toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>
              Suma comprobada: {Math.round(totalComunasActual).toLocaleString()} ·
              {' '}Total del paso: {Math.round(Number(currentPaso?.total_poblacion ?? 0)).toLocaleString()}
            </div>
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2736" />
                  <XAxis dataKey="paso" tick={{ fontSize: 9, fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#475569' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="comuna-3" name="Comuna 3" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="comuna-9" name="Comuna 9" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="comuna-10" name="Comuna 10" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="comuna-4" name="Comuna 4" stroke="#f97316" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="comuna-19" name="Comuna 19" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* Nota: "Execution time" se eliminó porque ahora es manejado por el backend */}
    </div>
  )
}
