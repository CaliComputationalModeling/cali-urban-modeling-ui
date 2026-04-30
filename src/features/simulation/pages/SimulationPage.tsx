import { useEffect, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { SimulationMap } from './SimulationMap'
import { ControlPanel } from './ControlPanel'
import { StatsPanel } from './StatsPanel'
import { SimulationLoader } from './SimulationLoader'
import { useSimulationStore } from '@/store/simulationStore'

export const SimulationPage = () => {
  const status = useSimulationStore((s) => s.status)
  const stats = useSimulationStore((s) => s.stats)
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
              * Los datos visualizados corresponden a proyecciones estocasticas basadas en
              densidades de habitabilidad historicas.
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
              La simulacion alcanzo el limite de {currentGeneration} generaciones.
            </p>

            <div className="sim-summary-metrics">
              <div className="sim-summary-metric">
                <span className="sim-summary-metric-label">Generaciones</span>
                <span className="sim-summary-metric-value">{currentGeneration}</span>
              </div>
              <div className="sim-summary-metric">
                <span className="sim-summary-metric-label">Total Agentes</span>
                <span className="sim-summary-metric-value">
                  {stats.totalAgentes.toLocaleString()}
                </span>
              </div>
              <div className="sim-summary-metric">
                <span className="sim-summary-metric-label">Densidad Max</span>
                <span className="sim-summary-metric-value">{stats.maxDensity}</span>
              </div>
              <div className="sim-summary-metric">
                <span className="sim-summary-metric-label">Celdas Ocupadas</span>
                <span className="sim-summary-metric-value">{stats.livingCells}</span>
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
