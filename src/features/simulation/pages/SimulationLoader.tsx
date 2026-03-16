import { useState } from 'react';
import { Database, CheckCircle2, FolderOpen } from 'lucide-react';
import { useSimulationStore } from '@/store/simulationStore';

export const SimulationLoader = () => {
  const [inputTitle, setInputTitle] = useState('');
  const setSimulationId = useSimulationStore(state => state.setSimulationId);
  const simulationId    = useSimulationStore(state => state.simulationId);

  const handleInit = () => {
    if (!inputTitle.trim()) return;
    setSimulationId(inputTitle.trim());
  };

  const isConnected = Boolean(simulationId);

  return (
    <div className={`sim-loader ${isConnected ? 'connected' : ''}`}>
      <div className="sim-loader-icon">
        {isConnected ? <CheckCircle2 size={22} /> : <Database size={22} />}
      </div>

      <div className="sim-loader-body">
        <p className="sim-loader-label">CARGAR ESCENARIO</p>
        <input
          className="sim-loader-input"
          placeholder="ID de simulación — ej: CALI_CENTRO_01"
          value={isConnected ? simulationId! : inputTitle}
          onChange={(e) => !isConnected && setInputTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !isConnected && handleInit()}
          disabled={isConnected}
          readOnly={isConnected}
        />
      </div>

      <button
        onClick={isConnected ? undefined : handleInit}
        disabled={isConnected}
        className={`sim-loader-btn ${isConnected ? 'connected' : ''}`}
      >
        {isConnected
          ? <><CheckCircle2 size={15} /> CONECTADO</>
          : <><FolderOpen size={15} /> INICIALIZAR</>
        }
      </button>
    </div>
  );
};