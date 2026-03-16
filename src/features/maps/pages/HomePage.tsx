"use client"

import { Card } from "@/shared/ui/Card"
import { Button } from "@/shared/ui/Button"
import { GridViewer } from "@/shared/ui/GridViewer"
import { LogConsole } from "@/shared/ui/LogConsole"
import { useNavigate } from "react-router-dom"
import { ROUTES } from "@/shared/constants/routes"
import { Plus, Play, Settings, Database, BarChart3, RefreshCw, Zap } from "lucide-react"
import { useEffect, useState } from "react"
import { useSimulationStore } from "@/store/simulationStore"
import { simulationService } from "@/services/simulationService"

export const HomePage = () => {
  const navigate = useNavigate()
  const {
    addLog,
    currentSimulation,
    startSimulation,
    stopSimulation,
    updateProgress,
    logs,
    clearLogs,
  } = useSimulationStore()

  const [isLoading, setIsLoading] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [gridSize, setGridSize] = useState({ width: 50, height: 50 })

  // Inicializar simulación al cargar
  useEffect(() => {
    const initializeSimulation = async () => {
      try {
        setIsLoading(true)
        addLog("Inicializando autómata celular...", "info")

        // Intentar obtener la primera simulación existente
        const simulationsResponse = await simulationService.listSimulations()
        if (simulationsResponse.items && simulationsResponse.items.length > 0) {
          const firstSim = simulationsResponse.items[0]
          addLog(`Cargando simulación: ${firstSim.name}`, "info")
          await simulationService.getSimulation(firstSim.id)
        } else {
          // Si no hay simulaciones, crear una nueva
          addLog("Creando nueva simulación...", "info")
          const response = await simulationService.createSimulation()
          if (response) {
            setGridSize({ width: response.grid.width, height: response.grid.height })
            addLog(`✓ Autómata celular creado: ${response.grid.width}x${response.grid.height}`, "success")
          }
        }

        setIsLoading(false)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error al inicializar"
        addLog(message, "error")
        setIsLoading(false)
      }
    }

    initializeSimulation()
  }, [addLog])

  // Actualizar estadísticas cuando cambia la simulación
  useEffect(() => {
    const updateStats = async () => {
      if (currentSimulation?.id) {
        try {
          const statistics = await simulationService.getStatistics(currentSimulation.id)
          setStats(statistics)
        } catch (error) {
          console.error("Error al obtener estadísticas", error)
        }
      }
    }

    updateStats()
  }, [currentSimulation?.currentIteration])

  // Ejecutar un paso de simulación
  const handleRunStep = async () => {
    if (!currentSimulation?.id) {
      addLog("No hay simulación activa", "warning")
      return
    }

    try {
      setIsExecuting(true)
      addLog("Ejecutando generación...", "info")
      await simulationService.runStep(currentSimulation.id, 1)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al ejecutar"
      addLog(message, "error")
    } finally {
      setIsExecuting(false)
    }
  }

  // Ejecutar múltiples pasos rápidamente
  const handleRunMultipleSteps = async (generations: number) => {
    if (!currentSimulation?.id) {
      addLog("No hay simulación activa", "warning")
      return
    }

    try {
      setIsExecuting(true)
      startSimulation(currentSimulation)
      addLog(`Ejecutando ${generations} generaciones...`, "info")

      for (let i = 0; i < generations; i++) {
        await simulationService.runStep(currentSimulation.id, 1)
        updateProgress(currentSimulation.currentIteration + i + 1, currentSimulation.totalIterations)
        // Pequeña pausa para que se vea la animación
        await new Promise((resolve) => setTimeout(resolve, 50))
      }

      stopSimulation()
      addLog(`✓ ${generations} generaciones completadas`, "success")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error durante la ejecución"
      addLog(message, "error")
      stopSimulation()
    } finally {
      setIsExecuting(false)
    }
  }

  // Reiniciar simulación
  const handleReset = async () => {
    if (!currentSimulation?.id) {
      addLog("No hay simulación activa", "warning")
      return
    }

    try {
      setIsLoading(true)
      addLog("Reiniciando simulación...", "info")
      await simulationService.reset(currentSimulation.id)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al reiniciar"
      addLog(message, "error")
    } finally {
      setIsLoading(false)
    }
  }

  // Crear nueva simulación
  const handleNewSimulation = async () => {
    try {
      setIsLoading(true)
      addLog("Creando nueva simulación...", "info")
      const response = await simulationService.createSimulation()
      if (response) {
        setGridSize({ width: response.grid.width, height: response.grid.height })
        addLog(`✓ Nueva simulación creada: ${response.grid.width}x${response.grid.height}`, "success")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al crear simulación"
      addLog(message, "error")
    } finally {
      setIsLoading(false)
    }
  }

  const quickActions = [
    {
      title: "Cargar Datos",
      description: "Importa datos iniciales del grid",
      icon: Database,
      route: ROUTES.DATA_LOAD,
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "Calibración",
      description: "Ajusta parámetros de simulación",
      icon: Settings,
      route: ROUTES.CALIBRATION,
      color: "bg-purple-50 text-purple-600",
    },
    {
      title: "Variables Config",
      description: "Configura variables específicas",
      icon: Zap,
      route: ROUTES.VARIABLES_CONFIG,
      color: "bg-yellow-50 text-yellow-600",
    },
    {
      title: "Resultados",
      description: "Visualiza el dashboard",
      icon: BarChart3,
      route: ROUTES.EXECUTIVE_DASHBOARD,
      color: "bg-orange-50 text-orange-600",
    },
  ]

  const aliveCells = currentSimulation?.cells?.filter((c) => c.state === 1).length || 0
  const totalCells = currentSimulation?.cells?.length || 0
  const deadCells = totalCells - aliveCells

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Bienvenido a Cali Urban Modeling</h1>
        <p className="text-gray-600">
          Sistema de Modelado Urbano Computacional para la ciudad de Cali - Autómata Celular
        </p>
      </div>

      {/* Estado actual del sistema */}
      <Card title="Estado Actual del Sistema">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Estado</p>
            <p className="text-2xl font-bold text-blue-600">{isLoading ? "Cargando..." : "Listo"}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Celdas Vivas</p>
            <p className="text-2xl font-bold text-green-600">{aliveCells}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Generación</p>
            <p className="text-2xl font-bold text-purple-600">{currentSimulation?.currentIteration || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Celdas</p>
            <p className="text-lg font-bold text-orange-600">{totalCells}</p>
          </div>
        </div>
      </Card>

      {/* Visualización del Autómata Celular */}
      <Card title="Autómata Celular - Visualización del Grid">
        <div className="space-y-4">
          <div className="flex justify-center p-6 bg-gray-50 rounded-lg border border-gray-200 overflow-auto">
            {isLoading ? (
              <div className="text-center text-gray-500 py-12">
                <div className="animate-pulse text-lg font-medium">Cargando autómata celular...</div>
              </div>
            ) : currentSimulation?.cells && currentSimulation.cells.length > 0 ? (
              <GridViewer
                cells={currentSimulation.cells}
                gridSize={gridSize}
                cellSize={Math.max(4, Math.min(15, 200 / gridSize.width))}
              />
            ) : (
              <div className="text-center text-gray-500 py-12">
                <p className="text-lg font-medium mb-4">No hay datos de simulación</p>
                <Button onClick={handleNewSimulation}>Crear Nueva Simulación</Button>
              </div>
            )}
          </div>

          {/* Descripciones de estado */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600">Celdas Vivas</p>
              <p className="text-xl font-bold text-green-600">{aliveCells}</p>
              <p className="text-xs text-gray-500">
                {totalCells > 0 ? ((aliveCells / totalCells) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">Celdas Muertas</p>
              <p className="text-xl font-bold text-gray-600">{deadCells}</p>
              <p className="text-xs text-gray-500">
                {totalCells > 0 ? ((deadCells / totalCells) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-gray-600">Densidad</p>
              <p className="text-xl font-bold text-purple-600">
                {stats?.density ? (stats.density * 100).toFixed(1) : 0}%
              </p>
              <p className="text-xs text-gray-500">Ocupación del grid</p>
            </div>
          </div>

          {/* Controles de simulación */}
          <div className="flex flex-wrap gap-2 justify-center bg-gray-50 p-4 rounded-lg border border-gray-200">
            <Button
              onClick={handleRunStep}
              disabled={isExecuting || isLoading || !currentSimulation?.id}
              className="flex items-center gap-2"
            >
              <Play size={16} />
              Paso (1 Gen)
            </Button>

            <Button
              onClick={() => handleRunMultipleSteps(5)}
              disabled={isExecuting || isLoading || !currentSimulation?.id}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Zap size={16} />
              Ejecutar 5 Gen
            </Button>

            <Button
              onClick={() => handleRunMultipleSteps(10)}
              disabled={isExecuting || isLoading || !currentSimulation?.id}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Zap size={16} />
              Ejecutar 10 Gen
            </Button>

            <Button
              onClick={() => handleRunMultipleSteps(50)}
              disabled={isExecuting || isLoading || !currentSimulation?.id}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              <Zap size={16} />
              Ejecutar 50 Gen
            </Button>

            <Button
              onClick={handleReset}
              disabled={isExecuting || isLoading || !currentSimulation?.id}
              className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700"
            >
              <RefreshCw size={16} />
              Reiniciar
            </Button>

            <Button
              onClick={handleNewSimulation}
              disabled={isExecuting || isLoading}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700"
            >
              <Plus size={16} />
              Nueva Sim
            </Button>
          </div>

          {isExecuting && (
            <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-sm text-blue-700 font-medium">
                Ejecutando generación {currentSimulation?.currentIteration}...
              </p>
              <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      ((currentSimulation?.currentIteration || 0) / (currentSimulation?.totalIterations || 1)) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Acciones rápidas adicionales */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Flujo de Trabajo Adicional</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Card key={action.title} className="hover:shadow-lg transition-shadow cursor-pointer">
                <button
                  onClick={() => navigate(action.route)}
                  className="w-full text-left space-y-3 h-full"
                >
                  <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center`}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{action.title}</h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </div>
                </button>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Console de logs */}
      <Card title="Monitor de Eventos">
        <LogConsole logs={logs} onClear={clearLogs} maxHeight="250px" />
      </Card>

      {/* Información de ayuda */}
      <Card title="Orientación Rápida - Autómata Celular">
        <div className="space-y-3 text-sm text-gray-700">
          <div>
            <p className="font-medium text-gray-900">🟢 Celdas Vivas</p>
            <p className="text-gray-600 ml-6">Representadas en color verde en el grid</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">⚫ Celdas Muertas</p>
            <p className="text-gray-600 ml-6">Representadas en color gris en el grid</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">⏱️ Generación</p>
            <p className="text-gray-600 ml-6">Cada paso incrementa la generación actual de la simulación</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">🎯 Regla: Conway's Game of Life (B3/S23)</p>
            <p className="text-gray-600 ml-6">
              Una célula nace si tiene 3 vecinos vivos, y sobrevive si tiene 2 o 3 vecinos vivos
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-900">📊 Estadísticas</p>
            <p className="text-gray-600 ml-6">Los porcentajes se actualizan en tiempo real según la simulación</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
