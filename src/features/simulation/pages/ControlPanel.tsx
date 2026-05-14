import { Play, Pause, RotateCcw, ChevronRight, Wifi, WifiOff } from 'lucide-react'
import { useSimulationStore } from '@/store/simulationStore'
import { simulationEndpoints } from '@/services/endpoints/simulation.endpoints'

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
        {/* Quick admin actions: rules, scenarios, execute */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button
            className="sim-btn-labeled"
            onClick={async () => {
              try {
                const raw = prompt('Ingrese pesos frio,comida,seguridad separados por comas (suma debe ser 1.0)', '0.3,0.4,0.3')
                if (!raw) return
                const parts = raw.split(',').map((p) => Number(p.trim()))
                if (parts.length !== 3 || parts.some(isNaN)) return alert('Formato invalido')
                const sum = parts.reduce((a, b) => a + b, 0)
                if (Math.abs(sum - 1.0) > 1e-6) return alert('La suma debe ser exactamente 1.0')

                // usar ruleId=1 por defecto
                const res = await simulationEndpoints.updateRuleWeights(1, { frio: parts[0], comida: parts[1], seguridad: parts[2] })
                if (!res.ok) {
                  if (res.status === 403) return alert('No tiene permisos para actualizar reglas')
                  return alert('Error al actualizar pesos')
                }
                alert('Pesos actualizados')
              } catch (e) {
                alert('Error al actualizar pesos')
              }
            }}
          >
            Editar Reglas
          </button>

          <button
            className="sim-btn-labeled"
            onClick={async () => {
              try {
                const nombre = prompt('Nombre del escenario', 'Escenario A')
                if (!nombre) return
                const temp = Number(prompt('Temperatura (C)', '25'))
                const lluvia = Number(prompt('Lluvia (mm)', '0'))
                const seguridad = Number(prompt('Nivel seguridad (0-1)', '0.5'))
                const filas = Number(prompt('Filas malla', '50'))
                const columnas = Number(prompt('Columnas malla', '50'))

                const payload = {
                  nombre,
                  clima: { temperatura: temp, lluvia },
                  seguridad,
                  malla: { filas, columnas },
                }

                const res = await simulationEndpoints.createScenario(payload)
                if (!res.ok) {
                  if (res.status === 403) return alert('No tiene permisos para crear escenarios')
                  return alert('Error al crear escenario')
                }
                alert('Escenario creado')
              } catch (e) {
                alert('Error al crear escenario')
              }
            }}
          >
            Nuevo Escenario
          </button>

          <button
            className="sim-btn-labeled"
            onClick={async () => {
              try {
                const ver = Number(prompt('Version escenario id', '1'))
                const pasos = Number(prompt('Numero de pasos', '10'))
                if (isNaN(ver) || isNaN(pasos)) return alert('Valores invalidos')
                const payload = { version_escenario_id: ver, generaciones: pasos, radio_suavizado:1, movilidad:0.25, permanencia_base:0.1, sensibilidad_atractivo:1 }
                const res = await simulationEndpoints.createSimulation(payload as any)
                if (!res.ok) {
                  if (res.status === 403) return alert('No tiene permisos para ejecutar simulaciones')
                  return alert('Error al ejecutar simulacion')
                }
                if (res.data?.simulation_id) {
                  // set simulation id in store to track
                  // dynamic import to avoid circular dependencies
                  const { useSimulationStore } = await import('@/store/simulationStore')
                  useSimulationStore.getState().setSimulationId(res.data.simulation_id as any)
                  alert('Simulacion iniciada: ' + String(res.data.simulation_id))
                }
              } catch (e) {
                alert('Error al ejecutar simulacion')
              }
            }}
          >
            Ejecutar Simulación
          </button>
        </div>
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
