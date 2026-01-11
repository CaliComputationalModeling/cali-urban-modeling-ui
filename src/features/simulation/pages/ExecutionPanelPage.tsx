"use client"

import { useState } from "react"
import { Card } from "@/shared/ui/Card"
import { Button } from "@/shared/ui/Button"
import { Play, Pause, Square } from "lucide-react"

export const ExecutionPanelPage = () => {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(45)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Panel de Ejecución</h1>

      <Card title="Control de Simulación">
        <div className="space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progreso de Ejecución</span>
              <span className="text-sm text-gray-600">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-primary-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={() => setIsRunning(!isRunning)}>
              {isRunning ? (
                <>
                  <Pause size={20} className="mr-2" />
                  Pausar
                </>
              ) : (
                <>
                  <Play size={20} className="mr-2" />
                  Reanudar
                </>
              )}
            </Button>
            <Button variant="danger">
              <Square size={20} className="mr-2" />
              Detener
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Consola de Logs">
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
          <p>[10:30:15] Iniciando simulación...</p>
          <p>[10:30:16] Cargando grid 500x500</p>
          <p>[10:30:17] Aplicando reglas iniciales</p>
          <p>[10:30:20] Iteración 1/100 completada</p>
          <p>[10:30:23] Iteración 5/100 completada</p>
          <p>[10:30:25] Aplicando factores climáticos...</p>
          <p>[10:30:28] Iteración 10/100 completada</p>
          <p>[10:30:30] Evaluando convergencia...</p>
          <p>[10:30:35] Iteración 15/100 completada</p>
          <p>[10:30:40] Calculando métricas intermedias...</p>
          <p className="text-yellow-400">[10:30:42] WARNING: Alta concentración detectada en zona norte</p>
          <p>[10:30:45] Iteración 20/100 completada</p>
          <p>[10:30:50] Aplicando ajustes de servicios...</p>
          <p className="text-primary-400">[10:30:52] INFO: Simulación progresando normalmente (45%)</p>
        </div>
      </Card>
    </div>
  )
}
