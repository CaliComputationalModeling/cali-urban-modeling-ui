import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useReportsStore } from '@/store/reportsStore'

const schema = z
  .object({
    tipo_plantilla: z.enum(['trimestral', 'geografico'], {
      message: 'Selecciona un tipo de plantilla',
    }),
    formato: z.enum(['pdf', 'excel'], { message: 'Selecciona un formato' }),
    fecha_inicio: z.string().min(10, 'Selecciona una fecha de inicio'),
    fecha_fin: z.string().min(10, 'Selecciona una fecha de fin'),
  })
  .refine((v) => v.fecha_fin >= v.fecha_inicio, {
    message: 'La fecha final debe ser mayor o igual a la fecha inicial',
    path: ['fecha_fin'],
  })

type FormValues = z.infer<typeof schema>

export const ReportsPage = () => {
  const history = useReportsStore((s) => s.history)
  const isGenerating = useReportsStore((s) => s.isGenerating)
  const error = useReportsStore((s) => s.error)
  const clearError = useReportsStore((s) => s.clearError)
  const fetchHistory = useReportsStore((s) => s.fetchHistory)
  const generate = useReportsStore((s) => s.generate)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo_plantilla: 'trimestral',
      formato: 'pdf',
      fecha_inicio: '',
      fecha_fin: '',
    },
  })

  useEffect(() => {
    fetchHistory().catch(() => null)
  }, [fetchHistory])

  useEffect(() => {
    if (!error) return
    toast.error(error)
    clearError()
  }, [error, clearError])

  const onSubmit = async (values: FormValues) => {
    await generate({
      ...values,
      fecha_inicio: `${values.fecha_inicio}T00:00:00`,
      fecha_fin: `${values.fecha_fin}T23:59:59`,
      componentes: ['kpis', 'mapa_calor'],
      ejecucion_ids: [],
    })
    toast.success('Reporte generado. La descarga iniciara automaticamente.')
    reset(values)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="animate-in">
        <h1 className="headline" style={{ fontSize: '40px' }}>Reportes</h1>
        <p className="text-muted">
          Genera archivos PDF o Excel desde los datos agregados del backend.
        </p>
      </div>

      <section className="table-card" style={{ padding: 16 }}>
        <p style={{ margin: 0, fontWeight: 800, color: 'var(--color-text-dark)' }}>
          Generar reporte
        </p>
        <p style={{ margin: '6px 0 14px', color: 'var(--color-text-muted)' }}>
          El backend responde un archivo descargable mediante StreamingResponse.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div>
              <label className="sheet-form-label">Plantilla</label>
              <select {...register('tipo_plantilla')} className="sheet-select" disabled={isGenerating}>
                <option value="trimestral">Trimestral</option>
                <option value="geografico">Geografico</option>
              </select>
              {errors.tipo_plantilla && <p className="sheet-field-error">{errors.tipo_plantilla.message}</p>}
            </div>

            <div>
              <label className="sheet-form-label">Formato</label>
              <select {...register('formato')} className="sheet-select" disabled={isGenerating}>
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
              </select>
              {errors.formato && <p className="sheet-field-error">{errors.formato.message}</p>}
            </div>

            <div>
              <label className="sheet-form-label">Fecha inicio</label>
              <input type="date" {...register('fecha_inicio')} className="sheet-input" disabled={isGenerating} />
              {errors.fecha_inicio && <p className="sheet-field-error">{errors.fecha_inicio.message}</p>}
            </div>

            <div>
              <label className="sheet-form-label">Fecha fin</label>
              <input type="date" {...register('fecha_fin')} className="sheet-input" disabled={isGenerating} />
              {errors.fecha_fin && <p className="sheet-field-error">{errors.fecha_fin.message}</p>}
            </div>
          </div>

          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="action-button" disabled={isGenerating}>
              {isGenerating ? 'Generando...' : 'Generar y descargar'}
            </button>
          </div>
        </form>
      </section>

      <section className="table-card" style={{ padding: 16 }}>
        <p style={{ margin: 0, fontWeight: 800, color: 'var(--color-text-dark)' }}>
          Descargas de esta sesion
        </p>
        <p style={{ margin: '6px 0 12px', color: 'var(--color-text-muted)' }}>
          El backend actual no expone historial; esta tabla muestra las descargas generadas en la sesion del navegador.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table className="user-table-custom">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Plantilla</th>
                <th>Formato</th>
                <th>Rango</th>
                <th>Archivo</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 14, color: 'var(--color-text-muted)' }}>
                    No hay reportes generados en esta sesion.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id}>
                    <td>{h.estado}</td>
                    <td>{h.plantilla}</td>
                    <td>{h.formato}</td>
                    <td>{h.fecha_inicio} - {h.fecha_fin}</td>
                    <td>{h.archivo_nombre ?? '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
