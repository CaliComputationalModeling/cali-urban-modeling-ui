"use client"

import { useEffect } from "react"
import { Card } from "@/shared/ui/Card"
import { Button } from "@/shared/ui/Button"
import { RefreshCw, Play } from "lucide-react"
import { useSimulationStore } from "@/store/simulationStore"
import { LogConsole } from "@/shared/ui/LogConsole"
import { GridViewer } from "@/shared/ui/GridViewer"
import { simulationService } from "@/services/simulationService"

// Importamos el tipo Simulation
import { Simulation } from "@/shared/types/simulation.types"

export const DataLoadPage = () => {
  const { currentSimulation, isLoading, addLog, fetchCells, clearLogs, logs } = useSimulationStore()

  useEffect(() => {
    fetchCells()
    clearLogs()
    addLog("Página de carga de datos inicializada", "info")
  }, [fetchCells, clearLogs, addLog])

  const handleLoadSampleData = async () => {
    // Hemos movido la lógica al botón de recargar
    addLog("Por favor, usa el botón de 'Recargar Estado' para inicializar", "warning")
  }

  // AQUÍ ESTÁ EL HACK: Usamos el botón de refrescar para iniciar la simulación
  const handleRefresh = async () => {
    addLog("Iniciando simulación desde el botón de Recargar...", "info")
    
    // 1. Generar celdas de muestra
    const sampleCells = []
    for (let x = 0; x < 50; x++) {
      for (let y = 0; y < 50; y++) {
        // Crear patrón aleatorio
        const state = Math.random() > 0.7 ? 1 : 0
        if (state === 1) {
          sampleCells.push({ x, y, state })
        }
      }
    }
    
    try {
      // 2. Armar el payload para FastAPI
      const payload = {
        name: "Simulación de Autómata Celular",
        description: "Inicializado desde botón de recarga",
        grid_config: {
          width: 50,
          height: 50,
          neighborhood_type: "moore",
          boundary_mode: "fixed",
          geospatial_bounds: {
            lat_min: 3.2, 
            lat_max: 3.6, 
            lon_min: -76.2, 
            lon_max: -75.9
          }
        },
        rule: {
          rule_type: "conway",
          birth: [3],
          survival: [2, 3]
        },
        initial_cells: sampleCells
      };

      // 3. Enviar al backend
      const response = await simulationService.createSimulation(payload);
      
      // 4. Actualizar el store de Zustand
      const formattedCells = sampleCells.map(cell => ({
        position: { x: cell.x, y: cell.y },
        state: cell.state
      }));

      const updatedSimulation: Partial<Simulation> = {
        ...(currentSimulation || {}),
        id: response.simulation_id,
        name: response.name || currentSimulation?.name || "Simulación de Prueba",
        cells: formattedCells,
        currentIteration: 0,
      };

      useSimulationStore.setState({ 
        currentSimulation: updatedSimulation as Simulation 
      });

      addLog(`✓ Simulación creada en FastAPI con ID: ${response.simulation_id}`, "success")
      addLog(`✓ ${sampleCells.length} celdas vivas cargadas en la grilla`, "success")

    } catch (error) {
      addLog(`Error en la comunicación con la API: ${error}`, "error")
    }
  }

  const cellCount = currentSimulation?.cells?.length || 0
  const occupiedCount = currentSimulation?.cells?.filter((c: any) => c.state === 1).length || 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Carga de Datos Iniciales</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <Card title="Total de Celdas Activas">
          <p className="text-3xl font-bold text-primary-600">{cellCount}</p>
          <p className="text-sm text-gray-600 mt-2">Celdas registradas en memoria</p>
        </Card>

        <Card title="Celdas Ocupadas (Vivas)">
          <p className="text-3xl font-bold text-green-600">{occupiedCount}</p>
          <p className="text-sm text-gray-600 mt-2">Celdas con estado = 1</p>
        </Card>

        <Card title="Celdas Vacías">
          <p className="text-3xl font-bold text-gray-600">{2500 - occupiedCount}</p>
          <p className="text-sm text-gray-600 mt-2">Calculado (50x50 total)</p>
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
            <div className="text-center text-gray-500 py-8">Haz clic abajo para generar e inicializar los datos</div>
          )}
        </div>
      </Card>

      <Card title="Inicializar Motor de Simulación (FastAPI)">
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            Utiliza el botón de recargar para enviar el payload al backend en Python e instanciar el autómata celular.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={handleLoadSampleData} disabled={isLoading} className="w-full sm:w-auto flex-1 opacity-50 cursor-not-allowed">
              <Play size={20} className="mr-2" />
              1. Cargar e Inicializar Simulación (Deshabilitado)
            </Button>
            <Button onClick={handleRefresh} variant="secondary" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? <RefreshCw size={20} className="mr-2 animate-spin" /> : <RefreshCw size={20} className="mr-2" />}
              Recargar Estado (Hack: Inicializa la simulación)
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Registro de Actividad">
        <LogConsole logs={logs} onClear={clearLogs} maxHeight="400px" />
      </Card>
    </div>
  )
}