import { http } from "../http";
import type { Observation, ObservationCreate, ObservationListResponse } from "@/shared/types/observation.types";

interface ObservationBackend {
  id: number;
  usuario_id: number;
  ubicacion_wkt: string;
  fecha_observacion: string;
  fecha_registro: string;
  tipo_observacion: Observation['tipo_observacion'];
  descripcion: string | null;
  numero_personas: number | null;
  estado_animo: string | null;
  factores_detectados: Record<string, string | number | boolean>;
  tags?: Observation['tags'];
  fotografias?: string[];
  estado: Observation['estado'];
  actualizado_en?: string | null;
  eliminado_por?: number | null;
  eliminado_en?: string | null;
}

interface ObservationListBackend {
  items: ObservationBackend[];
  total: number;
  limit: number;
  offset: number;
}

interface ObservationCreateBackend {
  ubicacion_wkt: string;
  fecha_observacion: string;
  tipo_observacion: Observation['tipo_observacion'];
  descripcion?: string;
  numero_personas?: number;
  estado_animo?: string;
  factores_detectados: Record<string, string | number | boolean>;
  tags: Observation['tags'];
}

function toBackendPayload(data: ObservationCreate): ObservationCreateBackend {
  return {
    ubicacion_wkt: `POINT (${data.longitud} ${data.latitud})`,
    fecha_observacion: data.fecha_observacion,
    tipo_observacion: data.tipo_observacion,
    descripcion: data.descripcion,
    numero_personas: data.numero_personas,
    estado_animo: data.estado_animo,
    factores_detectados: data.factores_detectados,
    tags: data.tags,
  };
}

function parsePointWkt(wkt: string): { latitud: number; longitud: number } {
  const match = /^POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)$/i.exec(wkt.trim());
  if (!match) return { latitud: 0, longitud: 0 };
  return { longitud: Number(match[1]), latitud: Number(match[2]) };
}

function toFrontendObservation(data: ObservationBackend): Observation {
  const coords = parsePointWkt(data.ubicacion_wkt);
  return {
    id: data.id,
    usuario_id: data.usuario_id,
    tipo_observacion: data.tipo_observacion,
    descripcion: data.descripcion ?? '',
    numero_personas: data.numero_personas ?? 0,
    estado_animo: data.estado_animo ?? '',
    factores_detectados: data.factores_detectados ?? {},
    tags: data.tags ?? [],
    fotografias: data.fotografias ?? [],
    estado: data.estado,
    fecha_observacion: data.fecha_observacion,
    fecha_registro: data.fecha_registro,
    actualizado_en: data.actualizado_en,
    eliminado_por: data.eliminado_por,
    eliminado_en: data.eliminado_en,
    latitud: coords.latitud,
    longitud: coords.longitud,
  };
}

function toFrontendPage(data: ObservationListBackend): ObservationListResponse {
  return {
    items: Array.isArray(data.items) ? data.items.map(toFrontendObservation) : [],
    total: data.total ?? 0,
    limit: data.limit ?? 50,
    offset: data.offset ?? 0,
  };
}

export const observationEndpoints = {
  getAll: (params?: { 
    usuario_id?: number;
  }) =>
    http.get<ObservationBackend[]>("/observations", {
      params: params
        ? Object.fromEntries(
            Object.entries(params)
              .filter(([, v]) => v !== undefined && v !== null)
              .map(([k, v]) => [k, String(v)])
          )
        : undefined,
    }).then((response) => ({
      ...response,
      data: Array.isArray(response.data) ? response.data.map(toFrontendObservation) : [],
    })),
  getPage: (params?: {
    fecha_inicio?: string;
    fecha_fin?: string;
    tipo_observacion?: string;
    busqueda?: string;
    limit?: number;
    offset?: number;
  }) =>
    http.get<ObservationListBackend>("/api/observaciones", {
      params: params
        ? Object.fromEntries(
            Object.entries(params)
              .filter(([, v]) => v !== undefined && v !== null && v !== '')
              .map(([k, v]) => [k, String(v)])
          )
        : undefined,
    }).then((response) => ({
      ...response,
      data: response.data ? toFrontendPage(response.data) : { items: [], total: 0, limit: 50, offset: 0 },
    })),
  getById: (id: number) =>
    http.get<ObservationBackend>(`/observations/${id}`).then((response) => ({
      ...response,
      data: response.data ? toFrontendObservation(response.data) : response.data,
    })),
  create: (data: ObservationCreate) => {
    const payload = toBackendPayload(data);
    console.log('Payload observacion:', payload);
    return http.post<ObservationBackend>("/api/observaciones", payload).then((response) => ({
      ...response,
      data: response.data ? toFrontendObservation(response.data) : response.data,
    }));
  },
  update: (id: string, data: Partial<ObservationCreate>) =>
    http.put<ObservationBackend>(`/api/observaciones/${id}`, data.latitud !== undefined && data.longitud !== undefined ? toBackendPayload(data as ObservationCreate) : data).then((response) => ({
      ...response,
      data: response.data ? toFrontendObservation(response.data) : response.data,
    })),
  delete: (id: string) =>
    http.delete(`/api/observaciones/${id}`),
  uploadPhotos: (id: number, files: File[]) => {
    const formData = new FormData();
    for (const file of files) formData.append('files', file);
    return http.postForm<ObservationBackend>(`/api/observaciones/${id}/fotografias`, formData).then((response) => ({
      ...response,
      data: response.data ? toFrontendObservation(response.data) : response.data,
    }));
  },
};
