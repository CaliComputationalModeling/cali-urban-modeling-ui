import { useState, useEffect } from 'react'
import { useSimulationStore } from '@/store/simulationStore'
import type { CreateSimulationRequest } from '@/shared/contracts/simulation.contract'
import { POBLACION_CENSO_DANE_2019 } from '@/shared/constants/censoDane2019'

interface Props {
  onClose: () => void
  initialVersionId?: number
}

export const ExecutionModal = ({ onClose, initialVersionId = 1 }: Props) => {
  const [versionId, setVersionId] = useState<number>(initialVersionId)
  const [nPasos, setNPasos] = useState<number>(20)
  const executeSimulationAsync = useSimulationStore((s) => s.executeSimulationAsync)
  const pollingStatus = useSimulationStore((s) => s.pollingStatus)
  const error = useSimulationStore((s) => s.error)
  const ejecucionId = useSimulationStore((s) => s.ejecucionId)

  const isExecuting = pollingStatus !== null

  const handleExecute = async () => {
    const payload: CreateSimulationRequest = {
      version_escenario_id: versionId,
      generaciones: nPasos,
      radio_suavizado: 1,
      movilidad: 0.25,
      permanencia_base: 0.1,
      sensibilidad_atractivo: 1.0,
      poblacion_inicial_por_comuna: POBLACION_CENSO_DANE_2019,
      peso_capacidad: 0.0,
      peso_atractores: 0.5,
      p_exponente_distancia: 2.0,
    }
    await executeSimulationAsync(payload)
  }

  // Cerrar automáticamente cuando no hay error y polling completó
  useEffect(() => {
    if (!isExecuting && ejecucionId && !error) {
      const timer = setTimeout(onClose, 500)
      return () => clearTimeout(timer)
    }
  }, [isExecuting, ejecucionId, error, onClose])

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3>Ejecutar Simulación</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          {isExecuting ? (
            <>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
                <p style={{ margin: 0, color: '#666' }}>{pollingStatus}</p>
                {ejecucionId && <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#999' }}>ID: {ejecucionId}</p>}
              </div>
              <button onClick={onClose} disabled>
                Esperando...
              </button>
            </>
          ) : error ? (
            <>
              <div style={{ padding: '10px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px' }}>
                <p style={{ margin: 0, color: '#c33' }}>{error}</p>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={onClose}>Cerrar</button>
              </div>
            </>
          ) : (
            <>
              <label>
                Version escenario (ID)
                <input type="number" min={1} value={versionId} onChange={(e) => setVersionId(Number(e.target.value))} />
              </label>
              <label>
                Pasos a ejecutar
                <input type="number" min={1} max={5000} value={nPasos} onChange={(e) => setNPasos(Number(e.target.value))} />
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={onClose}>Cancelar</button>
                <button onClick={handleExecute}>Ejecutar</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

