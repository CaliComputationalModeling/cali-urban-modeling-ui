import { useEffect, useState } from 'react'
import { Loader2, MapPin, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { observationEndpoints } from '@/services/endpoints'
import type { Observation, ObservationCreate } from '@/shared/types/observation.types'

const emptyForm: ObservationCreate = {
  fecha_observacion: '',
  latitud: 3.4372,
  longitud: -76.5225,
  numero_personas: 1,
  descripcion: '',
  estado_animo: 'neutral',
  factores_detectados: {},
}

export const ObservationsPage = () => {
  const [observations, setObservations] = useState<Observation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [form, setForm] = useState<ObservationCreate>(emptyForm)
  const [factoresText, setFactoresText] = useState('{}')

  const fetchObservations = async () => {
    setIsLoading(true)
    const res = await observationEndpoints.getAll()
    if (res.ok) setObservations(res.data)
    else toast.error('No fue posible cargar observaciones')
    setIsLoading(false)
  }

  useEffect(() => {
    fetchObservations().catch(() => null)
  }, [])

  const createObservation = async () => {
    let factores: Record<string, string | number | boolean> = {}
    try {
      factores = JSON.parse(factoresText)
    } catch {
      toast.error('Factores detectados debe ser JSON valido')
      return
    }

    const res = await observationEndpoints.create({
      ...form,
      fecha_observacion: `${form.fecha_observacion || new Date().toISOString().slice(0, 16)}:00`,
      factores_detectados: factores,
    })
    if (res.ok) {
      toast.success('Observacion creada')
      setForm(emptyForm)
      setFactoresText('{}')
      fetchObservations().catch(() => null)
    } else {
      toast.error('No fue posible crear la observacion')
    }
  }

  const deleteObservation = async (id: number) => {
    const res = await observationEndpoints.delete(String(id))
    if (res.ok) {
      toast.success('Observacion eliminada')
      setObservations((items) => items.filter((item) => item.id !== id))
    } else {
      toast.error('No fue posible eliminar la observacion')
    }
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="page-header-left">
          <p className="page-eyebrow">Campo / Registro</p>
          <h1 className="page-title">Observaciones</h1>
        </div>
      </div>

      <section className="table-card" style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div>
            <label className="sheet-form-label">Fecha y hora</label>
            <input type="datetime-local" className="sheet-input" value={form.fecha_observacion} onChange={(e) => setForm({ ...form, fecha_observacion: e.target.value })} />
          </div>
          <div>
            <label className="sheet-form-label">Latitud</label>
            <input type="number" step="0.000001" className="sheet-input" value={form.latitud} onChange={(e) => setForm({ ...form, latitud: Number(e.target.value) })} />
          </div>
          <div>
            <label className="sheet-form-label">Longitud</label>
            <input type="number" step="0.000001" className="sheet-input" value={form.longitud} onChange={(e) => setForm({ ...form, longitud: Number(e.target.value) })} />
          </div>
          <div>
            <label className="sheet-form-label">Personas</label>
            <input type="number" min={1} className="sheet-input" value={form.numero_personas} onChange={(e) => setForm({ ...form, numero_personas: Number(e.target.value) })} />
          </div>
          <div>
            <label className="sheet-form-label">Estado</label>
            <input className="sheet-input" value={form.estado_animo} onChange={(e) => setForm({ ...form, estado_animo: e.target.value })} />
          </div>
          <div>
            <label className="sheet-form-label">Factores JSON</label>
            <input className="sheet-input" value={factoresText} onChange={(e) => setFactoresText(e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label className="sheet-form-label">Descripcion</label>
          <input className="sheet-input" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="action-button" onClick={createObservation}><Plus size={18} />Crear observacion</button>
        </div>
      </section>

      <section className="table-card">
        {isLoading ? (
          <div className="loading-state">
            <Loader2 size={32} style={{ animation: 'spin 0.8s linear infinite' }} />
            <p className="loading-text">CARGANDO OBSERVACIONES</p>
          </div>
        ) : (
          <table className="user-table-custom">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Personas</th>
                <th>Ubicacion</th>
                <th>Descripcion</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {observations.map((obs) => (
                <tr key={obs.id}>
                  <td><span className="mono-id">#{obs.id}</span></td>
                  <td>{obs.fecha_observacion}</td>
                  <td>{obs.numero_personas}</td>
                  <td><MapPin size={14} /> {obs.latitud}, {obs.longitud}</td>
                  <td>{obs.descripcion}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="icon-btn delete" onClick={() => deleteObservation(obs.id)} title="Eliminar">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
