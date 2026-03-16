import { useState } from 'react';
import { Database, FolderOpen } from 'lucide-react';
import { useSimulationStore } from '@/store/simulationStore';

export const SimulationLoader = () => {
  const [inputTitle, setInputTitle] = useState("");
  const setSimulationId = useSimulationStore(state => state.setSimulationId);
  const simulationId = useSimulationStore(state => state.simulationId);

  const handleInit = () => {
    if (!inputTitle) return;
    // Aquí podrías hacer un post al backend para crear la simulación
    // Por ahora, seteamos el ID para habilitar el sistema
    setSimulationId(inputTitle);
  };

  return (
    <div style={{ 
      backgroundColor: '#11141b', 
      padding: '20px', 
      borderRadius: '16px', 
      border: '1px solid var(--color-accent)',
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '20px'
    }}>
      <div style={{ color: 'var(--color-accent)' }}><Database size={24} /></div>
      <div style={{ flex: 1 }}>
        <p style={{ color: 'white', fontSize: '12px', fontWeight: 700, margin: 0 }}>CARGAR ESCENARIO DE TESIS</p>
        <input 
          placeholder="Ingrese ID de Simulación (ej: CALI_CENTRO_01)"
          value={inputTitle}
          onChange={(e) => setInputTitle(e.target.value)}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: 'var(--color-accent)', 
            width: '100%',
            outline: 'none',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}
        />
      </div>
      <button 
        onClick={handleInit}
        style={{
          backgroundColor: simulationId ? '#10b981' : 'var(--color-accent)',
          color: 'black',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '8px',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        {simulationId ? 'CONECTADO' : 'INICIALIZAR'} <FolderOpen size={16} />
      </button>
    </div>
  );
};