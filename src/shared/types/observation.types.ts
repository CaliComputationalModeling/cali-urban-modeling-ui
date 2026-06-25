export interface Observation {
  id: number;
  usuario_id: number;
  tipo_observacion: ObservationType;
  descripcion: string;
  numero_personas: number;
  estado_animo: string;
  factores_detectados: Record<string, string | number | boolean>;
  tags: ObservationTag[];
  fotografias: string[];
  estado: 'Activo' | 'Eliminado';
  fecha_observacion: string;
  fecha_registro: string;
  actualizado_en?: string | null;
  eliminado_por?: number | null;
  eliminado_en?: string | null;
  latitud: number;
  longitud: number;
}

export type ObservationType = 'Interacción' | 'Incidencia' | 'Avistamiento';
export type ObservationTag = 'Drogas' | 'Conflicto' | 'Refugio Imprevisto' | 'Salud' | 'Alimentación' | 'Movilidad' | 'Riesgo';
export type MoodState = 'tranquilo' | 'neutral' | 'alterado' | 'vulnerable' | 'agresivo';

export interface ObservationCreate {
  fecha_observacion: string;
  tipo_observacion: ObservationType;
  latitud: number;
  longitud: number;
  numero_personas: number;
  descripcion: string;
  estado_animo: MoodState;
  factores_detectados: Record<string, string | number | boolean>;
  tags: ObservationTag[];
}

export interface ObservationListResponse {
  items: Observation[];
  total: number;
  limit: number;
  offset: number;
}
