import { useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { Modal } from '@/shared/ui/Modal'
import { useImportScenario } from '@/features/scenarios/hooks/useImportScenario'

interface Props {
  isOpen: boolean
  onClose: () => void
  onImported: () => void
}

const MAX_FILE_SIZE = 10 * 1024 * 1024

export function ImportScenarioModal({ isOpen, onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const { importScenario, isImporting, errors } = useImportScenario()

  const handleFileChange = (selected: File | undefined) => {
    setFile(null)
    setFileError(null)

    if (!selected) return
    if (!selected.name.toLowerCase().endsWith('.xlsx')) {
      setFileError('El archivo debe ser un Excel .xlsx')
      return
    }
    if (selected.size > MAX_FILE_SIZE) {
      setFileError('El archivo supera el tamaño máximo permitido de 10MB')
      return
    }
    setFile(selected)
  }

  const confirmImport = async () => {
    if (!file) {
      setFileError('Selecciona un archivo .xlsx')
      return
    }

    const result = await importScenario(file)
    if (!result) return
    onImported()
    setFile(null)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Importar Escenario"
      footer={(
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="icon-btn" onClick={onClose} disabled={isImporting}>Cancelar</button>
          <button className="action-button" onClick={confirmImport} disabled={!file || isImporting}>
            {isImporting ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Upload size={18} />}
            Importar
          </button>
        </div>
      )}
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <p className="text-muted" style={{ margin: 0 }}>
          Sube un archivo Excel con hojas: Metadatos y Parámetros, Pesos, Reglas. La hoja Resultados y Resumen se ignora al importar.
        </p>
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sheet-input"
          onChange={(e) => handleFileChange(e.target.files?.[0])}
        />
        {file && <p style={{ margin: 0, fontWeight: 700 }}>Archivo seleccionado: {file.name}</p>}
        {fileError && <p className="text-error" style={{ margin: 0 }}>{fileError}</p>}
        {errors.length > 0 && (
          <div className="text-error">
            {errors.map((error) => <p key={error} style={{ margin: '4px 0' }}>{error}</p>)}
          </div>
        )}
      </div>
    </Modal>
  )
}
