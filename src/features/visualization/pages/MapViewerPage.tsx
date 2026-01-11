"use client"

import { useState } from "react"
import { Card } from "@/shared/ui/Card"

export const MapViewerPage = () => {
  const [layers, setLayers] = useState({
    services: true,
    heatmap: false,
    routes: false,
    observations: true,
  })

  const toggleLayer = (layer: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Visualizador de Mapa</h1>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-9">
          <Card>
            <div className="h-[700px] bg-gray-200 rounded-lg flex items-center justify-center">
              <p className="text-gray-600">Mapa en pantalla completa</p>
            </div>
          </Card>
        </div>

        <div className="col-span-3">
          <Card title="Capas">
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers.services}
                  onChange={() => toggleLayer("services")}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm text-gray-700">Servicios</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers.heatmap}
                  onChange={() => toggleLayer("heatmap")}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm text-gray-700">Mapa de Calor</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers.routes}
                  onChange={() => toggleLayer("routes")}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm text-gray-700">Rutas Predictivas</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers.observations}
                  onChange={() => toggleLayer("observations")}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm text-gray-700">Observaciones</span>
              </label>
            </div>
          </Card>

          <Card title="Estadísticas" className="mt-6">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Puntos visibles:</span>
                <span className="font-semibold">234</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Área cubierta:</span>
                <span className="font-semibold">45 km²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Zoom nivel:</span>
                <span className="font-semibold">14</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
