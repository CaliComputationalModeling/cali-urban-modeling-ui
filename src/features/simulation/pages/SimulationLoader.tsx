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

// ── Escenarios predefinidos ───────────────────────────────────────────────────
// Cada escenario tiene parámetros ya calibrados y una descripción legible para
// usuarios no técnicos. Al seleccionar uno, el formulario se rellena automáticamente.
// Los parámetros están dentro del rango válido del backend (sin cambios en contrato).

interface EscenarioPredefinido {
  id: string
  nombre: string
  descripcion: string
  icono: string
  params: {
    generaciones: number
    radio_suavizado: number
    movilidad: number
    permanencia_base: number
    sensibilidad_atractivo: number
  }
}

const ESCENARIOS_PREDEFINIDOS: EscenarioPredefinido[] = [
  {
    id: 'clima_normal',
    nombre: 'Condiciones normales',
    descripcion: 'Simulación base con movilidad y permanencia promedio. Ideal para establecer una línea de referencia.',
    icono: '🌤',
    params: { generaciones: 80, radio_suavizado: 2, movilidad: 0.30, permanencia_base: 0.15, sensibilidad_atractivo: 1.2 },
  },
  {
    id: 'mayor_permanencia',
    nombre: 'Mayor permanencia',
    descripcion: 'Las personas tienden a quedarse más tiempo en las zonas de atractivo. Simula condiciones de acceso limitado a servicios.',
    icono: '🏕',
    params: { generaciones: 80, radio_suavizado: 2, movilidad: 0.15, permanencia_base: 0.40, sensibilidad_atractivo: 1.5 },
  },
  {
    id: 'alta_movilidad',
    nombre: 'Alta movilidad',
    descripcion: 'La población se desplaza con mayor frecuencia entre zonas. Simula escenarios de búsqueda activa de servicios o alerta.',
    icono: '🚶',
    params: { generaciones: 80, radio_suavizado: 1, movilidad: 0.55, permanencia_base: 0.08, sensibilidad_atractivo: 1.8 },
  },
  {
    id: 'mayor_cobertura',
    nombre: 'Mayor cobertura de servicios',
    descripcion: 'Alta sensibilidad a los atractores sociales (comedores, albergues). Modela el efecto de ampliar la red de servicios.',
    icono: '🍽',
    params: { generaciones: 80, radio_suavizado: 3, movilidad: 0.30, permanencia_base: 0.20, sensibilidad_atractivo: 2.5 },
  },
  {
    id: 'condiciones_adversas',
    nombre: 'Condiciones climáticas adversas',
    descripcion: 'Baja movilidad y alta permanencia. Representa días de lluvia intensa o temperaturas extremas que reducen el desplazamiento.',
    icono: '🌧',
    params: { generaciones: 80, radio_suavizado: 2, movilidad: 0.12, permanencia_base: 0.50, sensibilidad_atractivo: 1.0 },
  },
]


