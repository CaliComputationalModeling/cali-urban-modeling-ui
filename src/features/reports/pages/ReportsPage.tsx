import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useReportsStore } from '@/store/reportsStore'
import type { GenerateReportRequest } from '@/services/endpoints'

const schema = z
  .object({
    plantilla: z.enum(['TRIMESTRAL', 'GEOGRAFICO'], { message: 'Selecciona un tipo de plantilla' }),
    formato: z.enum(['PDF', 'EXCEL'], { message: 'Selecciona un formato' }),
    fecha_inicio: z
      .string()
      .min(10, 'Selecciona una fecha de inicio')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
    fecha_fin: z
      .string()
      .min(10, 'Selecciona una fecha de fin')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
  })
  .refine((v) => v.fecha_fin >= v.fecha_inicio, {
    message: 'La fecha final debe ser mayor o igual a la fecha inicial',
    path: ['fecha_fin'],
  })

type FormValues = z.infer<typeof schema>

export const ReportsPage = () => {
  const history = useReportsStore((s) => s.history)
  const isLoadingHistory = useReportsStore((s) => s.isLoadingHistory)
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
      plantilla: 'TRIMESTRAL',
      formato: 'PDF',
      fecha_inicio: '',
      fecha_fin: '',
    },
  })

  useEffect(() => {
    fetchHistory().catch(() => null)
  }, [fetchHistory])

  useEffect(() => {
    if (error) {
      toast.error(error)
      clearError()
    }
  }, [error, clearError])

  const onSubmit = async (values: FormValues) => {
    const payload: GenerateReportRequest = values as GenerateReportRequest
    await generate(payload)
    toast.success('Reporte generado. La descarga iniciará automáticamente.')
    reset({ ...values })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="animate-in">
        <h1 className="headline" style={{ fontSize: '40px' }}>
          Reportes
        </h1>
        <p className="text-muted">
          Genera artefactos descargables (PDF/Excel) desde datos agregados y gestiona el historial.
        </p>
      </div>

      <section
        style={{
          background: 'var(--color-white)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          padding: 16,
        }}
      >
        <p style={{ margin: 0, fontWeight: 800, color: 'var(--color-text-dark)' }}>Generar reporte</p>
        <p style={{ margin: '6px 0 14px', color: 'var(--color-text-muted)' }}>
          La respuesta se procesa como binario para descarga directa (StreamingResponse).
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 12,
              alignItems: 'end',
            }}
          >
            <div>
              <label className="sheet-form-label">Plantilla</label>
              <select {...register('plantilla')} className="sheet-select" disabled={isGenerating}>
                <option value="TRIMESTRAL">Trimestral</option>
                <option value="GEOGRAFICO">Geográfico</option>
              </select>
              {errors.plantilla && <p className="sheet-field-error">{errors.plantilla.message}</p>}
            </div>

            <div>
              <label className="sheet-form-label">Formato</label>
              <select {...register('formato')} className="sheet-select" disabled={isGenerating}>
                <option value="PDF">PDF</option>
                <option value="EXCEL">Excel</option>
              </select>
              {errors.formato && <p className="sheet-field-error">{errors.formato.message}</p>}
            </div>

            <div>
              <label className="sheet-form-label">Fecha inicio</label>
              <input
                type="date"
                {...register('fecha_inicio')}
                className="sheet-input"
                disabled={isGenerating}
              />
              {errors.fecha_inicio && <p className="sheet-field-error">{errors.fecha_inicio.message}</p>}
            </div>

            <div>
              <label className="sheet-form-label">Fecha fin</label>
              <input type="date" {...register('fecha_fin')} className="sheet-input" disabled={isGenerating} />
              {errors.fecha_fin && <p className="sheet-field-error">{errors.fecha_fin.message}</p>}
            </div>
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={isGenerating}
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid var(--color-border)',
                background: 'var(--color-dark)',
                color: 'white',
                fontWeight: 800,
                opacity: isGenerating ? 0.7 : 1,
              }}
            >
              {isGenerating ? 'Generando…' : 'Generar y descargar'}
            </button>
          </div>
        </form>
      </section>

      <section
        style={{
          background: 'var(--color-white)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
          <div>
            <p style={{ margin: 0, fontWeight: 800, color: 'var(--color-text-dark)' }}>Historial</p>
            <p style={{ margin: '6px 0 0', color: 'var(--color-text-muted)' }}>
              Tabla de gestión de reportes generados.
            </p>
          </div>
          <button
            onClick={() => fetchHistory().catch(() => null)}
            disabled={isLoadingHistory}
            style={{
              padding: '8px 12px',
              borderRadius: 12,
              border: '1px solid var(--color-border)',
              background: 'var(--color-input-bg)',
              fontWeight: 700,
            }}
          >
            {isLoadingHistory ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>

        <div style={{ marginTop: 12, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '10px 8px' }}>Estado</th>
                <th style={{ padding: '10px 8px' }}>Plantilla</th>
                <th style={{ padding: '10px 8px' }}>Formato</th>
                <th style={{ padding: '10px 8px' }}>Rango</th>
                <th style={{ padding: '10px 8px' }}>Creado</th>
                <th style={{ padding: '10px 8px' }}>Archivo</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 14, color: 'var(--color-text-muted)' }}>
                    No hay reportes en el historial todavía.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} style={{ borderBottom: '1px solid rgba(225,232,240,0.8)' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 800 }}>
                      {h.estado === 'PENDIENTE' ? 'Pendiente' : h.estado === 'FALLIDO' ? 'Fallido' : 'Generado'}
                    </td>
                    <td style={{ padding: '10px 8px' }}>{h.plantilla}</td>
                    <td style={{ padding: '10px 8px' }}>{h.formato}</td>
                    <td style={{ padding: '10px 8px' }}>
                      {h.fecha_inicio} → {h.fecha_fin}
                    </td>
                    <td style={{ padding: '10px 8px' }}>{h.creado_en}</td>
                    <td style={{ padding: '10px 8px' }}>{h.archivo_nombre ?? '—'}</td>
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

