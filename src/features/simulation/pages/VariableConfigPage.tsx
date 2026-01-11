"use client"

import { useState } from "react"
import { Card } from "@/shared/ui/Card"
import { Button } from "@/shared/ui/Button"
import { Save } from "lucide-react"

export const VariablesConfigPage = () => {
  const [climate, setClimate] = useState(50)
  const [security, setSecurity] = useState(50)
  const [services, setServices] = useState(50)
  const [mobility, setMobility] = useState(50)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Configuración de Variables</h1>

      <Card title="Parámetros de Simulación">
        <div className="space-y-8">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Clima</label>
              <span className="text-sm text-gray-600">{climate}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={climate}
              onChange={(e) => setClimate(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Seguridad</label>
              <span className="text-sm text-gray-600">{security}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={security}
              onChange={(e) => setSecurity(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Servicios Disponibles</label>
              <span className="text-sm text-gray-600">{services}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={services}
              onChange={(e) => setServices(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Movilidad</label>
              <span className="text-sm text-gray-600">{mobility}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={mobility}
              onChange={(e) => setMobility(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
          </div>

          <Button className="w-full">
            <Save size={20} className="mr-2" />
            Guardar Configuración
          </Button>
        </div>
      </Card>
    </div>
  )
}