export const SimulationLoader = () => {
  const [inputId, setInputId] = useState('')
  const [mode, setMode] = useState<'connect' | 'create'>('connect')
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)

  const simulationId = useSimulationStore((s) => s.simulationId)
  const error = useSimulationStore((s) => s.error)
  const pollingStatus = useSimulationStore((s) => s.pollingStatus)
  const simulationProgress = useSimulationStore((s) => s.simulationProgress)
  const loadedPasos = useSimulationStore((s) => s.loadedPasos)
  const setSimulationId = useSimulationStore((s) => s.setSimulationId)
  const disconnect = useSimulationStore((s) => s.disconnect)
  const createSimulation = useSimulationStore((s) => s.createSimulation)

  const isConnected = Boolean(simulationId)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
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

  const applyPreset = (preset: EscenarioPredefinido) => {
    setSelectedPreset(preset.id)
    setValue('generaciones', preset.params.generaciones)
    setValue('radio_suavizado', preset.params.radio_suavizado)
    setValue('movilidad', preset.params.movilidad)
    setValue('permanencia_base', preset.params.permanencia_base)
    setValue('sensibilidad_atractivo', preset.params.sensibilidad_atractivo)
    setValue('nombre', `Simulación — ${preset.nombre}`)
    setValue('descripcion', preset.descripcion)
  }

  const handleConnect = () => {
    if (!inputId.trim()) return
    setSimulationId(createSimulationId(inputId.trim()))
  }

  const onCreateSubmit = async (data: CreateSimForm) => {
    await createSimulation(data)
    if (useSimulationStore.getState().simulationId) {
      reset()
      setSelectedPreset(null)
      setMode('connect')
    }
  }

  const handleCreateSimulationClick = handleSubmit(onCreateSubmit)

  // ── Estado conectado ───────────────────────────────────────────────────────

  if (isConnected) {
    return (
      <div className="sim-loader connected">
        <div className="sim-loader-icon">
          <CheckCircle2 size={22} />
        </div>
        <div className="sim-loader-body">
          <p className="sim-loader-label">Simulación lista — {loadedPasos.length} pasos disponibles</p>
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
            {simulationProgress && (
              <div style={{ marginTop: 8, height: 6, background: '#1e293b', borderRadius: 999, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(Math.max(simulationProgress.progreso, 0), 100)}%`,
                    background: '#60a5fa',
                    transition: 'width 180ms linear',
                  }}
                />
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onCreateSubmit)} noValidate className="sim-create-form">
          {/* ── Escenarios predefinidos ──────────────────────────────────────── */}
          <fieldset className="sim-form-section">
            <legend className="sim-form-section-title">🗺 PUNTO DE PARTIDA</legend>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
              Selecciona un escenario para cargar valores recomendados, o configura los parámetros manualmente.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginBottom: 4 }}>
              {ESCENARIOS_PREDEFINIDOS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  disabled={isSubmitting}
                  title={preset.descripcion}
                  style={{
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: selectedPreset === preset.id
                      ? '2px solid #6366f1'
                      : '1px solid rgba(255,255,255,0.12)',
                    background: selectedPreset === preset.id
                      ? 'rgba(99,102,241,0.15)'
                      : 'rgba(255,255,255,0.04)',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <span style={{ fontSize: 18, display: 'block', marginBottom: 4 }}>{preset.icono}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', display: 'block', lineHeight: 1.3 }}>
                    {preset.nombre}
                  </span>
                </button>
              ))}
            </div>
            {selectedPreset && (
              <p style={{ fontSize: 12, color: '#6ee7b7', marginTop: 6 }}>
                ✓ {ESCENARIOS_PREDEFINIDOS.find(p => p.id === selectedPreset)?.descripcion}
              </p>
            )}
          </fieldset>

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
            <legend className="sim-form-section-title">⚙️ PARÁMETROS DE LA SIMULACIÓN</legend>
            <div className="sim-form-row">
              <div className="sim-form-group">
                <label className="sim-form-label" title="Identificador numérico de la versión del escenario geográfico configurado en el sistema">ID del escenario base <span style={{fontSize:10,color:'#64748b'}}>(ver administrador)</span></label>
                <input type="number" {...register('version_escenario_id')} className="sim-form-input sim-form-number" disabled={isSubmitting} />
                {errors.version_escenario_id && <p className="sim-form-error">{errors.version_escenario_id.message}</p>}
              </div>
              <div className="sim-form-group">
                <label className="sim-form-label" title="Cantidad de pasos de tiempo que simulará el modelo. Valores entre 50 y 200 son adecuados para la mayoría de análisis.">Pasos de tiempo a simular</label>
                <input type="number" {...register('generaciones')} className="sim-form-input sim-form-number" disabled={isSubmitting} />
                {errors.generaciones && <p className="sim-form-error">{errors.generaciones.message}</p>}
              </div>
              <div className="sim-form-group">
                <label className="sim-form-label" title="Área de influencia de cada zona sobre sus vecinas. Valores más altos generan transiciones más suaves entre zonas.">Área de influencia entre zonas</label>
                <input type="number" {...register('radio_suavizado')} className="sim-form-input sim-form-number" disabled={isSubmitting} />
                {errors.radio_suavizado && <p className="sim-form-error">{errors.radio_suavizado.message}</p>}
              </div>
            </div>
            <div className="sim-form-row">
              <div className="sim-form-group">
                <label className="sim-form-label" title="Probabilidad de que una persona se desplace a otra zona en cada paso. 0 = sin movimiento, 1 = máximo movimiento.">Frecuencia de desplazamiento (0–1)</label>
                <input type="number" step="0.05" {...register('movilidad')} className="sim-form-input sim-form-number" disabled={isSubmitting} />
                {errors.movilidad && <p className="sim-form-error">{errors.movilidad.message}</p>}
              </div>
              <div className="sim-form-group">
                <label className="sim-form-label" title="Fracción de la población que siempre permanece en su zona, independientemente del atractivo. 0 = nadie permanece, 1 = todos permanecen.">Tendencia a quedarse en la zona (0–1)</label>
                <input type="number" step="0.05" {...register('permanencia_base')} className="sim-form-input sim-form-number" disabled={isSubmitting} />
                {errors.permanencia_base && <p className="sim-form-error">{errors.permanencia_base.message}</p>}
              </div>
              <div className="sim-form-group">
                <label className="sim-form-label" title="Cuánto influyen los servicios (comedores, albergues) en las decisiones de movimiento. Valores altos concentran más personas cerca de servicios.">Influencia de servicios sociales (0–5)</label>
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
            <button type="button" onClick={handleCreateSimulationClick} disabled={isSubmitting} className="sim-loader-btn create">
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
