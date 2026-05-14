import { useState } from 'react'
import { Play, Pause, RotateCcw, ChevronRight, Wifi, WifiOff } from 'lucide-react'
import { useSimulationStore } from '@/store/simulationStore'
import { RuleEditor } from '@/features/simulation/components/RuleEditor'
import { ExecutionModal } from '@/features/simulation/components/ExecutionModal'
import { simulationEndpoints } from '@/services/endpoints/simulation.endpoints'

const SPEED_OPTIONS = [
  { label: 'Lento', ms: 2000 },
  { label: 'Normal', ms: 1000 },
  { label: 'Rapido', ms: 500 },
] as const

function getBackendErrorMessage(data: unknown): string {
  if (!data || typeof data !== 'object' || !('detail' in data)) return 'Error al crear escenario'

  const detail = (data as { detail: unknown }).detail
  if (typeof detail === 'string') return detail
  if (!Array.isArray(detail)) return JSON.stringify(detail)

  return detail
    .map((item) => {
      if (!item || typeof item !== 'object') return String(item)
      const error = item as { loc?: unknown[]; msg?: unknown; type?: unknown }
      const loc = Array.isArray(error.loc) ? error.loc.join('.') : 'body'
      return `${loc}: ${String(error.msg ?? error.type ?? 'validacion invalida')}`
    })
    .join(' | ')
}

