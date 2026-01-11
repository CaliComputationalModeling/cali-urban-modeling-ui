import { Card } from "@/shared/ui/Card"

export const ValidationPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Validación de Resultados</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Datos Reales">
          <div className="h-96 bg-gray-200 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-600">
              <p className="font-semibold">Mapa Real</p>
              <p className="text-sm mt-1">Datos de campo recolectados</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Precisión:</span>
              <span className="font-semibold">87.5%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Cobertura:</span>
              <span className="font-semibold">92.3%</span>
            </div>
          </div>
        </Card>

        <Card title="Datos Simulados">
          <div className="h-96 bg-primary-50 rounded-lg flex items-center justify-center">
            <div className="text-center text-primary-700">
              <p className="font-semibold">Mapa Simulado</p>
              <p className="text-sm mt-1">Resultado del modelo</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Coincidencia:</span>
              <span className="font-semibold text-green-600">89.2%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Error medio:</span>
              <span className="font-semibold">±12 personas</span>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Métricas de Validación">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">89.2%</p>
            <p className="text-sm text-gray-600 mt-1">Precisión General</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">0.85</p>
            <p className="text-sm text-gray-600 mt-1">Coeficiente R²</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">±12</p>
            <p className="text-sm text-gray-600 mt-1">Error Medio</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">94%</p>
            <p className="text-sm text-gray-600 mt-1">Confianza</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
