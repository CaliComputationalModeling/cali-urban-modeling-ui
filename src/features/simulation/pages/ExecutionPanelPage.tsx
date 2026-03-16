"use client"

import { useEffect } from "react"
import { Card } from "@/shared/ui/Card"
import { Button } from "@/shared/ui/Button"
import { Play, Pause, Square, RefreshCw } from "lucide-react"
import { useSimulationStore } from "@/store/simulationStore"
import { ProgressBar } from "@/shared/ui/ProgressBar"
import { LogConsole } from "@/shared/ui/LogConsole"

export const ExecutionPanelPage = () => {
  const {
    currentSimulation,
    isRunning,
    currentIteration,
    totalIterations,
    logs,
    error,
    isLoading,
    runStep,
    stopSimulation,
    startSimulation,
    clearLogs,
    addLog,
  } = useSimulationStore()

  // El "Motor" de Auto-Ejecución
  // Este useEffect vigila si la simulación está corriendo y pide el siguiente paso automáticamente
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const executeNextStep = async () => {
      // Si está corriendo y no hemos llegado al límite
      if (isRunning && currentIteration < totalIterations) {
        await runStep(1);
        // Esperamos 500ms entre cada paso para que puedas ver el cambio (puedes ajustar este tiempo)
        timeoutId = setTimeout(executeNextStep, 500);
      } else if (currentIteration >= totalIterations && isRunning) {
        stopSimulation();
        addLog("Simulación completada: se alcanzó el límite de iteraciones", "success");
      }
    };

    if (isRunning) {
      executeNextStep();
    }

    // Limpiamos el timeout si el componente se desmonta o la simulación se pausa
    return () => clearTimeout(timeoutId);
  }, [isRunning, currentIteration, totalIterations, runStep, stopSimulation, addLog]);

  const handleStartStop = () => {
    if (!currentSimulation?.id) {
      addLog("Debes cargar una simulación en la pestaña 'Carga de Datos' primero", "warning");
      return;
    }
    
    if (isRunning) {
      stopSimulation()
    } else {
      // Iniciamos sin pasar datos quemados, para que use la simulación activa del store
      startSimulation() 
    }
  }

  const handleRunStep = async () => {
    if (!currentSimulation?.id) {
      addLog("Debes cargar una simulación en la pestaña 'Carga de Datos' primero", "warning");
      return;
    }
    stopSimulation() // Pausamos la auto-ejecución si el usuario hace clic manual
    await runStep(1)
  }

  const handleRunAll = () => {
    if (!currentSimulation?.id) {
      addLog("Debes cargar una simulación en la pestaña 'Carga de Datos' primero", "warning");
      return;
    }
    // Simplemente activamos el estado isRunning, el useEffect se encargará del loop
    startSimulation()
  }

  // Cálculos dinámicos del estado de las celdas
  // Si tu backend solo devuelve celdas vivas, totalCells será igual a occupiedCount
  const totalCellsInMemory = currentSimulation?.cells?.length || 0;
  const occupiedCount = currentSimulation?.cells?.filter((c) => c.state === 1).length || 0;
  
  // Asumiendo una grilla de 50x50 como configuramos en DataLoadPage (2500 celdas totales)
  const gridSize = 50 * 50; 
  const emptyCount = currentSimulation?.id ? (gridSize - occupiedCount) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Panel de Ejecución de Simulación</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <Card title="Control de Simulación">
        <div className="space-y-6">
          <ProgressBar
            current={currentIteration}
            total={totalIterations}
            isRunning={isRunning}
            label="Progreso de Simulación"
          />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-gray-600">Iteración Actual</p>
              <p className="text-2xl font-bold text-primary-600">{currentIteration}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-gray-600">Total Iteraciones Máximas</p>
              <p className="text-2xl font-bold text-primary-600">{totalIterations}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleRunStep} disabled={isLoading || isRunning}>
              {isLoading ? <RefreshCw size={20} className="mr-2 animate-spin" /> : <Play size={20} className="mr-2" />}
              Ejecutar 1 Paso
            </Button>
            <Button onClick={handleRunAll} disabled={isRunning || isLoading || !currentSimulation?.id} variant="secondary">
              <Play size={20} className="mr-2" />
              Auto-Ejecutar
            </Button>
            <Button onClick={handleStartStop} disabled={!currentSimulation?.id} variant={isRunning ? "danger" : "secondary"}>
              {isRunning ? (
                <>
                  <Pause size={20} className="mr-2" />
                  Pausar
                </>
              ) : (
                <>
                  <Play size={20} className="mr-2" />
                  Continuar
                </>
              )}
            </Button>
            <Button onClick={stopSimulation} variant="danger" disabled={!isRunning}>
              <Square size={20} className="mr-2" />
              Detener
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Estado de Celdas (Tiempo Real)">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-primary-50 p-4 rounded-lg transition-colors">
            <p className="text-sm text-gray-600">Ocupadas (Vivas)</p>
            <p className="text-3xl font-bold text-primary-600">
              {currentSimulation?.id ? occupiedCount : "-"}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg transition-colors">
            <p className="text-sm text-gray-600">Vacías</p>
            <p className="text-3xl font-bold text-gray-600">
              {currentSimulation?.id ? emptyCount : "-"}
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg transition-colors">
            <p className="text-sm text-gray-600">Celdas en Memoria</p>
            <p className="text-3xl font-bold text-blue-600">
              {currentSimulation?.id ? totalCellsInMemory : "-"}
            </p>
          </div>
        </div>
      </Card>

      <LogConsole logs={logs} onClear={clearLogs} maxHeight="500px" />
    </div>
  )
}