export const ControlPanel = () => {
  const status = useSimulationStore((s) => s.status)
  const startSimulation = useSimulationStore((s) => s.startSimulation)
  const pauseSimulation = useSimulationStore((s) => s.pauseSimulation)
  const resetSimulation = useSimulationStore((s) => s.resetSimulation)
  const stepSimulation = useSimulationStore((s) => s.stepSimulation)
  const speed = useSimulationStore((s) => s.speed)
  const setSpeed = useSimulationStore((s) => s.setSpeed)
  const currentGeneration = useSimulationStore((s) => s.currentGeneration)
  const maxGenerations = useSimulationStore((s) => s.maxGenerations)
  const setMaxGenerations = useSimulationStore((s) => s.setMaxGenerations)
  const backendConnected = useSimulationStore((s) => s.backendConnected)
  const error = useSimulationStore((s) => s.error)
  const pollingStatus = useSimulationStore((s) => s.pollingStatus)

  const isRunning = status === 'running'

  const [showRuleEditor, setShowRuleEditor] = useState(false)
  const [showExecutionModal, setShowExecutionModal] = useState(false)

  return (
    <div className="sim-control-wrapper">
      <div className="sim-control">
        {/* Quick admin actions: rules, scenarios, execute */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button className="sim-btn-labeled" onClick={() => setShowRuleEditor(true)}>
            Editar Reglas
          </button>

          <button
            className="sim-btn-labeled"
            onClick={async () => {
              // Create scenario simple inline prompts kept for now
              try {
                const nombre = prompt('Nombre del escenario', 'Escenario A')
                if (!nombre) return
                const temperaturaPromedio = Number(prompt('Temperatura promedio (C)', '28.5'))
                const humedadRelativa = Number(prompt('Humedad relativa (%)', '72'))
                const precipitacionMm = Number(prompt('Precipitacion (mm)', '120'))
                const indiceCriminalidad = Number(prompt('Indice criminalidad (0-1)', '0.65'))
                const coberturaPolicial = Number(prompt('Cobertura policial (0-1)', '0.8'))
                const reglaTransicionId = Number(prompt('ID regla transicion', '1'))
                const resolucionMetros = Number(prompt('Resolucion malla (metros)', '50'))
                const anchoCeldas = Number(prompt('Ancho en celdas', '100'))
                const altoCeldas = Number(prompt('Alto en celdas', '100'))

                const payload = {
                  nombre,
                  variables_clima: {
                    temperatura_promedio: temperaturaPromedio,
                    humedad_relativa: humedadRelativa,
                    precipitacion_mm: precipitacionMm,
                  },
                  variables_seguridad: {
                    indice_criminalidad: indiceCriminalidad,
                    cobertura_policial: coberturaPolicial,
                  },
                  regla_transicion_id: reglaTransicionId,
                  configuracion_malla: {
                    resolucion_metros: resolucionMetros,
                    ancho_celdas: anchoCeldas,
                    alto_celdas: altoCeldas,
                  },
                }

                const res = await simulationEndpoints.createScenario(payload)
                if (!res.ok) {
                  if (res.status === 403) return alert('No tiene permisos para crear escenarios')
                  return alert(getBackendErrorMessage(res.data))
                }
                alert('Escenario creado')
              } catch (e) {
                alert('Error al crear escenario')
              }
            }}
          >
            Nuevo Escenario
          </button>

          <button className="sim-btn-labeled" onClick={() => setShowExecutionModal(true)}>
            Ejecutar Simulación
          </button>
        </div>

        {showRuleEditor && <RuleEditor onClose={() => setShowRuleEditor(false)} />}
        {showExecutionModal && <ExecutionModal onClose={() => setShowExecutionModal(false)} />}

        {/* Polling status bar */}
        {pollingStatus && (
          <div style={{ padding: '10px', marginBottom: 8, backgroundColor: '#f0f8ff', border: '1px solid #80d4ff', borderRadius: 4, textAlign: 'center', fontSize: '14px', color: '#0066cc' }}>
            ⏳ {pollingStatus}
          </div>
        )}

        {/* Transport buttons */}
        <div className="sim-transport">
          <button
            onClick={isRunning ? pauseSimulation : startSimulation}
            className={`sim-btn-labeled play-pause ${isRunning ? 'running' : ''}`}
          >
            {isRunning ? (
              <>
                <Pause size={18} fill="currentColor" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play size={18} fill="currentColor" />
                <span>Iniciar</span>
              </>
            )}
          </button>

          <button
            onClick={() => stepSimulation()}
            disabled={isRunning}
            className="sim-btn-labeled"
            title="Ejecutar un paso"
          >
            <ChevronRight size={18} />
            <span>Paso</span>
          </button>

          <button onClick={() => resetSimulation()} className="sim-btn-labeled" title="Reiniciar">
            <RotateCcw size={16} />
            <span>Reset</span>
          </button>
        </div>

        <div className="sim-control-divider" />

        {/* Speed selector */}
        <div className="sim-speed-section">
          <span className="sim-speed-title">VELOCIDAD</span>
          <div className="sim-speed-selector">
            {SPEED_OPTIONS.map((opt) => (
              <button
                key={opt.ms}
                className={`sim-speed-option ${speed === opt.ms ? 'active' : ''}`}
                onClick={() => setSpeed(opt.ms)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="sim-control-divider" />

        {/* Max generations */}
        <div className="sim-maxgen">
          <span className="sim-maxgen-label">LIMITE_GEN</span>
          <input
            type="number"
            value={maxGenerations}
            onChange={(e) => setMaxGenerations(Number(e.target.value))}
            className="sim-maxgen-input"
          />
        </div>

        <div className="sim-control-divider" />

        {/* Generation counter */}
        <div className="sim-gen-counter">
          <p className="sim-gen-label">GENERACION_ACTUAL</p>
          <p className="sim-gen-value">{currentGeneration.toString().padStart(5, '0')}</p>
        </div>

        {/* Connection indicator */}
        <div className="sim-connection" title={backendConnected ? 'Backend conectado' : 'Sin conexion'}>
          {backendConnected ? (
            <Wifi size={14} className="sim-connection-icon connected" />
          ) : (
            <WifiOff size={14} className="sim-connection-icon disconnected" />
          )}
        </div>
      </div>

      {/* Error bar */}
      {error && status === 'error' && (
        <div className="sim-error-bar">
          <WifiOff size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
