import { Card } from "@/shared/ui/Card"

export const HeatmapPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mapa de Calor</h1>

      <Card>
        <div className="h-[600px] bg-gradient-to-br from-yellow-200 via-orange-300 to-red-400 rounded-lg flex items-center justify-center">
          <div className="text-center text-white">
            <p className="text-xl font-semibold mb-2">Heatmap de Concentración</p>
            <p className="text-sm opacity-90">Visualización de zonas con mayor densidad histórica</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-red-600">Alto</p>
            <p className="text-sm text-gray-600 mt-1">Zona crítica</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-600">Medio</p>
            <p className="text-sm text-gray-600 mt-1">Zona moderada</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-600">Bajo</p>
            <p className="text-sm text-gray-600 mt-1">Zona baja</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
