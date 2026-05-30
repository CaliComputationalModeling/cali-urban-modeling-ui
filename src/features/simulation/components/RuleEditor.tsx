import { useState } from 'react'
import { simulationEndpoints } from '@/services/endpoints/simulation.endpoints'
import type { ReglaTransicionResponse } from '@/services/endpoints/simulation.endpoints'

interface Props {
  ruleId?: number
  onClose: () => void
}

function getBackendErrorMessage(data: unknown): string {
  if (!data || typeof data !== 'object' || !('detail' in data)) return 'Error al guardar regla'
  const detail = (data as { detail: unknown }).detail
  if (typeof detail === 'string') return detail
  if (!Array.isArray(detail)) return JSON.stringify(detail)
  return detail
    .map((item) => {
      if (!item || typeof item !== 'object') return String(item)
      const e = item as { loc?: unknown[]; msg?: unknown; type?: unknown }
      const loc = Array.isArray(e.loc) ? e.loc.join('.') : 'body'
      return `${loc}: ${String(e.msg ?? e.type ?? 'validacion invalida')}`
    })
    .join(' | ')
}

export const RuleEditor = ({ ruleId, onClose }: Props) => {
  // Modo: 'edit' si hay ruleId, 'create' si no
  const isCreateMode = ruleId === undefined

  const [nombreRegla, setNombreRegla] = useState('Regla de movilidad')
  const [formula, setFormula] = useState('atractivo_comercial * w1 + proximidad_transporte * w2 + seguridad * w3 + densidad_actual * w4')
  const [descripcion, setDescripcion] = useState('')
  const [atractivoComercial, setAtractivoComercial] = useState(0.25)
  const [proximidadTransporte, setProximidadTransporte] = useState(0.25)
  const [seguridad, setSeguridad] = useState(0.25)
  const [densidadActual, setDensidadActual] = useState(0.25)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdRule, setCreatedRule] = useState<ReglaTransicionResponse | null>(null)

  const suma = atractivoComercial + proximidadTransporte + seguridad + densidadActual
  const sumaValida = Math.abs(suma - 1.0) < 1e-6

  const handleSave = async () => {
    setError(null)
    if (!sumaValida) {
      setError(`La suma de los pesos debe ser 1.0 (actual: ${suma.toFixed(4)})`)
      return
    }

    const pesos = {
      atractivo_comercial: atractivoComercial,
      proximidad_transporte: proximidadTransporte,
      seguridad,
      densidad_actual: densidadActual,
    }

    setLoading(true)
    try {
      if (isCreateMode) {
        // POST /api/reglas
        const res = await simulationEndpoints.createRule({
          nombre_regla: nombreRegla,
          formula,
          pesos,
          descripcion: descripcion || undefined,
        })
        if (!res.ok) {
          setError(getBackendErrorMessage(res.data))
        } else {
          setCreatedRule(res.data)
        }
      } else {
        // PUT /api/reglas/{id}/pesos
        const res = await simulationEndpoints.updateRuleWeights(ruleId!, { pesos })
        if (!res.ok) {
          if (res.status === 403) setError('Sin permisos para actualizar reglas')
          else setError(getBackendErrorMessage(res.data))
        } else {
          onClose()
        }
      }
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }

  if (createdRule) {
    return (
      <div className="modal-backdrop">
        <div className="modal-card">
          <h3>Regla creada</h3>
          <p style={{ color: '#22c55e' }}>
            ✓ Regla <strong>{createdRule.nombre_regla}</strong> creada con ID <strong>{createdRule.id}</strong>
          </p>
          <p style={{ fontSize: 13, color: '#94a3b8' }}>
            Usa este ID como <code>regla_transicion_id</code> al crear un escenario.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <button onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3>{isCreateMode ? 'Nueva Regla de Transición' : 'Editar Pesos de Regla'}</h3>
        <div style={{ display: 'grid', gap: 8 }}>

          {isCreateMode && (
            <>
              <label>
                Nombre de la regla
                <input value={nombreRegla} onChange={(e) => setNombreRegla(e.target.value)} />
              </label>
              <label>
                Fórmula
                <input value={formula} onChange={(e) => setFormula(e.target.value)} />
              </label>
              <label>
                Descripción (opcional)
                <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
              </label>
            </>
          )}

          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
            Pesos — deben sumar exactamente 1.0 (actual: <span style={{ color: sumaValida ? '#22c55e' : '#ef4444' }}>{suma.toFixed(4)}</span>)
          </p>

          <label>
            Atractivo comercial
            <input type="number" step="0.05" min={0} max={1} value={atractivoComercial}
              onChange={(e) => setAtractivoComercial(Number(e.target.value))} />
          </label>
          <label>
            Proximidad transporte
            <input type="number" step="0.05" min={0} max={1} value={proximidadTransporte}
              onChange={(e) => setProximidadTransporte(Number(e.target.value))} />
          </label>
          <label>
            Seguridad
            <input type="number" step="0.05" min={0} max={1} value={seguridad}
              onChange={(e) => setSeguridad(Number(e.target.value))} />
          </label>
          <label>
            Densidad actual
            <input type="number" step="0.05" min={0} max={1} value={densidadActual}
              onChange={(e) => setDensidadActual(Number(e.target.value))} />
          </label>

          {error && <div className="text-error">{error}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} disabled={loading}>Cancelar</button>
            <button onClick={handleSave} disabled={loading || !sumaValida}>
              {isCreateMode ? 'Crear regla' : 'Guardar pesos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}