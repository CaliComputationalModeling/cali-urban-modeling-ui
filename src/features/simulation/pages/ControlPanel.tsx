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

function buildInitialDensity(rows: number, cols: number, totalAgents: number): number[][] {
  const safeRows = Number.isFinite(rows) ? Math.max(1, Math.floor(rows)) : 100
  const safeCols = Number.isFinite(cols) ? Math.max(1, Math.floor(cols)) : 100
  const safeAgents = Number.isFinite(totalAgents) ? Math.max(1, Math.floor(totalAgents)) : 1200
  const density = Array.from({ length: safeRows }, () => Array(safeCols).fill(0))
  const centers = [
    { row: Math.round(safeRows * 0.28), col: Math.round(safeCols * 0.34), weight: 0.34 },
    { row: Math.round(safeRows * 0.52), col: Math.round(safeCols * 0.55), weight: 0.42 },
    { row: Math.round(safeRows * 0.72), col: Math.round(safeCols * 0.42), weight: 0.24 },
  ]

  for (const center of centers) {
    const agentsForCenter = safeAgents * center.weight
    const radiusRows = Math.max(2, Math.round(safeRows * 0.08))
    const radiusCols = Math.max(2, Math.round(safeCols * 0.08))

    for (let row = 0; row < safeRows; row++) {
      for (let col = 0; col < safeCols; col++) {
        const dr = (row - center.row) / radiusRows
        const dc = (col - center.col) / radiusCols
        const influence = Math.exp(-(dr * dr + dc * dc))
        density[row][col] += agentsForCenter * influence
      }
    }
  }

  const currentTotal = density.flat().reduce((sum, value) => sum + value, 0)
  if (currentTotal <= 0) return density

  return density.map((row) =>
    row.map((value) => Number(((value / currentTotal) * safeAgents).toFixed(4))),
  )
}

function getBackendErrorMessage(data: unknown): string {
  if (!data || typeof data !== 'object' || !('detail' in data)) return 'Error desconocido'
  const detail = (data as { detail: unknown }).detail
  if (typeof detail === 'string') return detail
  if (!Array.isArray(detail)) return JSON.stringify(detail)
  return detail
    .map((item) => {
      if (!item || typeof item !== 'object') return String(item)
      const e = item as { loc?: unknown[]; msg?: unknown; type?: unknown }
      const loc = Array.isArray(e.loc) ? e.loc.join('.') : 'body'
      return `${loc}: ${String(e.msg ?? e.type ?? 'validacion invalida')}`
    })
    .join(' | ')
}

