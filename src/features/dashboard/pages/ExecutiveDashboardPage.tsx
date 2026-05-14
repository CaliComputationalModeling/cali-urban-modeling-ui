import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, TrendingUp, Users, ShieldAlert } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { toast } from 'sonner'
import { dashboardEndpoints, type DashboardKpis, type DrillDownPoint } from '@/services/endpoints/dashboard.endpoints'

function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-CO').format(n)
}

function extractErrorMessage(data: unknown): string {
  if (data && typeof data === 'object' && 'detail' in data) return String((data as { detail: unknown }).detail)
  return 'No fue posible cargar la información del dashboard'
}

type KpiKey = keyof Pick<DashboardKpis, 'personas_atendidas' | 'variacion_poblacion' | 'zonas_riesgo'>

const KPI_META: Array<{
  key: KpiKey
  label: string
  icon: typeof Users
  threshold: number
  format?: (n: number) => string
}> = [
  { key: 'personas_atendidas', label: 'Personas atendidas', icon: Users, threshold: 500, format: formatNumber },
  { key: 'variacion_poblacion', label: 'Variación de población', icon: TrendingUp, threshold: 500, format: formatNumber },
  { key: 'zonas_riesgo', label: 'Zonas de riesgo', icon: ShieldAlert, threshold: 25, format: formatNumber },
]

export const ExecutiveDashboardPage = () => {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null)
  const [series, setSeries] = useState<DrillDownPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      const [kRes, dRes] = await Promise.all([
        dashboardEndpoints.getKpis(),
        dashboardEndpoints.getDrillDown(),
      ])

      if (!mounted) return

      // Notify if data came from cache (backend may set header 'desde_cache')
      try {
        const desdeCache = kRes.headers?.get('desde_cache')
        if (desdeCache === 'true') {
          toast('Datos desde cache (antigüedad < 60s)')
        }
      } catch {
        // ignore
      }

      if (!kRes.ok) toast.error(extractErrorMessage(kRes.data))
      if (!dRes.ok) toast.error(extractErrorMessage(dRes.data))

      setKpis(kRes.ok ? kRes.data : null)
      setSeries(dRes.ok && Array.isArray(dRes.data) ? dRes.data : [])
      setLoading(false)
    })()

    return () => {
      mounted = false
    }
  }, [])

  const redFlags = useMemo(() => {
    if (!kpis) return []
    return KPI_META.filter((m) => Number(kpis[m.key] ?? 0) > m.threshold).map((m) => m.label)
  }, [kpis])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="animate-in">
        <h1 className="headline" style={{ fontSize: '40px' }}>
          Dashboard Ejecutivo
        </h1>
        <p className="text-muted">Métricas agregadas para toma de decisiones. Sin datos personales ni IDs.</p>
      </div>

      {/* KPIs */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 14,
        }}
      >
        {KPI_META.map((meta) => {
          const Icon = meta.icon
          const value = kpis ? Number(kpis[meta.key] ?? 0) : 0
          const isFlag = value > meta.threshold
          const display = meta.format ? meta.format(value) : String(value)
          return (
            <div
              key={meta.key}
              style={{
                background: 'var(--color-white)',
                border: `1px solid ${isFlag ? 'var(--color-error-border)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sm)',
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      display: 'grid',
                      placeItems: 'center',
                      background: isFlag ? 'var(--color-error-bg)' : 'var(--color-gold-light)',
                      color: isFlag ? 'var(--color-error-text)' : 'var(--color-dark)',
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text-dark)' }}>{meta.label}</p>
                </div>

                {isFlag && (
                  <div
                    title={`Umbral superado (> ${meta.threshold})`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      borderRadius: 999,
                      border: '1px solid var(--color-error-border)',
                      background: 'var(--color-error-bg)',
                      color: 'var(--color-error-text)',
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    <AlertTriangle size={14} />
                    Bandera roja
                  </div>
                )}
              </div>

              <div style={{ marginTop: 12 }}>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: 'var(--color-dark)' }}>
                  {loading ? '—' : display}
                </p>
                <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {kpis?.as_of ? `Actualizado: ${kpis.as_of}` : 'Datos agregados'}
                </p>
              </div>
            </div>
          )
        })}
      </section>

      {/* Red flags summary */}
      {redFlags.length > 0 && (
        <section
          style={{
            padding: 14,
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-error-border)',
            background: 'var(--color-error-bg)',
            color: 'var(--color-error-text)',
          }}
        >
          <p style={{ margin: 0, fontWeight: 700 }}>Banderas rojas activas</p>
          <p style={{ margin: '6px 0 0' }}>
            {redFlags.join(' · ')}. Recomendación: priorizar validación territorial y activar protocolo de respuesta.
          </p>
        </section>
      )}

      {/* Drill-down chart */}
      <section
        style={{
          background: 'var(--color-white)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-text-dark)' }}>Drill-down mensual</p>
            <p style={{ margin: '6px 0 0', color: 'var(--color-text-muted)' }}>
              Tendencias por mes (agregado). Puedes pasar el cursor para ver detalle.
            </p>
          </div>
        </div>

        <div className="chart-container" style={{ height: 340, marginTop: 10 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="personas_atendidas" stroke="#00b8d9" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="variacion_poblacion" stroke="#d4af37" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="zonas_riesgo" stroke="#dc2626" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}

