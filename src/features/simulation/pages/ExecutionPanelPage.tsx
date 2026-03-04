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
    fetchCells,
    addLog,
  } = useSimulationStore()

  // Cargar celdas iniciales al montar
  useEffect(() => {
    fetchCells()
    addLog("Panel de ejecución cargado", "info")
  }, [])

  const handleStartStop = async () => {
    if (isRunning) {
      stopSimulation()
    } else {
      startSimulation({ id: "default", name: "Simulación", version: "1.0", date: new Date().toISOString(), status: "running" as any, cells: [], config: { gridConfig: { width: 50, height: 50, cellSize: "10x10m" }, iterations: totalIterations, parameters: { climate: 0, security: 0, services: 0, mobility: 0 } }, currentIteration: 0, totalIterations })
    }
  }

  const handleRunStep = async () => {
    if (!isRunning) {
      startSimulation({ id: "default", name: "Simulación", version: "1.0", date: new Date().toISOString(), status: "running" as any, cells: [], config: { gridConfig: { width: 50, height: 50, cellSize: "10x10m" }, iterations: totalIterations, parameters: { climate: 0, security: 0, services: 0, mobility: 0 } }, currentIteration: 0, totalIterations })
    }
    await runStep()
  }

  const handleRunAll = async () => {
    if (isRunning || isLoading) return

    startSimulation({ id: "default", name: "Simulación", version: "1.0", date: new Date().toISOString(), status: "running" as any, cells: [], config: { gridConfig: { width: 50, height: 50, cellSize: "10x10m" }, iterations: totalIterations, parameters: { climate: 0, security: 0, services: 0, mobility: 0 } }, currentIteration: 0, totalIterations })
    
    // Simular múltiples pasos
    for (let i = 0; i < 5; i++) {
      if (!isRunning) break
      await runStep()
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

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
              <p className="text-gray-600">Total Iteraciones</p>
              <p className="text-2xl font-bold text-primary-600">{totalIterations}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleRunStep} disabled={isLoading}>
              {isLoading ? <RefreshCw size={20} className="mr-2 animate-spin" /> : <Play size={20} className="mr-2" />}
              Ejecutar Paso
            </Button>
            <Button onClick={handleRunAll} disabled={isRunning || isLoading} variant="secondary">
              <Play size={20} className="mr-2" />
              Ejecutar Todo
            </Button>
            <Button onClick={handleStartStop} variant={isRunning ? "danger" : "secondary"}>
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

      <Card title="Estado de Celdas">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-primary-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Ocupadas</p>
            <p className="text-3xl font-bold text-primary-600">-</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Vacías</p>
            <p className="text-3xl font-bold text-gray-600">-</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-3xl font-bold text-blue-600">-</p>
          </div>
        </div>
      </Card>

      <LogConsole logs={logs} onClear={clearLogs} maxHeight="500px" />
    </div>
  )
}
