import { FileSpreadsheet, RefreshCw } from 'lucide-react'

interface Props {
  onImport: () => void
  onRefresh: () => void
}

export function ScenarioToolbar({ onImport, onRefresh }: Props) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button className="action-button" onClick={onImport}>
        <FileSpreadsheet size={18} />Importar Escenario
      </button>
      <button className="action-button" onClick={onRefresh}>
        <RefreshCw size={18} />Actualizar
      </button>
    </div>
  )
}
