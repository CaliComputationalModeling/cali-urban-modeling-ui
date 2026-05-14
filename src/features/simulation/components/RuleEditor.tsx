import { useState } from 'react'
import { simulationEndpoints } from '@/services/endpoints/simulation.endpoints'

interface Props {
  ruleId?: number
  onClose: () => void
}

function getBackendErrorMessage(data: unknown): string {
  if (!data || typeof data !== 'object' || !('detail' in data)) return 'Error al actualizar reglas'

  const detail = (data as { detail: unknown }).detail
  if (typeof detail === 'string') return detail
  if (!Array.isArray(detail)) return JSON.stringify(detail)

  return detail
    .map((item) => {
      if (!item || typeof item !== 'object') return String(item)
      const error = item as { loc?: unknown[]; msg?: unknown; type?: unknown }
      const loc = Array.isArray(error.loc) ? error.loc.join('.') : 'body'
      return `${loc}: ${String(error.msg ?? error.type ?? 'validacion invalida')}`
    })
    .join(' | ')
}

export const RuleEditor = ({ ruleId = 1, onClose }: Props) => {
  const [atractivoComercial, setAtractivoComercial] = useState<number>(0.25)
  const [proximidadTransporte, setProximidadTransporte] = useState<number>(0.25)
  const [seguridad, setSeguridad] = useState<number>(0.25)
  const [densidadActual, setDensidadActual] = useState<number>(0.25)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateSum = (...values: number[]) => Math.abs(values.reduce((sum, value) => sum + value, 0) - 1.0) < 1e-6

  const handleSave = async () => {
    setError(null)
    if (!validateSum(atractivoComercial, proximidadTransporte, seguridad, densidadActual)) {
      setError('La suma de los pesos debe ser exactamente 1.0')
      return
    }

    setLoading(true)
    try {
      const res = await simulationEndpoints.updateRuleWeights(ruleId, {
        pesos: {
          atractivo_comercial: atractivoComercial,
          proximidad_transporte: proximidadTransporte,
          seguridad,
          densidad_actual: densidadActual,
        },
      })
      if (!res.ok) {
        if (res.status === 403) setError('No tiene permisos para actualizar reglas')
        else setError(getBackendErrorMessage(res.data))
      } else {
        onClose()
      }
    } catch (e) {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3>Editar Pesos de Regla</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          <label>
            Atractivo comercial
            <input type="number" step="0.01" min={0} max={1} value={atractivoComercial} onChange={(e) => setAtractivoComercial(Number(e.target.value))} />
          </label>
          <label>
            Proximidad transporte
            <input type="number" step="0.01" min={0} max={1} value={proximidadTransporte} onChange={(e) => setProximidadTransporte(Number(e.target.value))} />
          </label>
          <label>
            Seguridad
            <input type="number" step="0.01" min={0} max={1} value={seguridad} onChange={(e) => setSeguridad(Number(e.target.value))} />
          </label>
          <label>
            Densidad actual
            <input type="number" step="0.01" min={0} max={1} value={densidadActual} onChange={(e) => setDensidadActual(Number(e.target.value))} />
          </label>
          {error && <div className="text-error">{error}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} disabled={loading}>Cancelar</button>
            <button onClick={handleSave} disabled={loading}>Guardar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
