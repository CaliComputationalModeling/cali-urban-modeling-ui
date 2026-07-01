export function getScenarioErrorMessages(data: unknown): string[] {
  if (!data || typeof data !== 'object' || !('detail' in data)) return ['Error inesperado del servidor']

  const detail = (data as { detail: unknown }).detail
  if (typeof detail === 'string') return [detail]
  if (!Array.isArray(detail)) return [JSON.stringify(detail)]

  return detail.map((item) => {
    if (!item || typeof item !== 'object') return String(item)
    const error = item as { loc?: unknown[]; msg?: unknown; type?: unknown }
    const loc = Array.isArray(error.loc) ? error.loc.join('.') : 'archivo'
    return `${loc}: ${String(error.msg ?? error.type ?? 'validación inválida')}`
  })
}
