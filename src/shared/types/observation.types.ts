export interface Observation {
  id: number;
  usuario_id: number;
  descripcion: string;
  numero_personas: number;
  estado_animo: string;
  factores_detectados: Record<string, string | number | boolean>;
  fecha_observacion: string;
  fecha_registro: string;
  latitud: number;
  longitud: number;
}

export interface ObservationCreate {
  fecha_observacion: string;
  latitud: number;
  longitud: number;
  numero_personas: number;
  descripcion: string;
  estado_animo: string;
  factores_detectados: Record<string, string | number | boolean>;
}