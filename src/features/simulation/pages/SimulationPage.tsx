import { useEffect, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { SimulationMap } from './SimulationMap'
import { ControlPanel } from './ControlPanel'
import { StatsPanel } from './StatsPanel'
import { SimulationLoader } from './SimulationLoader'
import { useSimulationStore } from '@/store/simulationStore'

// ── Interpretación automática de resultados ──────────────────────────────────
// Genera un mensaje legible basado en los datos del estado final.
// Sin IA: solo umbrales fijos y texto en español.
function interpretarResultado(totalAgentes: number, maxDensidad: number, celdasOcupadas: number): string {
  if (totalAgentes === 0) return 'La simulación no generó datos. Verifica la configuración del escenario.'
  const msgs: string[] = []
  if (maxDensidad > 0.7) {
    msgs.push('Se detectaron zonas con concentración crítica de personas. Esto puede indicar puntos de alta permanencia que requieren intervención prioritaria.')
  } else if (maxDensidad > 0.4) {
    msgs.push('La población presenta una concentración moderada. La distribución es relativamente equilibrada en el área simulada.')
  } else {
    msgs.push('La población se distribuyó de forma dispersa a lo largo del área simulada, sin zonas de alta concentración.')
  }
  if (celdasOcupadas > 0 && totalAgentes > 0) {
    const densidadMedia = totalAgentes / celdasOcupadas
    if (densidadMedia > 5) {
      msgs.push(`En promedio, cada zona activa concentra ${densidadMedia.toFixed(1)} personas — indica agrupamientos.`)
    }
  }
  return msgs.join(' ')
}

export const SimulationPage = () => {
  const status = useSimulationStore((s) => s.status)
  const urbanState = useSimulationStore((s) => s.urbanState)
  const currentGeneration = useSimulationStore((s) => s.currentGeneration)
  const [showSummary, setShowSummary] = useState(false)

  // Show summary when simulation completes
  useEffect(() => {
    if (status === 'completed' && currentGeneration > 0) {
      setShowSummary(true)
    }
  }, [status, currentGeneration])

  return (
    <div className="sim-module page-wrapper sim-page">
      {/* Header */}
      <header className="sim-header">
        <div>
          <p className="page-eyebrow">Simulacion / Modelo Automata Celular</p>
          <h1 className="page-title">
            Analisis de <em>Flujos Urbanos</em>
          </h1>
        </div>
        <div className="sim-header-meta">
          <span className="sim-meta-location">SANTIAGO_DE_CALI</span>
          <span className="sim-meta-stream">POSTGIS_GEO_STREAM</span>
        </div>
      </header>

      {/* ── Guía de inicio (visible solo cuando no hay simulación activa) ── */}
      {status === 'idle' && !urbanState && (
        <div className="sim-start-guide" aria-label="Guía de inicio de simulación">
          {(['1', '2', '3'] as const).map((n, i) => {
            const steps = [
              { num: '1', title: 'Selecciona un escenario', desc: 'Elige un escenario predefinido o configura los parámetros manualmente en el formulario de abajo.' },
              { num: '2', title: 'Ejecuta la simulación', desc: 'Presiona "Crear y ejecutar". El sistema calculará cómo se distribuye la población.' },
              { num: '3', title: 'Observa e interpreta', desc: 'Usa los controles para reproducir paso a paso y el panel derecho para leer los resultados.' },
            ]
            const step = steps[i]
            return (
              <div key={n} className="sim-start-step">
                <div className="sim-start-step-title">
                  <span className="sim-start-step-number">
                    {step.num}
                  </span>
                  <span>{step.title}</span>
                </div>
                <p>{step.desc}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Loader */}
      <SimulationLoader />

      {/* Main grid */}
      <div className="sim-grid">
        {/* Left: map + controls */}
        <div className="sim-left">
          <div className="sim-map-container">
            <SimulationMap />
          </div>

          <ControlPanel />

          <div className="sim-tech-note">
            <p>
              Los resultados corresponden a una proyección basada en el modelo de autómata celular. No representan datos en tiempo real.
            </p>
          </div>
        </div>

        {/* Right: telemetry */}
        <StatsPanel />
      </div>

      {/* Completion summary overlay */}
      {showSummary && (
        <div className="sim-summary-overlay" onClick={() => setShowSummary(false)}>
          <div className="sim-summary-card" onClick={(e) => e.stopPropagation()}>
            <button className="sim-summary-close" onClick={() => setShowSummary(false)}>
              <X size={18} />
            </button>

            <div className="sim-summary-icon">
              <CheckCircle2 size={32} />
            </div>

            <h3 className="sim-summary-title">Simulacion Completada</h3>
            <p className="sim-summary-subtitle">
              La simulación alcanzó {currentGeneration} generaciones.
            </p>
            <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', margin: '0 0 16px', lineHeight: 1.6, padding: '0 8px' }}>
              {interpretarResultado(
                urbanState?.total_agentes ?? 0,
                urbanState?.max_densidad ?? 0,
                urbanState?.celdas_ocupadas ?? 0,
              )}
            </p>

            <div className="sim-summary-metrics">
              <div className="sim-summary-metric">
                <span className="sim-summary-metric-label">Pasos simulados</span>
                <span className="sim-summary-metric-value">{currentGeneration}</span>
              </div>
              <div className="sim-summary-metric">
                <span className="sim-summary-metric-label">Personas simuladas</span>
                  <span className="sim-summary-metric-value">
                    {urbanState?.total_agentes ? urbanState.total_agentes.toLocaleString() : '—'}
                  </span>
              </div>
              <div className="sim-summary-metric">
                <span className="sim-summary-metric-label">Concentración máxima</span>
                <span className="sim-summary-metric-value">{urbanState?.max_densidad ?? '—'}</span>
              </div>
              <div className="sim-summary-metric">
                <span className="sim-summary-metric-label">Zonas con presencia</span>
                <span className="sim-summary-metric-value">{urbanState?.celdas_ocupadas ?? '—'}</span>
              </div>
            </div>

            <button className="sim-summary-btn" onClick={() => setShowSummary(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