export const ControlPanel = () => {
  const status = useSimulationStore((s) => s.status)
  const startSimulation = useSimulationStore((s) => s.startSimulation)
  const executeSimulationAsync = useSimulationStore((s) => s.executeSimulationAsync)
  const pauseSimulation = useSimulationStore((s) => s.pauseSimulation)
  const resetSimulation = useSimulationStore((s) => s.resetSimulation)
  const stepSimulation = useSimulationStore((s) => s.stepSimulation)
  const speed = useSimulationStore((s) => s.speed)
  const setSpeed = useSimulationStore((s) => s.setSpeed)
  const maxGenerations = useSimulationStore((s) => s.maxGenerations)
  const setMaxGenerations = useSimulationStore((s) => s.setMaxGenerations)
  const currentGeneration = useSimulationStore((s) => s.currentGeneration)
  const backendConnected = useSimulationStore((s) => s.backendConnected)
  const error = useSimulationStore((s) => s.error)
  const pollingStatus = useSimulationStore((s) => s.pollingStatus)
  const loadedPasos = useSimulationStore((s) => s.loadedPasos)
  const simulationProgress = useSimulationStore((s) => s.simulationProgress)
  const showAgentsLayer = useSimulationStore((s) => s.showAgentsLayer)
  const showAttractorsLayer = useSimulationStore((s) => s.showAttractorsLayer)
  const toggleAgentsLayer = useSimulationStore((s) => s.toggleAgentsLayer)
  const toggleAttractorsLayer = useSimulationStore((s) => s.toggleAttractorsLayer)

  const isRunning = status === 'running'
  const hasSimulation = loadedPasos.length > 0

  const [showRuleEditor, setShowRuleEditor] = useState(false)
  const [showExecutionModal, setShowExecutionModal] = useState(false)
  const [lastScenarioVersionId, setLastScenarioVersionId] = useState<number>(1)

  const handleCreateScenario = async () => {
    try {
      const nombre = prompt('Nombre del escenario', 'Escenario A')
      if (!nombre) return
      const temperaturaPromedio = Number(prompt('Temperatura promedio (°C)', '28.5'))
      const humedadRelativa = Number(prompt('Humedad relativa (%)', '72'))
      const precipitacionMm = Number(prompt('Precipitación (mm)', '120'))
      const indiceCriminalidad = Number(prompt('Índice criminalidad (0-1)', '0.65'))
      const coberturaPolicial = Number(prompt('Cobertura policial (0-1)', '0.8'))
      const reglaTransicionId = Number(prompt('ID regla de transición', '1'))
      const resolucionMetros = Number(prompt('Resolución malla (metros)', '50'))
      const anchoCeldas = Number(prompt('Ancho en celdas', '100'))
      const altoCeldas = Number(prompt('Alto en celdas', '100'))
      const totalAgentes = Number(prompt('Agentes iniciales', '1200'))
      const densidadInicial = buildInitialDensity(altoCeldas, anchoCeldas, totalAgentes)

      const res = await simulationEndpoints.createScenario({
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
          densidad_inicial: densidadInicial,
          total_agentes_iniciales: totalAgentes,
        },
      })

      if (!res.ok) {
        return alert(res.status === 403 ? 'Sin permisos para crear escenarios' : getBackendErrorMessage(res.data))
      }

      // POST /api/escenarios devuelve VersionEscenarioResponse con campo `id`
      const versionId = res.data?.id
      if (versionId) {
        setLastScenarioVersionId(versionId)
        useSimulationStore.getState().pauseSimulation()
        useSimulationStore.setState({
          simulationId: null,
          ejecucionId: null,
          status: 'idle',
          currentGeneration: 0,
          geojson: null,
          urbanState: null,
          history: [],
          loadedPasos: [],
          error: null,
          retryCount: 0,
        })
        alert(`Escenario creado. Version ID: ${versionId} — úsalo para ejecutar la simulación.`)
      } else {
        alert('Escenario creado, pero no se recibió el ID de versión. Revísalo en el backend.')
      }
    } catch {
      alert('Error de red al crear escenario')
    }
  }

  const handlePlayPause = async () => {
    if (isRunning) {
      pauseSimulation()
      return
    }

    if (hasSimulation) {
      startSimulation()
      return
    }

    await executeSimulationAsync({
      version_escenario_id: lastScenarioVersionId,
      generaciones: maxGenerations,
      radio_suavizado: 1,
      movilidad: 0.25,
      permanencia_base: 0.1,
      sensibilidad_atractivo: 1,
    })

    const state = useSimulationStore.getState()
    if (!state.error && state.loadedPasos.length > 0) {
      state.startSimulation()
    }
  }

  return (
    <div className="sim-control-wrapper">
      <div className="sim-control">

        {/* Acciones de administración */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button className="sim-btn-labeled" onClick={() => setShowRuleEditor(true)}>
            Editar Reglas
          </button>
          <button className="sim-btn-labeled" onClick={handleCreateScenario}>
            Nuevo Escenario
          </button>
          <button className="sim-btn-labeled" onClick={() => setShowExecutionModal(true)}>
            Ejecutar Simulación
          </button>
        </div>

        {showRuleEditor && <RuleEditor onClose={() => setShowRuleEditor(false)} />}
        {showExecutionModal && (
          <ExecutionModal
            initialVersionId={lastScenarioVersionId}
            onClose={() => setShowExecutionModal(false)}
          />
        )}

        {/* Barra de estado de ejecución */}
        {pollingStatus && (
          <div style={{ padding: '10px', marginBottom: 8, backgroundColor: '#0f172a', border: '1px solid #1d4ed8', borderRadius: 4, textAlign: 'center', fontSize: '13px', color: '#60a5fa' }}>
            ⏳ {pollingStatus}
            {simulationProgress && (
              <div style={{ marginTop: 8, height: 6, background: '#1e293b', borderRadius: 999, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(Math.max(simulationProgress.progreso, 0), 100)}%`,
                    background: '#60a5fa',
                    transition: 'width 180ms linear',
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Indicador de pasos cargados */}
        {hasSimulation && (
          <div style={{ padding: '6px 10px', marginBottom: 8, backgroundColor: '#052e16', border: '1px solid #166534', borderRadius: 4, fontSize: '12px', color: '#86efac' }}>
            ✓ {loadedPasos.length} pasos listos para animar
          </div>
        )}

        {/* Controles de transporte */}
        <div className="sim-transport">
          <button
            onClick={handlePlayPause}
            disabled={Boolean(pollingStatus)}
            className={`sim-btn-labeled play-pause ${isRunning ? 'running' : ''}`}
          >
            {isRunning ? (
              <><Pause size={18} fill="currentColor" /><span>Pausar</span></>
            ) : (
              <><Play size={18} fill="currentColor" /><span>Iniciar</span></>
            )}
          </button>

          <button
            onClick={() => stepSimulation()}
            disabled={isRunning || !hasSimulation}
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

        <div className="sim-speed-section">
          <span className="sim-speed-title">CAPA</span>
          <div className="sim-speed-selector">
            <button
              className={`sim-speed-option ${showAgentsLayer ? 'active' : ''}`}
              onClick={toggleAgentsLayer}
            >
              Agentes
            </button>
            <button
              className={`sim-speed-option ${showAttractorsLayer ? 'active' : ''}`}
              onClick={toggleAttractorsLayer}
            >
              Atractores
            </button>
          </div>
        </div>

        <div className="sim-control-divider" />

        {/* Velocidad */}
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

        {/* Límite de generaciones */}
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

        {/* Contador de generación actual */}
        <div className="sim-gen-counter">
          <p className="sim-gen-label">GENERACION_ACTUAL</p>
          <p className="sim-gen-value">{currentGeneration.toString().padStart(5, '0')}</p>
        </div>

        {/* Indicador de conexión */}
        <div className="sim-connection" title={backendConnected ? 'Backend conectado' : 'Sin conexión'}>
          {backendConnected
            ? <Wifi size={14} className="sim-connection-icon connected" />
            : <WifiOff size={14} className="sim-connection-icon disconnected" />}
        </div>
      </div>

      {/* Barra de error */}
      {error && status === 'error' && (
        <div className="sim-error-bar">
          <WifiOff size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
