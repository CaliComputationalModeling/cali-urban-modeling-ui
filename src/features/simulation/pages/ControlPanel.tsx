import { Play, Pause, RotateCcw, Sliders, ChevronRight } from 'lucide-react';
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
    setMaxGenerations
  } = useSimulationStore();

  return (
    <div style={{
      backgroundColor: '#11141b',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      padding: '24px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
      marginTop: '24px'
    }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button 
          onClick={isRunning ? pauseSimulation : startSimulation}
          style={{
            padding: '16px',
            borderRadius: '14px',
            border: 'none',
            backgroundColor: isRunning ? 'rgba(212, 175, 55, 0.1)' : 'rgba(0, 217, 255, 0.1)',
            color: isRunning ? 'var(--color-gold)' : 'var(--color-accent)',
            cursor: 'pointer',
            display: 'flex'
          }}
        >
          {isRunning ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
        </button>

        <button 
          onClick={() => fetchNextStep()}
          disabled={isRunning}
          style={{
            padding: '16px',
            borderRadius: '14px',
            border: 'none',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: isRunning ? '#475569' : 'var(--color-accent)',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            display: 'flex'
          }}
        >
          <ChevronRight size={24} />
        </button>

        <button 
          onClick={resetSimulation}
          style={{
            padding: '16px',
            borderRadius: '14px',
            border: 'none',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex'
          }}
        >
          <RotateCcw size={24} />
        </button>
      </div>

      <div style={{ flex: 1, maxWidth: '250px', margin: '0 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '1px' }}>
            VELOCIDAD: {intervalMs}ms
          </span>
          <Sliders size={12} color="#64748b" />
        </div>
        <input 
          type="range" min="100" max="2000" step="100"
          value={intervalMs}
          onChange={(e) => setIntervalMs(Number(e.target.value))}
          style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--color-accent)' }}
        />
      </div>

      {/* Límite de Generaciones */}
      <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '30px', marginRight: '30px' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '2px', margin: '0 0 4px 0' }}>LÍMITE_GEN</p>
        <input 
          type="number"
          value={maxGenerations}
          onChange={(e) => setMaxGenerations(Number(e.target.value))}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--color-accent)',
            borderRadius: '8px',
            padding: '4px 8px',
            width: '60px',
            fontFamily: 'monospace',
            outline: 'none'
          }}
        />
      </div>

      <div style={{ textAlign: 'right', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '30px' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '2px', margin: '0 0 4px 0' }}>GENERACIÓN_ACTUAL</p>
        <p style={{ fontSize: '32px', fontFamily: 'monospace', fontWeight: 700, color: 'white', margin: 0 }}>
          {currentGeneration.toString().padStart(5, '0')}
        </p>
      </div>
    </div>
  );
};