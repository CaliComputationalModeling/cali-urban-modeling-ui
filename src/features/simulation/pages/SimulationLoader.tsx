"use client";
import { useState } from 'react';
import { Database, CheckCircle2, FolderOpen, PlusCircle, X } from 'lucide-react';
import { useSimulationStore } from '@/store/simulationStore';
import http from '@/services/http';

export const SimulationLoader = () => {
  const [inputId, setInputId]     = useState('');
  const [isCreating, setCreating] = useState(false);
  const [error, setError]         = useState('');

  const setSimulationId = useSimulationStore(s => s.setSimulationId);
  const disconnect      = useSimulationStore(s => s.disconnect);
  const simulationId    = useSimulationStore(s => s.simulationId);
  const isConnected     = Boolean(simulationId);

  // Conectar con un ID existente
  const handleConnect = () => {
    if (!inputId.trim()) return;
    setError('');
    setSimulationId(inputId.trim());
  };

  // Crear nueva simulación espacial de Cali
  const handleCreate = async () => {
    setCreating(true);
    setError('');
    try {
      const res = await http.post<any>('/simulations/espacial?n_agentes=100', {
        name: `Cali_${Date.now()}`,
        description: 'Simulación urbana habitantes de calle',
        grid_config: {
          width: 50,
          height: 50,
          neighborhood_type: 'moore',
          boundary_mode: 'toroidal',
          geospatial_bounds: {
            lat_min: 3.38, lat_max: 3.50,
            lon_min: -76.56, lon_max: -76.46,
          },
        },
        rule: { rule_type: 'conway', birth: [3], survival: [2, 3] },
      });

      if (res.ok && res.data?.simulation_id) {
        setSimulationId(String(res.data.simulation_id));
      } else {
        setError('No se pudo crear la simulación');
      }
    } catch {
      setError('Error de conexión con el backend');
    } finally {
      setCreating(false);
    }
  };

  if (isConnected) {
    return (
      <div className="sim-loader connected">
        <div className="sim-loader-icon"><CheckCircle2 size={22} /></div>
        <div className="sim-loader-body">
          <p className="sim-loader-label">ESCENARIO ACTIVO</p>
          <input
            className="sim-loader-input"
            value={simulationId!}
            readOnly
            disabled
          />
        </div>
        <button onClick={disconnect} className="sim-loader-btn disconnect" title="Desconectar">
          <X size={15} /> DESCONECTAR
        </button>
      </div>
    );
  }

  return (
    <div className="sim-loader">
      <div className="sim-loader-icon"><Database size={22} /></div>

      <div className="sim-loader-body">
        <p className="sim-loader-label">CARGAR ESCENARIO</p>
        <input
          className="sim-loader-input"
          placeholder="ID de simulación existente — ej: 20"
          value={inputId}
          onChange={(e) => setInputId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
        />
        {error && <p className="sim-loader-error">{error}</p>}
      </div>

      <div className="sim-loader-actions">
        <button
          onClick={handleConnect}
          disabled={!inputId.trim()}
          className="sim-loader-btn"
        >
          <FolderOpen size={15} /> CONECTAR
        </button>
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="sim-loader-btn create"
        >
          {isCreating
            ? <span className="sim-loader-spinner" />
            : <PlusCircle size={15} />
          }
          {isCreating ? 'CREANDO...' : 'NUEVA'}
        </button>
      </div>
    </div>
  );
};