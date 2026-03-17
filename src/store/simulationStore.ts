import { create } from 'zustand';
import http from '@/services/http';
import { FeatureCollection, Geometry } from 'geojson';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SimulationStats {
  density: number;
  livingCells: number;
  executionTime: string;
  // Urban stats — datos del modelo espacial de tesis
  enTransito: number;
  enCambuche: number;
  enComedor: number;
  enZonaConsumo: number;
  enZonaRepulsora: number;
  totalAgentes: number;
}

interface HistoryPoint {
  name: string;
  cells: number;
  enComedor: number;
  enCambuche: number;
  enTransito: number;
}

interface SimulationState {
  simulationId: string | null;
  isRunning: boolean;
  currentGeneration: number;
  maxGenerations: number;
  data: FeatureCollection<Geometry> | null;
  history: HistoryPoint[];
  intervalMs: number;
  stats: SimulationStats;

  setSimulationId: (id: string) => void;
  setMaxGenerations: (max: number) => void;
  startSimulation: () => void;
  pauseSimulation: () => void;
  resetSimulation: () => void;
  fetchNextStep: () => Promise<void>;
  setIntervalMs: (ms: number) => void;
  disconnect: () => void;
}

// ─── Estado inicial ───────────────────────────────────────────────────────────

const STATS_INICIAL: SimulationStats = {
  density: 0,
  livingCells: 0,
  executionTime: '00:00:00',
  enTransito: 0,
  enCambuche: 0,
  enComedor: 0,
  enZonaConsumo: 0,
  enZonaRepulsora: 0,
  totalAgentes: 0,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSimulationStore = create<SimulationState>((set, get) => ({
  simulationId: null,
  isRunning: false,
  currentGeneration: 0,
  maxGenerations: 100,
  data: null,
  history: [],
  intervalMs: 1000,
  stats: STATS_INICIAL,

  setSimulationId: (id: string) => set({ simulationId: id }),
  setMaxGenerations: (max: number) => set({ maxGenerations: max }),

  startSimulation: () => {
    if (get().isRunning) return;
    set({ isRunning: true });

    const tick = async (): Promise<void> => {
      const state = get();
      if (!state.isRunning || state.currentGeneration >= state.maxGenerations) {
        set({ isRunning: false });
        return;
      }
      await state.fetchNextStep();
      setTimeout(tick, get().intervalMs);
    };

    tick();
  },

  pauseSimulation: () => set({ isRunning: false }),

  resetSimulation: () => {
    const { simulationId } = get();
    if (simulationId) {
      http.post(`/simulations/${simulationId}/reset`, {}).catch(() => null);
    }
    set({ currentGeneration: 0, isRunning: false, data: null, history: [], stats: STATS_INICIAL });
  },

  disconnect: () =>
    set({ simulationId: null, isRunning: false, currentGeneration: 0, data: null, history: [], stats: STATS_INICIAL }),

  fetchNextStep: async () => {
    const { simulationId, currentGeneration } = get();
    if (!simulationId) return;

    try {
      // 1. Avanzar 1 generación con el motor espacial
      await http.post(`/simulations/${simulationId}/run-espacial`, { generations: 1 });

      // 2. GeoJSON para el mapa
      const geoRes = await http.get<FeatureCollection<Geometry>>(`/simulations/${simulationId}/geojson`);

      // 3. Estado urbano con urban_stats
      const urbanRes = await http.get<any>(`/simulations/${simulationId}/estado-urbano`);

      if (!geoRes.ok || !geoRes.data) {
        set({ isRunning: false });
        return;
      }

      const geojson = geoRes.data;
      const meta = (geojson as any).properties || {};
      const urban = urbanRes.data?.urban_stats || {};
      const gridMeta = urbanRes.data?.grid || {};

      const activeCells = meta.alive_cells ?? gridMeta.alive_cells ?? geojson.features.length;
      const density = meta.density ?? gridMeta.population_density ?? 0;
      const generation = meta.generation ?? gridMeta.generation ?? currentGeneration + 1;

      const newPoint: HistoryPoint = {
        name: `G${generation}`,
        cells: activeCells,
        enComedor: urban.en_comedor ?? 0,
        enCambuche: urban.en_cambuche ?? 0,
        enTransito: urban.en_transito ?? 0,
      };

      set((state) => ({
        data: geojson,
        currentGeneration: generation,
        stats: {
          livingCells: activeCells,
          density,
          executionTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          enTransito: urban.en_transito ?? 0,
          enCambuche: urban.en_cambuche ?? 0,
          enComedor: urban.en_comedor ?? 0,
          enZonaConsumo: urban.en_zona_consumo ?? 0,
          enZonaRepulsora: urban.en_zona_repulsora ?? 0,
          totalAgentes: urban.total_agentes ?? activeCells,
        },
        history: [...state.history, newPoint].slice(-50),
      }));
    } catch (error) {
      console.error('Error en fetchNextStep:', error);
      set({ isRunning: false });
    }
  },

  setIntervalMs: (ms: number) => set({ intervalMs: ms }),
}));