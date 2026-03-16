"use client"

import { Card } from "@/shared/ui/Card"
import { Button } from "@/shared/ui/Button"
import { useNavigate } from "react-router-dom"
import { ROUTES } from "@/shared/constants/routes"
import { Plus, Play, Settings, Database, BarChart3, Map } from "lucide-react"
import { useEffect, useState } from "react"
import { useSimulationStore } from "@/store/simulationStore"
import { CellularAutomataMap } from "@/features/maps/components/CellularAutomataMap"
import { useDemoSimulation } from "@/shared/hooks/useDemoSimulation"

export const HomePage = () => {
  const navigate = useNavigate()
  const { addLog, currentSimulation } = useSimulationStore()
  const [demoSimulationId, setDemoSimulationId] = useState<string | undefined>(undefined)
  const { createDemoSimulation, isCreating } = useDemoSimulation()

  useEffect(() => {
    addLog("Página de inicio cargada", "info")
  }, [])

  const handleCreateDemo = async (pattern: 'blinker' | 'glider' | 'random' = 'blinker') => {
    const simulation = await createDemoSimulation(pattern)
    if (simulation) {
      setDemoSimulationId(simulation.simulation_id)
      addLog(`Simulación demo creada: ${simulation.name}`, 'success')
    } else {
      addLog('Error al crear la simulación demo', 'error')
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
      title: "Ejecutar",
      description: "Inicia la simulación",
      icon: Play,
      route: ROUTES.EXECUTION,
      color: "bg-green-50 text-green-600",
    },
    {
      title: "Resultados",
      description: "Visualiza el dashboard",
      icon: BarChart3,
      route: ROUTES.EXECUTIVE_DASHBOARD,
      color: "bg-orange-50 text-orange-600",
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Bienvenido a Cali Urban Modeling</h1>
        <p className="text-gray-600">Sistema de Modelado Urbano Computacional para la ciudad de Cali</p>
      </div>

      {/* Estado actual */}
      <Card title="Estado Actual del Sistema">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Estado</p>
            <p className="text-2xl font-bold text-blue-600">Listo</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Celdas Cargadas</p>
            <p className="text-2xl font-bold text-green-600">{currentSimulation?.cells?.length || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Simulaciones</p>
            <p className="text-2xl font-bold text-purple-600">0</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Última Actualización</p>
            <p className="text-lg font-bold text-orange-600">Ahora</p>
          </div>
        </div>
      </Card>

      {/* Acciones rápidas */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Flujo de Trabajo</h2>
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

      {/* Visualización principal - Autómata Celular sobre el Mapa */}
      <Card title="Simulación de Autómata Celular - Visualización en Vivo">
        <div className="space-y-4">
          {demoSimulationId ? (
            <CellularAutomataMap
              simulationId={demoSimulationId}
              updateInterval={1000}
              autoPlay={false}
              onSimulationUpdate={(data) => {
                addLog(`Generación ${data.generation}: ${data.grid.alive_cells} celdas vivas`, 'info')
              }}
            />
          ) : (
            <div className="relative h-80 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden border border-gray-300 flex items-center justify-center">
              <div className="text-center">
                <Map size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium mb-2">Mapa de Cali - Autómata Celular</p>
                <p className="text-sm text-gray-600 mb-4">Carga una simulación para visualizar el autómata en tiempo real</p>
                <div className="flex gap-2 justify-center flex-wrap mb-4">
                  <Button
                    onClick={() => handleCreateDemo('blinker')}
                    disabled={isCreating}
                    className="mr-2"
                  >
                    <Play size={16} className="mr-2" />
                    Demo: Blinker
                  </Button>
                  <Button
                    onClick={() => handleCreateDemo('glider')}
                    disabled={isCreating}
                    className="mr-2"
                  >
                    <Play size={16} className="mr-2" />
                    Demo: Glider
                  </Button>
                  <Button
                    onClick={() => handleCreateDemo('random')}
                    disabled={isCreating}
                    variant="secondary"
                  >
                    <Play size={16} className="mr-2" />
                    Demo: Aleatorio
                  </Button>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => navigate(ROUTES.OBSERVATION_NEW)}
                >
                  <Plus size={20} className="mr-2" />
                  Agregar Observación
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Información de ayuda */}
      <Card title="Orientación Rápida">
        <div className="space-y-3 text-sm text-gray-700">
          <div>
            <p className="font-medium text-gray-900">📊 Paso 1: Cargar Datos</p>
            <p className="text-gray-600 ml-6">Carga datos iniciales del grid urbano desde la sección "Carga de Datos"</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">⚙️ Paso 2: Calibrar Parámetros</p>
            <p className="text-gray-600 ml-6">Ajusta el tamaño de celda, iteraciones y parámetros físicos</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">▶️ Paso 3: Ejecutar Simulación</p>
            <p className="text-gray-600 ml-6">Ejecuta pasos individuales o toda la simulación desde el panel de ejecución</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">📈 Paso 4: Visualizar Resultados</p>
            <p className="text-gray-600 ml-6">Analiza resultados en el dashboard ejecutivo y genera reportes</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
