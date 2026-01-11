import { Card } from "@/shared/ui/Card"

export const ScenarioComparatorPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Comparador de Escenarios</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Escenario A - Base">
          <div className="space-y-4">
            <div className="h-96 bg-gray-200 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-600">
                <p className="font-semibold">Escenario Base</p>
                <p className="text-sm">Configuración actual</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Población:</span>
                <span className="font-semibold">2,547</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Zonas críticas:</span>
                <span className="font-semibold">8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Servicios:</span>
                <span className="font-semibold">50%</span>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Escenario B - Simulación">
          <div className="space-y-4">
            <div className="h-96 bg-primary-50 rounded-lg flex items-center justify-center">
              <div className="text-center text-primary-700">
                <p className="font-semibold">Escenario Simulado</p>
                <p className="text-sm">Con nuevos parámetros</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Población:</span>
                <span className="font-semibold text-green-600">2,234 (-12%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Zonas críticas:</span>
                <span className="font-semibold text-green-600">5 (-37%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Servicios:</span>
                <span className="font-semibold text-blue-600">75% (+25%)</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Análisis Comparativo">
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">-12%</p>
            <p className="text-sm text-gray-600 mt-1">Reducción población</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">-37%</p>
            <p className="text-sm text-gray-600 mt-1">Menos zonas críticas</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">+25%</p>
            <p className="text-sm text-gray-600 mt-1">Más servicios</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
