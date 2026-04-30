import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Database, CheckCircle2, FolderOpen, PlusCircle, X, Loader2 } from 'lucide-react'
import { useSimulationStore } from '@/store/simulationStore'

const createSimSchema = z.object({
  nombre: z.string().min(3, 'Minimo 3 caracteres'),
  descripcion: z.string().optional(),
  filas: z.coerce.number().min(10, 'Minimo 10').max(100, 'Maximo 100'),
  columnas: z.coerce.number().min(10, 'Minimo 10').max(100, 'Maximo 100'),
  agentes_iniciales: z.coerce.number().min(1, 'Minimo 1').max(5000, 'Maximo 5000'),
})

type CreateSimForm = z.infer<typeof createSimSchema>

export const SimulationLoader = () => {
  const [inputId, setInputId] = useState('')
  const [mode, setMode] = useState<'connect' | 'create'>('connect')

  const simulationId = useSimulationStore((s) => s.simulationId)
  const error = useSimulationStore((s) => s.error)
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
      nombre: '',
      descripcion: '',
      filas: 50,
      columnas: 50,
      agentes_iniciales: 100,
    },
  })

  const handleConnect = () => {
    if (!inputId.trim()) return
    setSimulationId(inputId.trim())
  }

  const onCreateSubmit = async (data: CreateSimForm) => {
    await createSimulation(data)
    if (useSimulationStore.getState().simulationId) {
      reset()
      setMode('connect')
    }
  }

  // ─── Connected State ─────────────────────────────────────────────────────

  if (isConnected) {
    return (
      <div className="sim-loader connected">
        <div className="sim-loader-icon">
          <CheckCircle2 size={22} />
        </div>
        <div className="sim-loader-body">
          <p className="sim-loader-label">ESCENARIO ACTIVO</p>
          <input className="sim-loader-input" value={simulationId!} readOnly disabled />
        </div>
        <button onClick={disconnect} className="sim-loader-btn disconnect" title="Desconectar">
          <X size={15} /> DESCONECTAR
        </button>
      </div>
    )
  }

  // ─── Create Form ──────────────────────────────────────────────────────────

  if (mode === 'create') {
    return (
      <div className="sim-loader sim-loader-form">
        <div className="sim-loader-form-header">
          <div className="sim-loader-icon">
            <PlusCircle size={22} />
          </div>
          <div>
            <p className="sim-loader-label">NUEVA SIMULACION</p>
            <p className="sim-loader-sublabel">Configura los parametros del escenario</p>
          </div>
          <button
            type="button"
            className="sim-loader-btn-close"
            onClick={() => setMode('connect')}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onCreateSubmit)} noValidate className="sim-create-form">
          <div className="sim-form-row">
            <div className="sim-form-group sim-form-grow">
              <label className="sim-form-label">NOMBRE</label>
              <input
                {...register('nombre')}
                className="sim-form-input"
                placeholder="Ej: Cali_Centro_2026"
                disabled={isSubmitting}
              />
              {errors.nombre && <p className="sim-form-error">{errors.nombre.message}</p>}
            </div>
            <div className="sim-form-group sim-form-grow">
              <label className="sim-form-label">DESCRIPCION</label>
              <input
                {...register('descripcion')}
                className="sim-form-input"
                placeholder="Opcional"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="sim-form-row">
            <div className="sim-form-group">
              <label className="sim-form-label">FILAS</label>
              <input
                type="number"
                {...register('filas')}
                className="sim-form-input sim-form-number"
                disabled={isSubmitting}
              />
              {errors.filas && <p className="sim-form-error">{errors.filas.message}</p>}
            </div>
            <div className="sim-form-group">
              <label className="sim-form-label">COLUMNAS</label>
              <input
                type="number"
                {...register('columnas')}
                className="sim-form-input sim-form-number"
                disabled={isSubmitting}
              />
              {errors.columnas && <p className="sim-form-error">{errors.columnas.message}</p>}
            </div>
            <div className="sim-form-group">
              <label className="sim-form-label">AGENTES</label>
              <input
                type="number"
                {...register('agentes_iniciales')}
                className="sim-form-input sim-form-number"
                disabled={isSubmitting}
              />
              {errors.agentes_iniciales && (
                <p className="sim-form-error">{errors.agentes_iniciales.message}</p>
              )}
            </div>
            <button type="submit" disabled={isSubmitting} className="sim-loader-btn create">
              {isSubmitting ? (
                <>
                  <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />{' '}
                  CREANDO...
                </>
              ) : (
                <>
                  <PlusCircle size={15} /> CREAR
                </>
              )}
            </button>
          </div>

          {error && <p className="sim-loader-error">{error}</p>}
        </form>
      </div>
    )
  }

  // ─── Connect Mode ─────────────────────────────────────────────────────────

  return (
    <div className="sim-loader">
      <div className="sim-loader-icon">
        <Database size={22} />
      </div>

      <div className="sim-loader-body">
        <p className="sim-loader-label">CARGAR ESCENARIO</p>
        <input
          className="sim-loader-input"
          placeholder="ID de simulacion existente — ej: 20"
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
