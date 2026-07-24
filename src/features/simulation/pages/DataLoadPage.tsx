import { useEffect } from "react"
import { Card } from "@/shared/ui/Card"
import { Button } from "@/shared/ui/Button"
import { Upload, RefreshCw, Check } from "lucide-react"
import { useSimulationStore } from "@/store/simulationStore"
import { LogConsole } from "@/shared/ui/LogConsole"
import { GridViewer } from "@/shared/ui/GridViewer"
import type { CellDTO } from "@/shared/types/api.dtos"

export const DataLoadPage = () => {
  const { currentSimulation, isLoading, addLog, fetchCells, clearLogs, logs } = useSimulationStore()

  useEffect(() => {
    fetchCells()
    clearLogs()
    addLog("Página de carga de datos inicializada", "info")
  }, [])

  const handleLoadSampleData = async () => {
    addLog("Generando datos de muestra...", "info")
    // Simulación de carga de datos
    await new Promise((resolve) => setTimeout(resolve, 1000))
    
    // Generar celdas de muestra
    const sampleCells = []
    for (let i = 0; i < 50; i++) {
      for (let j = 0; j < 50; j++) {
        // Crear patrón aleatorio
        const state = Math.random() > 0.7 ? 1 : 0
        sampleCells.push({ position: { x: i, y: j }, state })
      }
    }
    
    addLog(`✓ ${sampleCells.length} celdas de muestra cargadas`, "success")
  }

  const handleRefresh = () => {
    addLog("Recargando datos...", "info")
    fetchCells()
  }

  const cellCount = currentSimulation?.cells?.length || 0
  const occupiedCount = currentSimulation?.cells?.filter((c: CellDTO) => c.state === 1).length || 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Carga de Datos</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <Card title="Total de Celdas">
          <p className="text-3xl font-bold text-primary-600">{cellCount}</p>
          <p className="text-sm text-gray-600 mt-2">Celdas en el grid</p>
        </Card>

        <Card title="Celdas Ocupadas">
          <p className="text-3xl font-bold text-green-600">{occupiedCount}</p>
          <p className="text-sm text-gray-600 mt-2">Celdas con estado = 1</p>
        </Card>

        <Card title="Celdas Vacías">
          <p className="text-3xl font-bold text-gray-600">{cellCount - occupiedCount}</p>
          <p className="text-sm text-gray-600 mt-2">Celdas con estado = 0</p>
        </Card>
      </div>

      <Card title="Visualización del Grid">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-80">
              <RefreshCw className="animate-spin text-primary-600" size={32} />
            </div>
          ) : cellCount > 0 ? (
            <GridViewer cells={currentSimulation?.cells || []} gridSize={{ width: 50, height: 50 }} cellSize={8} />
          ) : (
            <div className="text-center text-gray-500 py-8">Sin datos cargados aún</div>
          )}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Cargar Datos Personalizados">
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 cursor-pointer transition-colors">
              <Upload className="mx-auto text-gray-400 mb-2" size={48} />
              <p className="text-sm text-gray-600">Arrastra archivos CSV o haz clic para seleccionar</p>
            </div>
            <Button className="w-full">
              <Upload size={20} className="mr-2" />
              Seleccionar Archivo
            </Button>
          </div>
        </Card>

        <Card title="Datos de Muestra">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Carga datos de ejemplo para pruebas rápidas</p>
            <Button onClick={handleLoadSampleData} disabled={isLoading} className="w-full">
              {isLoading ? <RefreshCw size={20} className="mr-2 animate-spin" /> : <Check size={20} className="mr-2" />}
              Cargar Datos de Muestra
            </Button>
            <Button onClick={handleRefresh} variant="secondary" disabled={isLoading} className="w-full">
              <RefreshCw size={20} className="mr-2" />
              Recargar del Backend
            </Button>
          </div>
        </Card>
      </div>

      <Card title="Registro de Actividad">
        <LogConsole logs={logs} onClear={clearLogs} maxHeight="400px" />
      </Card>
    </div>
  )
}
