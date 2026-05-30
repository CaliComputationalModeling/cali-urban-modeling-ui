import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Database, CheckCircle2, FolderOpen, PlusCircle, X, Loader2 } from 'lucide-react'
import { useSimulationStore } from '@/store/simulationStore'
import { createSimulationId } from '@/shared/contracts/simulation.contract'

const createSimSchema = z.object({
  nombre: z.string().min(3, 'Mínimo 3 caracteres').optional().default('Simulación sin nombre'),
  descripcion: z.string().optional(),
  version_escenario_id: z.coerce.number().int().min(1, 'ID de escenario requerido'),
  generaciones: z.coerce.number().int().min(1).max(10000),
  radio_suavizado: z.coerce.number().int().min(1).max(50),
  movilidad: z.coerce.number().min(0).max(1),
  permanencia_base: z.coerce.number().min(0).max(1),
  sensibilidad_atractivo: z.coerce.number().min(0.1).max(5),
})

type CreateSimForm = z.infer<typeof createSimSchema>

export const SimulationLoader = () => {
  const [inputId, setInputId] = useState('')
  const [mode, setMode] = useState<'connect' | 'create'>('connect')

  const simulationId = useSimulationStore((s) => s.simulationId)
  const error = useSimulationStore((s) => s.error)
  const pollingStatus = useSimulationStore((s) => s.pollingStatus)
  const loadedPasos = useSimulationStore((s) => s.loadedPasos)
  const setSimulationId = useSimulationStore((s) => s.setSimulationId)
  const disconnect = useSimulationStore((s) => s.disconnect)
  const createSimulation = useSimulationStore((s) => s.createSimulation)

  const isConnected = Boolean(simulationId)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSimForm>({
    resolver: zodResolver(createSimSchema),
    defaultValues: {
      nombre: 'Simulación Cali-Centro-2026',
      descripcion: 'Simulación de movilidad urbana',
      version_escenario_id: 1,
      generaciones: 100,
      radio_suavizado: 2,
      movilidad: 0.35,
      permanencia_base: 0.15,
      sensibilidad_atractivo: 1.5,
    },
  })

  const handleConnect = () => {
    if (!inputId.trim()) return
    setSimulationId(createSimulationId(inputId.trim()))
  }

  const onCreateSubmit = async (data: CreateSimForm) => {
    await createSimulation(data)
    if (useSimulationStore.getState().simulationId) {
      reset()
      setMode('connect')
    }
  }

  // ── Estado conectado ───────────────────────────────────────────────────────

  if (isConnected) {
    return (
      <div className="sim-loader connected">
        <div className="sim-loader-icon">
          <CheckCircle2 size={22} />
        </div>
        <div className="sim-loader-body">
          <p className="sim-loader-label">ESCENARIO ACTIVO — {loadedPasos.length} pasos</p>
          <input className="sim-loader-input" value={simulationId!} readOnly disabled />
        </div>
        <button onClick={disconnect} className="sim-loader-btn disconnect" title="Desconectar">
          <X size={15} /> DESCONECTAR
        </button>
      </div>
    )
  }

  // ── Formulario de creación ─────────────────────────────────────────────────

  if (mode === 'create') {
    return (
      <div className="sim-loader sim-loader-form">
        <div className="sim-loader-form-header">
          <div className="sim-loader-icon"><PlusCircle size={22} /></div>
          <div>
            <p className="sim-loader-label">NUEVA SIMULACION</p>
            <p className="sim-loader-sublabel">Configura los parámetros de ejecución</p>
          </div>
          <button type="button" className="sim-loader-btn-close" onClick={() => setMode('connect')}>
            <X size={16} />
          </button>
        </div>

        {/* Barra de progreso mientras ejecuta */}
        {pollingStatus && (
          <div style={{ padding: '8px 12px', marginBottom: 8, backgroundColor: '#0f172a', border: '1px solid #1d4ed8', borderRadius: 4, fontSize: '13px', color: '#60a5fa' }}>
            ⏳ {pollingStatus}
          </div>
        )}

        <form onSubmit={handleSubmit(onCreateSubmit)} noValidate className="sim-create-form">
          <fieldset className="sim-form-section">
            <legend className="sim-form-section-title">📋 METADATOS</legend>
            <div className="sim-form-row">
              <div className="sim-form-group sim-form-grow">
                <label className="sim-form-label">NOMBRE</label>
                <input {...register('nombre')} className="sim-form-input" placeholder="Ej: Cali-Centro-2026" disabled={isSubmitting} />
                {errors.nombre && <p className="sim-form-error">{errors.nombre.message}</p>}
              </div>
              <div className="sim-form-group sim-form-grow">
                <label className="sim-form-label">DESCRIPCIÓN</label>
                <input {...register('descripcion')} className="sim-form-input" placeholder="Opcional" disabled={isSubmitting} />
              </div>
            </div>
          </fieldset>

          <fieldset className="sim-form-section">
            <legend className="sim-form-section-title">⚙️ PARÁMETROS DE EJECUCIÓN</legend>
            <div className="sim-form-row">
              <div className="sim-form-group">
                <label className="sim-form-label">ID VERSIÓN ESCENARIO</label>
                <input type="number" {...register('version_escenario_id')} className="sim-form-input sim-form-number" disabled={isSubmitting} />
                {errors.version_escenario_id && <p className="sim-form-error">{errors.version_escenario_id.message}</p>}
              </div>
              <div className="sim-form-group">
                <label className="sim-form-label">GENERACIONES</label>
                <input type="number" {...register('generaciones')} className="sim-form-input sim-form-number" disabled={isSubmitting} />
                {errors.generaciones && <p className="sim-form-error">{errors.generaciones.message}</p>}
              </div>
              <div className="sim-form-group">
                <label className="sim-form-label">RADIO SUAVIZADO</label>
                <input type="number" {...register('radio_suavizado')} className="sim-form-input sim-form-number" disabled={isSubmitting} />
                {errors.radio_suavizado && <p className="sim-form-error">{errors.radio_suavizado.message}</p>}
              </div>
            </div>
            <div className="sim-form-row">
              <div className="sim-form-group">
                <label className="sim-form-label">MOVILIDAD (0-1)</label>
                <input type="number" step="0.05" {...register('movilidad')} className="sim-form-input sim-form-number" disabled={isSubmitting} />
                {errors.movilidad && <p className="sim-form-error">{errors.movilidad.message}</p>}
              </div>
              <div className="sim-form-group">
                <label className="sim-form-label">PERMANENCIA BASE (0-1)</label>
                <input type="number" step="0.05" {...register('permanencia_base')} className="sim-form-input sim-form-number" disabled={isSubmitting} />
                {errors.permanencia_base && <p className="sim-form-error">{errors.permanencia_base.message}</p>}
              </div>
              <div className="sim-form-group">
                <label className="sim-form-label">SENSIBILIDAD ATRACTIVO</label>
                <input type="number" step="0.1" {...register('sensibilidad_atractivo')} className="sim-form-input sim-form-number" disabled={isSubmitting} />
                {errors.sensibilidad_atractivo && <p className="sim-form-error">{errors.sensibilidad_atractivo.message}</p>}
              </div>
            </div>
          </fieldset>

          {error && <p className="sim-loader-error">❌ {error}</p>}

          <div className="sim-form-actions">
            <button type="button" onClick={() => setMode('connect')} className="sim-loader-btn" disabled={isSubmitting}>
              CANCELAR
            </button>
            <button type="submit" disabled={isSubmitting} className="sim-loader-btn create">
              {isSubmitting
                ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> EJECUTANDO...</>
                : <><PlusCircle size={15} /> CREAR Y EJECUTAR</>}
            </button>
          </div>
        </form>
      </div>
    )
  }

  // ── Modo conectar ──────────────────────────────────────────────────────────

  return (
    <div className="sim-loader">
      <div className="sim-loader-icon"><Database size={22} /></div>
      <div className="sim-loader-body">
        <p className="sim-loader-label">CARGAR EJECUCIÓN EXISTENTE</p>
        <input
          className="sim-loader-input"
          placeholder="ID de ejecución — ej: 42"
          value={inputId}
          onChange={(e) => setInputId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
        />
        {error && <p className="sim-loader-error">{error}</p>}
      </div>
      <div className="sim-loader-actions">
        <button onClick={handleConnect} disabled={!inputId.trim()} className="sim-loader-btn">
          <FolderOpen size={15} /> CONECTAR
        </button>
        <button onClick={() => setMode('create')} className="sim-loader-btn create">
          <PlusCircle size={15} /> NUEVA
        </button>
      </div>
    </div>
  )
}