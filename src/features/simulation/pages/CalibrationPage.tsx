"use client"

import { useState } from "react"
import { Card } from "@/shared/ui/Card"
import { Button } from "@/shared/ui/Button"
import { Save } from "lucide-react"

export const CalibrationPage = () => {
  const [cellSize, setCellSize] = useState("10x10")
  const [depth, setDepth] = useState(50)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Calibración de Parámetros</h1>

      <Card title="Resolución de Celda">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Selecciona el tamaño de celda para el autómata celular</p>

          <div className="space-y-3">
            {["10x10m", "20x20m", "50x50m", "100x100m"].map((size) => (
              <label
                key={size}
                className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <input
                  type="radio"
                  name="cellSize"
                  value={size}
                  checked={cellSize === size}
                  onChange={(e) => setCellSize(e.target.value)}
                  className="w-4 h-4 text-primary-600"
                />
                <div>
                  <p className="font-medium text-gray-900">{size}</p>
                  <p className="text-sm text-gray-600">
                    {size === "10x10m" && "Alta precisión - Mayor costo computacional"}
                    {size === "20x20m" && "Precisión media - Balance recomendado"}
                    {size === "50x50m" && "Precisión baja - Menor costo"}
                    {size === "100x100m" && "Muy baja precisión - Rápido"}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </Card>

      <Card title="Profundidad de Simulación">
        <div className="space-y-4">
          <div className="flex justify-between">
            <label className="text-sm font-medium text-gray-700">Número de Iteraciones</label>
            <span className="text-sm text-gray-600">{depth}</span>
          </div>
          <input
            type="range"
            min="10"
            max="200"
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
          />
          <p className="text-sm text-gray-600">Más iteraciones = Mayor precisión pero más tiempo de ejecución</p>
        </div>
      </Card>

      <Button className="w-full">
        <Save size={20} className="mr-2" />
        Guardar Calibración
      </Button>
    </div>
  )
}
