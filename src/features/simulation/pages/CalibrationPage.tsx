"use client"

import { useState } from "react"
import { Card } from "@/shared/ui/Card"
import { Button } from "@/shared/ui/Button"
import { Save, AlertCircle } from "lucide-react"
import { useSimulationStore } from "@/store/simulationStore"

export const CalibrationPage = () => {
  const [cellSize, setCellSize] = useState("20x20m")
  const [iterations, setIterations] = useState(50)
  const [climate, setClimate] = useState(50)
  const [security, setSecurity] = useState(50)
  const [services, setServices] = useState(50)
  const [mobility, setMobility] = useState(50)
  const { updateProgress, addLog } = useSimulationStore()

  const handleSaveCalibration = () => {
    addLog(`Calibración guardada: Celda=${cellSize}, Iteraciones=${iterations}`, "success")
    updateProgress(0, iterations)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Calibración de Parámetros</h1>

      <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-lg flex gap-3">
        <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
        <p className="text-sm">La calibración afecta la precisión y velocidad de la simulación. Ajusta según tus necesidades.</p>
      </div>

      <Card title="Resolución de Celda">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Selecciona el tamaño de celda para el autómata celular</p>

          <div className="space-y-3">
            {["10x10m", "20x20m", "50x50m", "100x100m"].map((size) => {
              const costAnalysis = {
                "10x10m": { precision: "Alta", time: "Muy alto", recommended: false },
                "20x20m": { precision: "Media-Alta", time: "Moderado", recommended: true },
                "50x50m": { precision: "Media", time: "Bajo", recommended: false },
                "100x100m": { precision: "Baja", time: "Muy bajo", recommended: false },
              }
              const info = costAnalysis[size as keyof typeof costAnalysis]

              return (
                <label
                  key={size}
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    cellSize === size
                      ? "border-primary-600 bg-primary-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="cellSize"
                    value={size}
                    checked={cellSize === size}
                    onChange={(e) => setCellSize(e.target.value)}
                    className="w-4 h-4 text-primary-600"
                  />
                  <div className="flex-grow">
                    <p className="font-medium text-gray-900">{size}</p>
                    <p className="text-sm text-gray-600">
                      Precisión: {info.precision} • Tiempo: {info.time}
                    </p>
                  </div>
                  {info.recommended && <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">Recomendado</span>}
                </label>
              )
            })}
          </div>
        </div>
      </Card>

      <Card title="Profundidad de Simulación">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700">Número de Iteraciones</label>
            <span className="text-2xl font-bold text-primary-600">{iterations}</span>
          </div>
          <input
            type="range"
            min="10"
            max="200"
            value={iterations}
            onChange={(e) => setIterations(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
          />
          <p className="text-sm text-gray-600">Más iteraciones = mayor precisión pero más tiempo de ejecución</p>
        </div>
      </Card>

      <Card title="Parámetros Físicos">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: "Clima", value: climate, setValue: setClimate },
            { label: "Seguridad", value: security, setValue: setSecurity },
            { label: "Servicios", value: services, setValue: setServices },
            { label: "Movilidad", value: mobility, setValue: setMobility },
          ].map(({ label, value, setValue }) => (
            <div key={label}>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">{label}</label>
                <span className="text-sm font-semibold text-primary-600">{value}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
            </div>
          ))}
        </div>
      </Card>

      <Button onClick={handleSaveCalibration} className="w-full">
        <Save size={20} className="mr-2" />
        Guardar Calibración
      </Button>
    </div>
  )
}
