import { create } from 'zustand';
import http from '@/services/http';
import { FeatureCollection, Geometry } from 'geojson';

interface SimulationStats {
    density: number;
    livingCells: number;
    executionTime: string;
}

interface HistoryPoint {
    name: string;
    cells: number;
}

interface SimulationState {
    simulationId: string | null;
    isRunning: boolean;
    currentGeneration: number;
    maxGenerations: number;
    data: FeatureCollection<Geometry> | null;
    history: HistoryPoint[]; // Para la gráfica de Recharts
    intervalMs: number;
    stats: SimulationStats;
    
    setSimulationId: (id: string) => void;
    setMaxGenerations: (max: number) => void;
    startSimulation: () => void;
    pauseSimulation: () => void;
    resetSimulation: () => void;
    fetchNextStep: () => Promise<void>;
    setIntervalMs: (ms: number) => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
    simulationId: null,
    isRunning: false,
    currentGeneration: 0,
    maxGenerations: 100,
    data: null,
    history: [],
    intervalMs: 1000,
    stats: { density: 0, livingCells: 0, executionTime: '00:00:00' },

    setSimulationId: (id: string) => set({ simulationId: id }),
    setMaxGenerations: (max: number) => set({ maxGenerations: max }),

    startSimulation: () => {
        if (get().isRunning) return;
        set({ isRunning: true });
        
        const tick = async (): Promise<void> => {
            const state = get(); 
            if (!state.isRunning || state.currentGeneration >= state.maxGenerations) {
                console.log("🛑 SIMULACIÓN FINALIZADA O PAUSADA");
                set({ isRunning: false });
                return;
            }

            await state.fetchNextStep();
            
            // Usamos el intervalo de tiempo configurado en el slider
            setTimeout(tick, get().intervalMs);
        };

        tick();
    },

    pauseSimulation: () => set({ isRunning: false }),

    resetSimulation: () => {
        // Opcional: Podrías llamar al endpoint /reset del backend aquí
        set({ 
            currentGeneration: 0, 
            isRunning: false, 
            data: null,
            history: [],
            stats: { density: 0, livingCells: 0, executionTime: '00:00:00' }
        });
    },

    fetchNextStep: async () => {
        const { simulationId, currentGeneration } = get();
        if (!simulationId) return;

        try {
            // --- PASO 1: ORDENAR EVOLUCIÓN AL BACKEND ---
            // Llamamos a /run para que el motor de Python avance 1 generación
            await http.post(`/simulations/${simulationId}/run`, { 
                generations: 1 
            });

            // --- PASO 2: OBTENER RESULTADO GEOJSON ---
            const response = await http.get<FeatureCollection<Geometry>>(
                `/simulations/${simulationId}/geojson`
            );

            if (response.ok && response.data) {
                const geojson = response.data;
                
                // 📝 DEBUGGER DE PAYLOAD COMPLETO
                console.group(`🧬 GENERACIÓN ENTRANTE: ${currentGeneration + 1}`);
                console.log("Estructura:", geojson);
                console.log("Celdas vivas:", geojson.features.length);
                console.log("Metadatos root:", geojson.features[0]?.properties);
                console.groupEnd();

                // Extraemos metadata del backend
                const meta = (geojson as any).properties || geojson.features?.[0]?.properties;
                const activeCells = meta?.alive_cells || geojson.features.length || 0;

                set((state) => ({
                    data: geojson,
                    currentGeneration: meta?.generation || state.currentGeneration + 1, 
                    stats: {
                        livingCells: activeCells,
                        density: meta?.density || 0,
                        executionTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    },
                    // Actualizamos el historial para la gráfica (mantenemos los últimos 30 puntos)
                    history: [...state.history, { 
                        name: `G${meta?.generation || state.currentGeneration + 1}`, 
                        cells: activeCells 
                    }].slice(-30)
                }));
            } else {
                set({ isRunning: false });
            }
        } catch (error) {
            console.error("❌ Error crítico en el flujo de simulación:", error);
            set({ isRunning: false });
        }
    },

    setIntervalMs: (ms: number) => set({ intervalMs: ms }),
}));