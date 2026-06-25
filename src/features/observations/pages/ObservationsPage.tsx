import { useEffect, useState } from 'react'
import { Edit3, Loader2, LocateFixed, MapPin, Plus, Save, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { observationEndpoints } from '@/services/endpoints'
import { Modal } from '@/shared/ui/Modal'
import type { MoodState, Observation, ObservationCreate, ObservationTag, ObservationType } from '@/shared/types/observation.types'

const OBSERVATION_TYPES: ObservationType[] = ['Interacción', 'Incidencia', 'Avistamiento']
const MOODS: MoodState[] = ['tranquilo', 'neutral', 'alterado', 'vulnerable', 'agresivo']
const TAGS: ObservationTag[] = ['Drogas', 'Conflicto', 'Refugio Imprevisto', 'Salud', 'Alimentación', 'Movilidad', 'Riesgo']

const nowLocal = () => new Date().toISOString().slice(0, 16)

const emptyForm: ObservationCreate = {
  fecha_observacion: nowLocal(),
  tipo_observacion: 'Avistamiento',
  latitud: 3.4372,
  longitud: -76.5225,
  numero_personas: 1,
  descripcion: '',
  estado_animo: 'neutral',
  factores_detectados: {},
  tags: [],
}

function toDatetimePayload(value: string): string {
  return `${value || nowLocal()}:00`
}

function imageUrl(path: string): string {
  return path.startsWith('http') ? path : `http://localhost:8000${path}`
}

function formFromObservation(obs: Observation): ObservationCreate {
  return {
    fecha_observacion: obs.fecha_observacion.slice(0, 16),
    tipo_observacion: obs.tipo_observacion,
    latitud: obs.latitud,
    longitud: obs.longitud,
    numero_personas: obs.numero_personas,
    descripcion: obs.descripcion,
    estado_animo: obs.estado_animo as MoodState,
    factores_detectados: obs.factores_detectados,
    tags: obs.tags,
  }
}

export const ObservationsPage = () => {
  const [observations, setObservations] = useState<Observation[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState<ObservationCreate>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
  const [deleteTarget, setDeleteTarget] = useState<Observation | null>(null)
  const [filters, setFilters] = useState({ busqueda: '', tipo_observacion: '', fecha_inicio: '', fecha_fin: '' })

  const fetchObservations = async () => {
    setIsLoading(true)
    const res = await observationEndpoints.getPage({
      busqueda: filters.busqueda,
      tipo_observacion: filters.tipo_observacion,
      fecha_inicio: filters.fecha_inicio ? toDatetimePayload(filters.fecha_inicio) : undefined,
      fecha_fin: filters.fecha_fin ? toDatetimePayload(filters.fecha_fin) : undefined,
      limit: 100,
      offset: 0,
    })
    if (res.ok) {
      setObservations(res.data.items)
      setTotal(res.data.total)
    } else {
      toast.error('No fue posible cargar observaciones')
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchObservations().catch(() => null)
  }, [])

  const validateForm = (): boolean => {
    if (!form.tipo_observacion) return toast.error('Selecciona el tipo de observación'), false
    if (!Number.isFinite(form.latitud) || !Number.isFinite(form.longitud)) return toast.error('Coordenadas inválidas'), false
    if (!form.descripcion.trim()) return toast.error('La descripción es obligatoria'), false
    if (form.numero_personas < 0) return toast.error('El número de personas no puede ser negativo'), false
    if (selectedPhotos.length > 3) return toast.error('Solo puedes cargar hasta 3 fotografías'), false
    return true
  }

  const resetForm = () => {
    setForm({ ...emptyForm, fecha_observacion: nowLocal() })
    setEditingId(null)
    setSelectedPhotos([])
  }

  const saveObservation = async () => {
    if (!validateForm()) return
    setIsSaving(true)

    const payload = { ...form, fecha_observacion: toDatetimePayload(form.fecha_observacion) }
    const res = editingId
      ? await observationEndpoints.update(String(editingId), payload)
      : await observationEndpoints.create(payload)

    if (!res.ok) {
      toast.error(editingId ? 'No fue posible actualizar la observación' : 'No fue posible crear la observación')
      setIsSaving(false)
      return
    }

    if (selectedPhotos.length > 0) {
      const photoRes = await observationEndpoints.uploadPhotos(res.data.id, selectedPhotos)
      if (!photoRes.ok) toast.error('La observación se guardó, pero falló la carga de fotografías')
    }

    toast.success(editingId ? 'Observación actualizada' : 'Observación creada')
    resetForm()
    await fetchObservations()
    setIsSaving(false)
  }

  const deleteObservation = async () => {
    if (!deleteTarget) return
    const res = await observationEndpoints.delete(String(deleteTarget.id))
    if (res.ok) {
      toast.success('Observación eliminada')
      setDeleteTarget(null)
      setObservations((items) => items.filter((item) => item.id !== deleteTarget.id))
    } else {
      toast.error('No fue posible eliminar la observación')
    }
  }

  const captureGps = () => {
    if (!navigator.geolocation) {
      toast.error('El navegador no soporta geolocalización')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          latitud: Number(position.coords.latitude.toFixed(6)),
          longitud: Number(position.coords.longitude.toFixed(6)),
        }))
        toast.success('GPS capturado')
      },
      () => toast.error('No fue posible capturar GPS'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const toggleTag = (tag: ObservationTag) => {
    setForm((current) => ({
      ...current,
      tags: current.tags.includes(tag) ? current.tags.filter((item) => item !== tag) : [...current.tags, tag],
    }))
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="page-header-left">
          <p className="page-eyebrow">Campo / Registro</p>
          <h1 className="page-title">Mis Observaciones</h1>
          <p className="text-muted">Crear corrige errores con Editar; elimina solo registros duplicados o inválidos.</p>
        </div>
      </div>

      <section className="table-card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <p style={{ margin: 0, fontWeight: 800 }}>{editingId ? `Editando observación #${editingId}` : 'Nueva observación de campo'}</p>
          {editingId && <button className="icon-btn" onClick={resetForm} title="Cancelar edición"><X size={16} /></button>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <label>
            <span className="sheet-form-label">Fecha y hora</span>
            <input type="datetime-local" className="sheet-input" value={form.fecha_observacion} onChange={(e) => setForm({ ...form, fecha_observacion: e.target.value })} />
          </label>
          <label>
            <span className="sheet-form-label">Tipo</span>
            <select className="sheet-select" value={form.tipo_observacion} onChange={(e) => setForm({ ...form, tipo_observacion: e.target.value as ObservationType })}>
              {OBSERVATION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label>
            <span className="sheet-form-label">Estado de ánimo</span>
            <select className="sheet-select" value={form.estado_animo} onChange={(e) => setForm({ ...form, estado_animo: e.target.value as MoodState })}>
              {MOODS.map((mood) => <option key={mood} value={mood}>{mood}</option>)}
            </select>
          </label>
          <label>
            <span className="sheet-form-label">Personas aprox.</span>
            <input type="number" min={0} className="sheet-input" value={form.numero_personas} onChange={(e) => setForm({ ...form, numero_personas: Number(e.target.value) })} />
          </label>
          <label>
            <span className="sheet-form-label">Latitud</span>
            <input type="number" step="0.000001" className="sheet-input" value={form.latitud} onChange={(e) => setForm({ ...form, latitud: Number(e.target.value) })} />
          </label>
          <label>
            <span className="sheet-form-label">Longitud</span>
            <input type="number" step="0.000001" className="sheet-input" value={form.longitud} onChange={(e) => setForm({ ...form, longitud: Number(e.target.value) })} />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button className="action-button" type="button" onClick={captureGps}><LocateFixed size={18} />Capturar GPS</button>
          <span className="text-muted" style={{ alignSelf: 'center' }}>También puedes corregir coordenadas manualmente.</span>
        </div>

        <label style={{ display: 'block', marginTop: 12 }}>
          <span className="sheet-form-label">Relato / descripción</span>
          <textarea className="sheet-input" style={{ minHeight: 90 }} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </label>

        <div style={{ marginTop: 12 }}>
          <span className="sheet-form-label">Etiquetas predefinidas</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {TAGS.map((tag) => (
              <button key={tag} type="button" className={form.tags.includes(tag) ? 'action-button' : 'icon-btn'} onClick={() => toggleTag(tag)}>
                {tag}
              </button>
            ))}
          </div>
        </div>

        <label style={{ display: 'block', marginTop: 12 }}>
          <span className="sheet-form-label">Fotografías (máximo 3)</span>
          <input type="file" accept="image/*" multiple className="sheet-input" onChange={(e) => setSelectedPhotos(Array.from(e.target.files ?? []).slice(0, 3))} />
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          {editingId && <button className="icon-btn" onClick={resetForm}>Cancelar</button>}
          <button className="action-button" onClick={saveObservation} disabled={isSaving}>
            {editingId ? <Save size={18} /> : <Plus size={18} />}{editingId ? 'Guardar cambios' : 'Crear observación'}
          </button>
        </div>
      </section>

      <section className="table-card" style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <input className="sheet-input" placeholder="Buscar en descripción" value={filters.busqueda} onChange={(e) => setFilters({ ...filters, busqueda: e.target.value })} />
          <select className="sheet-select" value={filters.tipo_observacion} onChange={(e) => setFilters({ ...filters, tipo_observacion: e.target.value })}>
            <option value="">Todos los tipos</option>
            {OBSERVATION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <input type="datetime-local" className="sheet-input" value={filters.fecha_inicio} onChange={(e) => setFilters({ ...filters, fecha_inicio: e.target.value })} />
          <input type="datetime-local" className="sheet-input" value={filters.fecha_fin} onChange={(e) => setFilters({ ...filters, fecha_fin: e.target.value })} />
          <button className="action-button" onClick={() => fetchObservations().catch(() => null)}>Filtrar</button>
        </div>
      </section>

      <section className="table-card">
        {isLoading ? (
          <div className="loading-state">
            <Loader2 size={32} style={{ animation: 'spin 0.8s linear infinite' }} />
            <p className="loading-text">CARGANDO OBSERVACIONES</p>
          </div>
        ) : (
          <>
            <p style={{ padding: '12px 16px', margin: 0, color: 'var(--color-text-muted)' }}>Mostrando {observations.length} de {total} registros activos</p>
            <table className="user-table-custom">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Personas</th>
                  <th>Ubicación</th>
                  <th>Tags</th>
                  <th>Fotos</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {observations.map((obs) => (
                  <tr key={obs.id}>
                    <td><span className="mono-id">#{obs.id}</span></td>
                    <td>{new Date(obs.fecha_observacion).toLocaleString('es-CO')}</td>
                    <td>{obs.tipo_observacion}</td>
                    <td>{obs.numero_personas}</td>
                    <td><MapPin size={14} /> {obs.latitud.toFixed(5)}, {obs.longitud.toFixed(5)}</td>
                    <td>{obs.tags.join(', ') || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {obs.fotografias.slice(0, 3).map((photo) => <img key={photo} src={imageUrl(photo)} alt="Observación" style={{ width: 34, height: 34, objectFit: 'cover', borderRadius: 6 }} />)}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="icon-btn" onClick={() => { setEditingId(obs.id); setForm(formFromObservation(obs)); setSelectedPhotos([]) }} title="Editar un error">
                        <Edit3 size={16} />
                      </button>
                      <button className="icon-btn delete" onClick={() => setDeleteTarget(obs)} title="Eliminar registro duplicado">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar observación"
        footer={(
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="icon-btn" onClick={() => setDeleteTarget(null)}>Cancelar</button>
            <button className="action-button" onClick={deleteObservation}>Eliminar definitivamente</button>
          </div>
        )}
      >
        <p>¿Está seguro? Esta acción es irreversible.</p>
        <p className="text-muted">Use esta acción solo para registros duplicados o inválidos. Para corregir errores, utilice Editar.</p>
      </Modal>
    </div>
  )
}
