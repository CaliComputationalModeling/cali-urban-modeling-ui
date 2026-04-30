import { Play, Pause, RotateCcw, ChevronRight, Wifi, WifiOff } from 'lucide-react'
import { useSimulationStore } from '@/store/simulationStore'

const SPEED_OPTIONS = [
  { label: 'Lento', ms: 2000 },
  { label: 'Normal', ms: 1000 },
  { label: 'Rapido', ms: 500 },
] as const

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

  const isRunning = status === 'running'

  return (
    <div className="sim-control-wrapper">
      <div className="sim-control">
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
