"use client"

import { Card } from "@/shared/ui/Card"
import { Button } from "@/shared/ui/Button"
import { useNavigate } from "react-router-dom"
import { ROUTES } from "@/shared/constants/routes"
import { Plus } from "lucide-react"

export const HomePage = () => {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mapa Principal</h1>

      <Card>
        <div className="relative h-[600px] bg-gray-200 rounded-lg overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">Mapa de Cali</p>
              <p className="text-sm">Visualización del área urbana</p>
            </div>
          </div>

          <Button className="absolute bottom-6 right-6 shadow-lg" onClick={() => navigate(ROUTES.OBSERVATION_NEW)}>
            <Plus size={20} className="mr-2" />
            Agregar Observación
          </Button>
        </div>
      </Card>
    </div>
  )
}
