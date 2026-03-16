import { Play, Pause, RotateCcw, ChevronRight, Sliders } from 'lucide-react';
import { useSimulationStore } from '@/store/simulationStore';

export const ControlPanel = () => {
  const {
    isRunning,
    startSimulation,
    pauseSimulation,
    resetSimulation,
    fetchNextStep,
    intervalMs,
    setIntervalMs,
    currentGeneration,
    maxGenerations,
    setMaxGenerations,
  } = useSimulationStore();

  return (
    <div className="sim-control">
      {/* Transport buttons */}
      <div className="sim-transport">
        <button
          onClick={isRunning ? pauseSimulation : startSimulation}
          className={`sim-btn play-pause ${isRunning ? 'running' : ''}`}
          title={isRunning ? 'Pausar' : 'Iniciar'}
        >
          {isRunning
            ? <Pause size={20} fill="currentColor" />
            : <Play  size={20} fill="currentColor" />
          }
        </button>

        <button
          onClick={() => fetchNextStep()}
          disabled={isRunning}
          className="sim-btn"
          title="Paso siguiente"
        >
          <ChevronRight size={20} />
        </button>

        <button
          onClick={resetSimulation}
          className="sim-btn"
          title="Reiniciar"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      <div className="sim-control-divider" />

      {/* Speed slider */}
      <div className="sim-speed">
        <div className="sim-speed-header">
          <span className="sim-speed-label"><Sliders size={11} style={{ display: 'inline', marginRight: 5 }} />VELOCIDAD</span>
          <span className="sim-speed-value">{intervalMs}ms</span>
        </div>
        <input
          type="range"
          min="100"
          max="2000"
          step="100"
          value={intervalMs}
          onChange={(e) => setIntervalMs(Number(e.target.value))}
          className="sim-slider"
        />
      </div>

      <div className="sim-control-divider" />

      {/* Max generations */}
      <div className="sim-maxgen">
        <span className="sim-maxgen-label">LÍMITE_GEN</span>
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
        <p className="sim-gen-label">GENERACIÓN_ACTUAL</p>
        <p className="sim-gen-value">
          {currentGeneration.toString().padStart(5, '0')}
        </p>
      </div>
    </div>
  );
};