/**
 * Catálogo de tipos de atractor físico (Etapa 4).
 * Fuente única: `app.domain.models.atractor_fisico.TIPOS_ATRACTOR_FISICO`.
 * Se normaliza el texto para soportar variantes en el backend y evitar íconos vacíos.
 */
export const ATRACTOR_EMOJI_CATALOG: Record<string, string> = {
  fachadas_ciegas: '🧱',
  vias_deterioradas: '🚧',
  residuos: '🗑️',
  deficiencia_iluminacion: '💡',
  cai_policial: '👮',
  guardia_seguridad: '🛡️',
  fachadas_ciegas_urbanas: '🧱',
  via_deteriorada: '🚧',
  via_deterioradas: '🚧',
  residuos_solidos: '🗑️',
  iluminacion_deficiente: '💡',
}

/** Fallback visual para tipos desconocidos (no debería ocurrir). */
export const DEFAULT_ATTRACTOR_EMOJI = '📍'

function normalizeAtractorType(tipo: string | undefined | null): string {
  if (!tipo) return ''
  return tipo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function emojiForAtractor(tipo: string | undefined | null): string {
  const normalized = normalizeAtractorType(tipo)
  if (!normalized) return DEFAULT_ATTRACTOR_EMOJI
  return ATRACTOR_EMOJI_CATALOG[normalized] ?? DEFAULT_ATTRACTOR_EMOJI
}
