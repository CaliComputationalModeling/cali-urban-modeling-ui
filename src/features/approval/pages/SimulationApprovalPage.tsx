"use client"

import { useState } from "react"
import { Card } from "@/shared/ui/Card"
import { Button } from "@/shared/ui/Button"
import { CheckCircle, XCircle } from "lucide-react"

export const SimulationApprovalPage = () => {
  const [comments, setComments] = useState("")

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Aprobación de Simulación</h1>

      <Card title="Información de la Simulación">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">ID:</span>
              <span className="font-semibold">SIM-002</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Versión:</span>
              <span className="font-semibold">v1.2.4</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Fecha:</span>
              <span className="font-semibold">2024-01-15</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Creado por:</span>
              <span className="font-semibold">Juan Pérez</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Precisión:</span>
              <span className="font-semibold text-green-600">89.2%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Población estimada:</span>
              <span className="font-semibold">2,547</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Zonas críticas:</span>
              <span className="font-semibold">8</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Estado:</span>
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                Pendiente aprobación
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Vista Previa">
        <div className="h-96 bg-gray-200 rounded-lg flex items-center justify-center">
          <p className="text-gray-600">Mapa de resultados de la simulación</p>
        </div>
      </Card>

      <Card title="Comentarios">
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 h-32"
          placeholder="Ingrese comentarios sobre la simulación..."
        />
      </Card>

      <div className="flex gap-4">
        <Button variant="danger" className="flex-1">
          <XCircle size={20} className="mr-2" />
          Rechazar
        </Button>
        <Button className="flex-1">
          <CheckCircle size={20} className="mr-2" />
          Aprobar
        </Button>
      </div>
    </div>
  )
}
