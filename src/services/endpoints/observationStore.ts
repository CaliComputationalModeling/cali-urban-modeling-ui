import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { observationEndpoints } from '@/services/endpoints';
import type { Observation, ObservationCreate } from '@/shared/types/observation.types';
import { toast } from 'sonner';

interface ObservationState {
  myObservations: Observation[];
  pendingSync: ObservationCreate[];
  isSyncing: boolean;
  isLoading: boolean;

  addObservation: (data: ObservationCreate) => Promise<void>;
  fetchMyObservations: (userId: number) => Promise<void>;
  syncOfflineData: () => Promise<void>;
}

export const useObservationStore = create<ObservationState>()(
  persist(
    (set, get) => ({
      myObservations: [],
      pendingSync: [],
      isSyncing: false,
      isLoading: false,

      addObservation: async (data: ObservationCreate) => {
        set({ isLoading: true });
        
        try {
          const response = await observationEndpoints.create(data);
          
          if (response.ok) {
            toast.success("Observación guardada y enviada");
            // Actualizar lista local
            set(state => ({ 
              myObservations: [response.data!, ...state.myObservations],
              isLoading: false 
            }));
          } else {
            throw new Error("Error en servidor");
          }
        } catch (error) {
          // MODO OFFLINE: Si falla la red, guardamos en pendientes
          set(state => ({
            pendingSync: [...state.pendingSync, data],
            isLoading: false
          }));
          toast.warning("Sin conexión. La observación se guardó localmente y se sincronizará luego.");
        }
      },

      fetchMyObservations: async (userId: number) => {
        set({ isLoading: true });
        const response = await observationEndpoints.getAll({ usuario_id: userId });
        if (response.ok) {
          set({ myObservations: response.data ?? [], isLoading: false });
        } else {
          set({ isLoading: false });
        }
      },

      syncOfflineData: async () => {
        const { pendingSync, isSyncing } = get();
        if (pendingSync.length === 0 || isSyncing) return;

        set({ isSyncing: true });
        toast.info(`Sincronizando ${pendingSync.length} observaciones pendientes...`);

        const successfulSyncs: number[] = [];
        
        for (let i = 0; i < pendingSync.length; i++) {
          const res = await observationEndpoints.create(pendingSync[i]);
          if (res.ok) successfulSyncs.push(i);
        }

        set(state => ({
          pendingSync: state.pendingSync.filter((_, idx) => !successfulSyncs.includes(idx)),
          isSyncing: false
        }));

        if (successfulSyncs.length > 0) {
          toast.success(`${successfulSyncs.length} observaciones sincronizadas correctamente`);
          // Refrescar lista
          const userId = Number(localStorage.getItem('user_id'));
          if (userId) get().fetchMyObservations(userId);
        }
      }
    }),
    {
      name: 'simcore-observations-storage',
      partialize: (state) => ({ pendingSync: state.pendingSync }),
    }
  )
);
