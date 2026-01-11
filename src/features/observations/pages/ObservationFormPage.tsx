"use client"

import type React from "react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card } from "@/shared/ui/Card"
import { Button } from "@/shared/ui/Button"
import { ROUTES } from "@/shared/constants/routes"
import { Upload } from "lucide-react"

export const ObservationFormPage = () => {
  const navigate = useNavigate()
  const [description, setDescription] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Observation submitted")
    navigate(ROUTES.MY_OBSERVATIONS)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Nueva Observación</h1>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Observación</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option>Concentración de personas</option>
              <option>Migración observada</option>
              <option>Servicios disponibles</option>
              <option>Incidente</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fotografías</label>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-primary-500 cursor-pointer transition-colors"
                >
                  <Upload className="text-gray-400" size={32} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 h-32"
              placeholder="Describa lo observado en campo..."
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => navigate(ROUTES.HOME)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar Observación</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
